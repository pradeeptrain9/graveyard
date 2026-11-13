# Graveyard — Devpost Submission

## Tagline
Walk your codebase's cemetery. Find dead code, give it an epitaph, exorcise it safely.

## The problem
Every repo has corpses nobody buried. Unused files accumulate. Exports nobody imports. Dependencies nobody needs. TODOs from 2021 nobody remembers. These aren't just clutter — they confuse new contributors, slow down type-checkers, and hide real bugs behind noise.

Dead-code tools like knip can list them, but a list of paths tells you nothing about *how dead* something is, *who* last touched it, *why* it's still there, or *how risky* it is to delete.

## The solution
Graveyard turns your codebase's dead code into a navigable haunted cemetery.

Every dead file, unused export, and orphaned dependency gets a **tombstone** — taller the older it is. Mouse over the scene and a **lantern** lights the area around you, keeping everything else readable but dimmed. Hover a stone and an **epitaph** slides in: born date, last touched date, who touched it, the last commit message.

Old TODO/FIXME/HACK comments (via `git blame`) become **cobwebs** on the stones. The most-churned files in the last 90 days become **haunted houses** — these are your bug magnets. Plots (top-level directories) are covered in **fog** proportional to how dead they are.

One click opens the exorcise command: `node engine/dist/cli.js exorcise <id>`. It creates a fresh branch, removes the artifact, commits — and stops. You review the diff, open a PR. No yolo deletes.

## How Kiro shaped the build

**Spec-first:** I used Kiro's Requirements → Design → Tasks flow to write EARS requirements before touching code. When I got to cobweb threshold, the spec said `ageDays >= 180`. The property test Kiro generated checked both directions: every cobweb passes the threshold *and* no eligible item is dropped. It caught an off-by-one on the first run (`> 180` vs `>= 180`).

**4 hooks in `.kiro/hooks/`:**
- `test-on-save` — runs `vitest` on every `.ts` save; caught the determinism bug in `buildGraveyard` immediately (the shrunk counterexample was 2 graves in different directories, shuffled)
- `schema-guard` — validates any `graveyard.json` touched in the workspace
- `costume-contract` — reminds me of the submission checklist on every agent turn
- `refresh-demo` — rebuilds demo JSONs when the generator changes

**3 steering docs** (`product.md`, `structure.md`, `tech.md`) — `tech.md`'s rule *"errors from git/knip: wrap with the command that failed, never swallow"* changed Kiro's first draft of `git.ts` from `catch (e) { return null }` to a typed `GitError` class with `cmd`, `stderr`, and `exitCode`. That made every CLI error message precise and debuggable.

**MCP server** — registered in `.kiro/settings/mcp.json` so I could query graves from Kiro chat while building. "List the oldest dead file" during development gave me real feedback on the data model without opening a browser.

**PBT counterexamples caught:**
1. `buildGraveyard` returned plots in map insertion order — determinism test caught it; fix: sort by `dir`
2. `ageDays` computed as `-0` when `lastTouched === headDate` — ages test caught it; fix: `Math.max(0, ...)`
3. Export-strip regex left double space on `export  function` — exorcise property test caught it

## Technical highlights
- Pure engine/web split: `buildGraveyard()` and `layout.ts` are pure functions with no I/O, fully testable with generated data
- Single-pass git history: one `git log --name-only` walk builds the full `Map<path, {born, last, author, msg}>` instead of one `git log` per file
- Schema-validated JSON: `validateGraveyard()` runs on every file drop and demo load, showing readable errors
- 36 tests: 9 property-based (fast-check, 50–200 runs each), plus git and exorcise integration tests with real fixture repos built in temp dirs with `GIT_AUTHOR_DATE`
- Accessible: all tombstones are `role="button" tabIndex={0}`, Ledger table has `aria-sort`, Epitaph has `role="dialog" aria-modal`, reduced-motion respected

## What's next
- Publish the engine to npm under an unclaimed name so it runs without cloning the repo
- Real LLM epitaphs (the timeout+fact-validation guard is already built, just needs an API key config)
- VS Code extension using the same MCP tools

## Built with
TypeScript · Node.js · Vite · React · SVG · Web Audio API · fast-check · vitest · knip · @modelcontextprotocol/sdk · Kiro

## Demo
https://pradeeptrain9.github.io/graveyard/

## Repo
https://github.com/pradeeptrain9/graveyard
