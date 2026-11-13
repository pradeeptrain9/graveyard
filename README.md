# 🪦 Graveyard

> Walk your codebase's cemetery.

Graveyard scans a JavaScript/TypeScript git repo and shows dead files, unused exports, orphaned dependencies, rotting TODOs and churn hotspots as a haunted graveyard. Every spooky element maps to a real, measured fact. One command safely "exorcises" a grave on a fresh branch for review.

**[🌐 Live demo → pradeeptrain9.github.io/graveyard](https://pradeeptrain9.github.io/graveyard/)**

Kiroween 2026 entry, **Costume Contest** category. Built with [Kiro](https://kiro.dev) — see [`.kiro/`](.kiro) for the spec, steering and hooks.

---

## What you see

| Visual | Data behind it |
|--------|----------------|
| Tombstone (taller = older) | Unused file / export / dependency found by knip |
| Epitaph | Born date, last-touched date, author, last commit message |
| Cobweb 🕸 | TODO/FIXME/HACK comment ≥ 180 days old (via `git blame`) |
| Haunted house 🔥 | Top-10 most-changed file in last 90 days |
| Plot fog 🌫 | % of files in that directory that are dead |
| Lantern 🔦 | Follows your cursor — outside it, contrast stays ≥ 3:1 |

---

## Install

```bash
npm install -g graveyard-engine
# or use it directly with npx:
npx graveyard scan .
```

**Requirements:** Node ≥ 20, git in PATH, a JS/TS repo.

---

## Usage

### Scan a repo

```bash
# Writes graveyard.json in the current directory
graveyard scan .

# Custom output path
graveyard scan /path/to/repo -o /path/to/out.json
```

### Exorcise a grave

```bash
# id comes from the Epitaph panel's "Copy" button, or from graveyard.json
graveyard exorcise <id> [path]
```

This creates a branch `graveyard/exorcise-<id>`, removes the dead artifact, commits, and stops — it **never pushes**. Review the diff and open a PR yourself.

**Exit codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Unexpected error |
| 2 | Not a git repository |
| 3 | Working tree dirty — commit or stash first |
| 4 | ID not found in latest scan |
| 5 | Unsafe export edit (line doesn't start with `export`) |

---

## Web UI

Drop any `graveyard.json` onto the page, or pick one of the built-in demos.

- **Cemetery view** — navigate with mouse or keyboard (Tab to focus stones, Enter/Space to open epitaph)
- **Ledger view** — sortable table of graves, cobwebs and haunted files
- **Reduced-motion** — fog drift and lantern easing are disabled when `prefers-reduced-motion: reduce` is set
- **Wind sound** — off by default; click 🌬 to toggle generated Web Audio pink noise

---

## MCP server (use Graveyard from inside Kiro)

Add to your workspace `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "graveyard": {
      "command": "node",
      "args": ["./engine/dist/mcp.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Then in Kiro chat:
- *"Scan this repo for dead code"* → calls `scan_repo`
- *"List all dead exports"* → calls `list_graves` with `kind: export`
- *"Show me grave abc123"* → calls `get_grave`
- *"Exorcise grave abc123"* → calls `exorcise`

---

## Architecture

```
repo ──► engine (git + knip facts) ──► buildGraveyard() ──► graveyard.json ──► web (static)
                                                 └────────────────────────► mcp.ts (stdio)
```

- **`engine/src/schema.ts`** — single source of truth for all types
- **`engine/src/git.ts`** — one-pass history map; no git libraries, just `execFile`
- **`engine/src/knip.ts`** — runs pinned knip with `--reporter json`; `adaptKnip()` maps to partial graves
- **`engine/src/build.ts`** — pure function: facts → `Graveyard`
- **`web/src/layout.ts`** — pure: `Graveyard` → stone/plot positions, no overlaps by construction
- **`web/src/Cemetery.tsx`** — SVG scene with lantern mask and fog layers
- **`web/src/Ledger.tsx`** — accessible sortable table

**Tests:** 31 passing — 9 property-based tests (fast-check) + git/exorcise integration tests.

---

## Built on

- [knip](https://github.com/webpro-nl/knip) (ISC) — dead file/export/dependency detection. Graveyard adds git history, epitaphs, cobwebs, churn, the cemetery UI, safe exorcism and an MCP server on top.
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) (MIT) — MCP stdio server
- [Vite](https://vitejs.dev) + [React](https://react.dev) — web UI
- [vitest](https://vitest.dev) + [fast-check](https://fast-check.io) — testing

---

## Development

```bash
git clone https://github.com/pradeeptrain9/graveyard
cd graveyard
npm install

# Build engine
npm run build --workspace=engine

# Run all tests
npm test --workspace=engine

# Start web dev server
npm run dev --workspace=web
```

---

## Disclosure

This project uses [knip](https://github.com/webpro-nl/knip) (ISC licence, pre-existing open source) for dead code detection. All other code was written for this hackathon.

## License

MIT. See [LICENSE](LICENSE).
