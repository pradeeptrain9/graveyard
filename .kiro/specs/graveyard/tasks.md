# Implementation Plan — Graveyard

- [ ] 1. Workspace setup
  - Root `package.json` with npm workspaces `engine`, `web`; `tsconfig.base.json` strict ESM.
  - `engine`: vitest, fast-check, knip (exact version), @modelcontextprotocol/sdk. `bin: graveyard`.
  - `web`: Vite React TS template, trimmed.
  - _Requirements: tech steering_

- [ ] 2. Schema
  - [ ] 2.1 Write `engine/src/schema.ts` exactly as in design.md.
  - [ ] 2.2 Write `validateGraveyard(json)` used by the web loader; returns readable errors.
  - _Requirements: 4.2, 7.2_

- [ ] 3. Git facts
  - [ ] 3.1 `git.ts` `run()` with execFile and wrapped errors; `headInfo`, `lsFiles`, `isClean`.
  - [ ] 3.2 Single-pass history map (born, last, author, message per path).
  - [ ] 3.3 Integration test: fixture repo with fixed commit dates.
  - _Requirements: 1.2, 1.4, 4.3_

- [ ] 4. Dead code via knip
  - [ ] 4.1 Capture real knip JSON from 2 public repos into `test/fixtures/`.
  - [ ] 4.2 `adaptKnip()` + unit tests against fixtures.
  - [ ] 4.3 `runKnip()`; on failure throw with stderr.
  - _Requirements: 1.1, 1.5_

- [ ] 5. Cobwebs and haunted houses
  - [ ] 5.1 `cobwebs.ts` with git grep + blame; property test 4.
  - [ ] 5.2 `haunted.ts` `rankHaunted`; property test 5.
  - _Requirements: 2.1–2.3, 3.1–3.2_

- [ ] 6. Build + epitaph
  - [ ] 6.1 `buildGraveyard()` pure; ids, ages, plots, sorting.
  - [ ] 6.2 Property tests 1, 2, 3, 6.
  - [ ] 6.3 `templateEpitaph()`.
  - _Requirements: 1.2, 1.3, 4.1–4.3_

- [ ] 7. CLI scan
  - [ ] 7.1 `graveyard scan` with atomic write and exit codes.
  - [ ] 7.2 Scan 3 public repos into `web/public/demo/` (checkpoint: inspect output by hand).
  - _Requirements: 1.1, 1.4, 1.5, 7.1_

- [ ] 8. Web: data + Ledger
  - [ ] 8.1 Demo picker + file drop with `validateGraveyard`.
  - [ ] 8.2 `Ledger.tsx` sortable accessible table.
  - _Requirements: 6.1, 6.2, 7.1, 7.2_

- [ ] 9. Web: Cemetery
  - [ ] 9.1 `layout.ts` pure + property test 7.
  - [ ] 9.2 `Cemetery.tsx` plots, stones, height buckets, haunted houses, cobwebs.
  - [ ] 9.3 Lantern mask + fog; reduced-motion handling.
  - [ ] 9.4 `Epitaph.tsx` panel with keyboard activation and copy command.
  - [ ] 9.5 Web Audio wind, off by default.
  - _Requirements: 5.1–5.7, 6.2–6.4_

- [ ] 10. Exorcise
  - [ ] 10.1 `exorcise.ts` for file, dependency, export; property test 9.
  - [ ] 10.2 Integration test on fixture repo: dirty tree refused, branch + one commit created, no push.
  - _Requirements: 8.1–8.5_

- [ ] 11. MCP server
  - [ ] 11.1 `mcp.ts` with 4 tools; register in `.kiro/settings/mcp.json`.
  - [ ] 11.2 Manual check in Kiro chat: "list dead exports in this repo".
  - _Requirements: 9.1, 9.2_

- [ ] 12. Optional LLM epitaph
  - [ ] 12.1 `llmEpitaph()` with timeout and fact validation; property test 8.
  - _Requirements: 10.1, 10.2_

- [ ] 13. Ship
  - [ ] 13.1 Deploy `web` static build; link in README.
  - [ ] 13.2 README: install, `npx` usage, screenshots, MCP setup.
  - _Requirements: submission_
