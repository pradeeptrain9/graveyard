# Implementation Plan — Graveyard

- [x] 1. Workspace setup
  - Root `package.json` with npm workspaces `engine`, `web`; `tsconfig.base.json` strict ESM.
  - `engine`: vitest, fast-check, knip (exact version), @modelcontextprotocol/sdk. `bin: graveyard`.
  - `web`: Vite React TS template, trimmed.
  - _Requirements: tech steering_

- [x] 2. Schema
  - [x] 2.1 Write `engine/src/schema.ts` exactly as in design.md.
  - [x] 2.2 Write `validateGraveyard(json)` used by the web loader; returns readable errors.
  - _Requirements: 4.2, 7.2_

- [x] 3. Git facts
  - [x] 3.1 `git.ts` `run()` with execFile and wrapped errors; `headInfo`, `lsFiles`, `isClean`.
  - [x] 3.2 Single-pass history map (born, last, author, message per path).
  - [x] 3.3 Integration test: fixture repo with fixed commit dates.
  - _Requirements: 1.2, 1.4, 4.3_

- [x] 4. Dead code via knip
  - [ ] 4.1 Capture real knip JSON from 2 public repos into `test/fixtures/`.
  - [x] 4.2 `adaptKnip()` + unit tests against fixtures.
  - [x] 4.3 `runKnip()`; on failure throw with stderr.
  - _Requirements: 1.1, 1.5_

- [x] 5. Cobwebs and haunted houses
  - [x] 5.1 `cobwebs.ts` with git grep + blame; property test 4.
  - [x] 5.2 `haunted.ts` `rankHaunted`; property test 5.
  - _Requirements: 2.1–2.3, 3.1–3.2_

- [x] 6. Build + epitaph
  - [x] 6.1 `buildGraveyard()` pure; ids, ages, plots, sorting.
  - [x] 6.2 Property tests 1, 2, 3, 6.
  - [x] 6.3 `templateEpitaph()`.
  - _Requirements: 1.2, 1.3, 4.1–4.3_

- [x] 7. CLI scan
  - [x] 7.1 `graveyard scan` with atomic write and exit codes.
  - [ ] 7.2 Scan 3 public repos into `web/public/demo/` (checkpoint: inspect output by hand).
  - _Requirements: 1.1, 1.4, 1.5, 7.1_

- [x] 8. Web: data + Ledger
  - [x] 8.1 Demo picker + file drop with `validateGraveyard`.
  - [x] 8.2 `Ledger.tsx` sortable accessible table.
  - _Requirements: 6.1, 6.2, 7.1, 7.2_

- [x] 9. Web: Cemetery
  - [x] 9.1 `layout.ts` pure + property test 7.
  - [x] 9.2 `Cemetery.tsx` plots, stones, height buckets, haunted houses, cobwebs.
  - [x] 9.3 Lantern mask + fog; reduced-motion handling.
  - [x] 9.4 `Epitaph.tsx` panel with keyboard activation and copy command.
  - [x] 9.5 Web Audio wind, off by default.
  - _Requirements: 5.1–5.7, 6.2–6.4_

- [x] 10. Exorcise
  - [x] 10.1 `exorcise.ts` for file, dependency, export; property test 9.
  - [x] 10.2 Integration test on fixture repo: dirty tree refused, branch + one commit created, no push.
  - _Requirements: 8.1–8.5_

- [x] 11. MCP server
  - [x] 11.1 `mcp.ts` with 4 tools; register in `.kiro/settings/mcp.json`.
  - [ ] 11.2 Manual check in Kiro chat: "list dead exports in this repo".
  - _Requirements: 9.1, 9.2_

- [x] 12. Optional LLM epitaph
  - [x] 12.1 `llmEpitaph()` with timeout and fact validation; property test 8.
  - _Requirements: 10.1, 10.2_

- [x] 13. Ship
  - [ ] 13.1 Deploy `web` static build; link in README. ← GitHub Pages workflow added; needs Pages enabled in repo settings
  - [x] 13.2 README: install, `npx` usage, screenshots, MCP setup.
  - _Requirements: submission_
