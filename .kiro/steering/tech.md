---
inclusion: always
---

# Graveyard — tech

- Language: TypeScript, `strict: true`, ESM, Node 20+.
- Repo: npm workspaces — `engine/` (CLI + MCP server) and `web/` (UI). Shared types live in `engine/src/schema.ts`; `web` imports them, never redefines them.
- Engine deps (keep this list short; ask before adding any other):
  - `knip` (pinned exact version) — dead files/exports/dependencies via `--reporter json`.
  - `@modelcontextprotocol/sdk` — MCP server.
  - Git: call the `git` binary with `child_process.execFile`. No git libraries. Never pass user input through a shell.
- Web: Vite + React, plain CSS with custom properties, inline SVG for the cemetery. No UI kit, no state library, no canvas engine.
- Tests: `vitest` + `fast-check` for property-based tests. Engine logic must be pure functions over parsed facts so it is testable without git.
- Lint/format: `tsc --noEmit` must pass. Prettier defaults.
- Hosting: `web/` builds to a static site (Cloudflare Pages or GitHub Pages) that loads demo `graveyard.json` files from `web/public/demo/` or a user-dropped file. No backend.

## Coding rules
- Smallest code that works. No abstraction without two real callers.
- Every engine function that classifies or scores gets a property test.
- Errors from git/knip: wrap with the command that failed and exit non-zero. Never swallow.
- Dates are ISO 8601 strings in UTC in all JSON.
