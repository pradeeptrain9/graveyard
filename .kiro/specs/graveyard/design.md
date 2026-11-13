# Design — Graveyard

## Overview
```
repo ──► engine (git + knip facts) ──► build.ts (pure) ──► graveyard.json ──► web (static)
                                                   └──────► mcp.ts (stdio) ──► Kiro agent
```
The engine collects raw facts with I/O, then one pure function turns facts into a `Graveyard`. Everything visual and every score is derived from that JSON, so the web app needs no backend and tests need no git.

## Data model (`engine/src/schema.ts`)
```ts
export const schemaVersion = 1;

export type GraveKind = 'file' | 'export' | 'dependency';

export interface Grave {
  id: string;            // sha1(kind + '\0' + path + '\0' + (name ?? '')).slice(0, 10)
  kind: GraveKind;
  path: string;          // repo-relative, forward slashes
  name?: string;         // export or dependency name
  line?: number;         // exports only, 1-based
  born: string;          // ISO, first commit that added `path`
  lastTouched: string;   // ISO, last commit touching `path`
  ageDays: number;       // HEAD commit date - lastTouched, floor
  author: string;
  lastMessage: string;   // first line only, max 120 chars
  epitaph: string;
}

export interface Cobweb {
  id: string; path: string; line: number;
  tag: 'TODO' | 'FIXME' | 'HACK';
  text: string;          // trimmed, max 140 chars
  author: string; ageDays: number;
}

export interface HauntedHouse {
  path: string; commits90d: number; authors: number;
}

export interface Plot {
  dir: string;           // top-level dir, '.' for root files
  files: number;         // tracked JS/TS files in dir
  deadFiles: number;     // distinct paths with a grave
  fog: number;           // deadFiles / files, 0..1, 2 decimals
}

export interface Graveyard {
  schemaVersion: 1;
  repo: string; headSha: string; headDate: string; scannedAt: string;
  graves: Grave[];       // sorted by path, kind, name
  cobwebs: Cobweb[];     // sorted by path, line
  haunted: HauntedHouse[]; // sorted by commits90d desc, path asc
  plots: Plot[];         // sorted by dir
}
```

## Engine
- `git.ts` — `run(args, cwd)` via `execFile('git', args)`. Helpers: `headInfo`, `lsFiles`, `fileHistory(path)` (`log --follow --format=%H%x00%aI%x00%an%x00%s`), `blameLine`, `commitsSince(date)` (`log --since --name-only`), `isClean`.
  - Perf: one `git log --name-only --format=...` pass over history builds a `Map<path, {born, last, author, msg}>` instead of one `git log` per file. `--follow` only for grave paths missing from the map.
- `knip.ts` — runs the pinned knip binary with `--reporter json --no-exit-code` in the repo. `adaptKnip(json)` maps unused files, exports and dependencies to partial graves. Written against a captured fixture in `test/fixtures/knip-*.json` because knip's JSON shape changes between versions.
- `cobwebs.ts` — `git grep -n -E "(TODO|FIXME|HACK)"` limited to JS/TS pathspecs; blame each hit (`git blame -L n,n --porcelain`).
- `haunted.ts` — pure `rankHaunted(commits, headDate)`.
- `build.ts` — pure `buildGraveyard(facts): Graveyard`. Sorting, ids, ages, plots, epitaphs.
- `epitaph.ts` — `templateEpitaph(grave)`: `Here lies {name|path}. Born {born:date}. Last touched {lastTouched:date} by {author}: "{lastMessage}". Unvisited {ageDays} days.` Optional `llmEpitaph(grave, facts)` with the validation in Req 10.2.
- `exorcise.ts` — per Req 8. Export removal edits the exact `line` and strips only a leading `export ` / `export default ` token; if the line does not start that way, abort with exit 5 rather than guess.
- `cli.ts` — `graveyard scan [path] [-o file]`, `graveyard exorcise <id> [path]`. Exit codes: 0 ok, 1 unexpected, 2 not git, 3 dirty tree, 4 unknown id, 5 unsafe edit.
- `mcp.ts` — stdio server, tools in Req 9. Registered in this repo's `.kiro/settings/mcp.json` so Kiro can use it while we build.

## Web
- `layout.ts` (pure): plots in a grid, ordered by `dir`; stones in rows inside each plot, fixed cell size, so no overlap by construction. Height bucket = `min(4, floor(log2(ageDays/30 + 1)))`.
- `Cemetery.tsx`: one `<svg>` with `viewBox`; plots as `<g>`, stones as `<g role="button" tabindex="0" aria-label="...">`. Lantern = CSS `radial-gradient` mask following pointer via CSS variables (`--lx`, `--ly`). Fog = SVG `feTurbulence` layer per plot, opacity = `fog`.
- `Epitaph.tsx`: side panel, facts list, copy-to-clipboard `node engine/dist/cli.js exorcise <id>` (no npx: the `graveyard` name on npm belongs to an unrelated package).
- `Ledger.tsx`: `<table>` with sortable headers (`aria-sort`).
- Theme tokens on `:root` (moonlight palette) with readable contrast; fonts from Google Fonts (one display face for epitaphs, system UI for data).

## Correctness properties (fast-check)
1. **Determinism:** `buildGraveyard(f)` deep-equals `buildGraveyard(shuffle(f))` (except `scannedAt`).
2. **Stable ids:** grave id depends only on `kind, path, name`.
3. **Ages:** every `ageDays >= 0`, and `lastTouched >= born`.
4. **Cobweb threshold:** every cobweb has `ageDays >= 180`; no fact with `ageDays >= 180` is dropped.
5. **Haunted:** at most 10, sorted, and no non-haunted file has more commits than the last haunted one.
6. **Fog:** `0 <= fog <= 1` and `deadFiles <= files`.
7. **Layout:** no two stone rectangles intersect; all stones lie inside their plot.
8. **Epitaph fail-closed:** an LLM reply containing any number/date/name not in the facts is rejected.
9. **Exorcise export edit:** removing `export` keeps the rest of the line byte-identical.

## Error handling
All I/O errors are rethrown with the failing command line. The CLI writes `graveyard.json` atomically (write temp, rename) so a failed scan never leaves a partial file.

## Testing
- Unit + property tests in `vitest`.
- Integration: a tiny fixture repo created in a temp dir by the test (scripted commits with fixed dates via `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`) for scan and exorcise.
