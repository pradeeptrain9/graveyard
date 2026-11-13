# Requirements — Graveyard

## Introduction
Graveyard scans a JS/TS git repository, finds dead code, rotting TODOs and churn hotspots, and shows them as an interactive haunted cemetery with a safe one-click deletion ("exorcism"). Output is a deterministic `graveyard.json` consumed by a static web UI and by an MCP server.

## Requirement 1 — Scan dead code
**User story:** As a maintainer, I want unused files, exports and dependencies listed with their history, so that I know what is safe to delete.

1.1 WHEN the user runs `graveyard scan <path>` on a git repo THE SYSTEM SHALL write `graveyard.json` containing one grave per unused file, unused export and unused dependency reported by knip.
1.2 FOR each grave THE SYSTEM SHALL record: `id`, `kind` (`file` | `export` | `dependency`), `path`, `name` (exports/deps), `line` (exports), `born` (first commit adding the file), `lastTouched`, `author` and `lastMessage` of the last commit touching the file.
1.3 THE SYSTEM SHALL derive grave `id` as a stable hash of `kind + path + name`, so that the same grave has the same id across scans.
1.4 IF `<path>` is not a git repository THEN THE SYSTEM SHALL exit with code 2 and print `not a git repository: <path>`.
1.5 IF knip fails THEN THE SYSTEM SHALL exit non-zero and print knip's stderr; it SHALL NOT write a partial `graveyard.json`.

## Requirement 2 — Cobwebs
**User story:** As a maintainer, I want old TODO/FIXME/HACK comments surfaced, so that forgotten promises get resolved or removed.

2.1 THE SYSTEM SHALL find comments matching `TODO|FIXME|HACK` in tracked `.js .jsx .ts .tsx .mjs .cjs` files.
2.2 FOR each match THE SYSTEM SHALL use `git blame` to record `author` and `ageDays`.
2.3 THE SYSTEM SHALL include only matches with `ageDays >= 180` as cobwebs.

## Requirement 3 — Haunted houses
**User story:** As a reviewer, I want the files that change most often highlighted, so that I know where bugs likely live.

3.1 THE SYSTEM SHALL count commits per tracked file over the 90 days before HEAD's commit date.
3.2 THE SYSTEM SHALL mark the top 10 files by commit count (ties broken by path ascending) as haunted, with `commits90d` and distinct `authors`.

## Requirement 4 — Determinism
4.1 GIVEN the same repo at the same HEAD THE SYSTEM SHALL produce identical `graveyard.json` except for `scannedAt`.
4.2 THE SYSTEM SHALL sort all arrays by a stable key and use UTC ISO 8601 dates.
4.3 THE SYSTEM SHALL measure all ages relative to HEAD's commit date, not wall-clock time.

## Requirement 5 — Cemetery view
**User story:** As a user, I want to walk the graveyard visually, so that code health is memorable and fun to explore.

5.1 THE SYSTEM SHALL render one plot per top-level directory, containing that directory's graves as tombstones.
5.2 THE SYSTEM SHALL scale tombstone height by `lastTouched` age, bucketed into 5 heights.
5.3 THE SYSTEM SHALL scale a plot's fog opacity by the share of its files that are dead.
5.4 THE SYSTEM SHALL draw cobwebs on the stones/houses of files that have them and draw haunted houses for haunted files.
5.5 WHEN the pointer moves over the scene THE SYSTEM SHALL light a lantern radius around it; outside the radius the scene is dimmed but still readable (contrast ≥ 3:1 for stone labels).
5.6 WHEN the user activates a tombstone (click, Enter or Space) THE SYSTEM SHALL open the Epitaph panel with all grave facts and the exorcise command.
5.7 Layout SHALL be deterministic and no two tombstones SHALL overlap.

## Requirement 6 — Ledger view and accessibility
6.1 THE SYSTEM SHALL provide a Ledger view: a sortable table of graves, cobwebs and haunted houses with the same data as the cemetery.
6.2 All interactive elements SHALL be reachable and operable by keyboard with visible focus.
6.3 WHEN `prefers-reduced-motion: reduce` is set THE SYSTEM SHALL disable fog drift and lantern easing.
6.4 Ambient sound SHALL be off by default, generated with Web Audio (no recorded music).

## Requirement 7 — Loading data
7.1 THE SYSTEM SHALL offer at least 3 prebuilt demo graveyards of public open-source repos.
7.2 WHEN the user drops or picks a `graveyard.json` THE SYSTEM SHALL validate `schemaVersion` and required fields and show a readable error on mismatch.

## Requirement 8 — Exorcism
**User story:** As a maintainer, I want to delete a grave safely, so that cleanup is one reviewed commit.

8.1 WHEN the user runs `graveyard exorcise <id>` THE SYSTEM SHALL refuse with exit code 3 if the working tree is dirty.
8.2 THE SYSTEM SHALL create branch `graveyard/exorcise-<id>` from HEAD.
8.3 FOR a `file` grave THE SYSTEM SHALL `git rm` the file; FOR a `dependency` grave remove it from `package.json`; FOR an `export` grave remove the `export` keyword only (not the declaration).
8.4 THE SYSTEM SHALL make one commit `chore(graveyard): exorcise <kind> <name|path>` and SHALL NOT push.
8.5 IF the grave id is not in the latest scan THEN THE SYSTEM SHALL exit with code 4.

## Requirement 9 — MCP server
**User story:** As a Kiro user, I want to ask my agent what is dead in my repo, so that cleanup happens inside my editor.

9.1 THE SYSTEM SHALL expose an MCP stdio server with tools `scan_repo(path)`, `list_graves(path, kind?)`, `get_grave(path, id)` and `exorcise(path, id)`.
9.2 Tool results SHALL be the same JSON objects as `graveyard.json` entries.

## Requirement 10 — Optional LLM epitaph
10.1 WHERE an API key is configured THE SYSTEM MAY reword the template epitaph using only the grave's facts.
10.2 IF the LLM call fails, times out (5 s) or returns text containing a date, name or number not in the facts THEN THE SYSTEM SHALL use the template epitaph.
