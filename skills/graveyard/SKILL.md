---
name: graveyard
description: Find dead code in a JavaScript/TypeScript git repo (unused files, exports, dependencies), old TODOs and churn hotspots with Graveyard, explain which findings are trustworthy, and safely delete one on a new branch. Use when the user asks to find dead/unused code, clean up a JS/TS repo, audit code health, scan a GitHub repo for dead code, or run/visualize Graveyard.
---

# Graveyard

Graveyard = knip (dead-code detection) + git history. It writes `graveyard.json` and can "exorcise" one grave: new branch, one commit, never pushes. Viewer: https://pradeeptrain9.github.io/graveyard/ (drag `graveyard.json` onto the page).

## 1. Get the engine

```bash
GRAVEYARD_HOME="${GRAVEYARD_HOME:-$HOME/.graveyard}"
GY="$GRAVEYARD_HOME/engine/dist/cli.js"
```

If `$GY` does not exist:

```bash
git clone https://github.com/pradeeptrain9/graveyard.git "$GRAVEYARD_HOME"
cd "$GRAVEYARD_HOME" && npm ci && npm run build -w engine
```

Always call it as `node "$GY" …` (a `GY="node …"` variable breaks in zsh). Shell variables don't persist between tool calls — redefine them in each command. Needs Node ≥ 20 and git.

## 2. Prepare the target repo

- GitHub URL → full clone (`git clone <url>`). **Never `--depth`**: ages and churn come from history.
- Must be a JS/TS repo with a `package.json` at the root. Otherwise stop and say so.
- **Install dependencies first** — knip loads the repo's configs (eslint, vitest, …) and crashes without them:
  - `pnpm-lock.yaml` → `pnpm install --ignore-scripts --frozen-lockfile`
  - `yarn.lock` → `yarn install --ignore-scripts --frozen-lockfile`
  - `package-lock.json` → `npm ci --ignore-scripts`
  - no lockfile → `npm install --ignore-scripts --no-package-lock --no-audit --no-fund` (`npm ci` fails without a lockfile; `--no-package-lock` keeps the tree clean)
- Keep the scan output out of git status so exorcise doesn't see a dirty tree:
  `grep -qx graveyard.json .git/info/exclude || echo graveyard.json >> .git/info/exclude`
- Run `git status --porcelain`. If it is not empty, tell the user — exorcise will refuse (exit 3).

## 3. Scan

```bash
cd <repo> && node "$GY" scan .
```

Writes `<repo>/graveyard.json` (exorcise reads it from there; `-o` elsewhere only for viewing). Usually seconds.

Report from the JSON, briefly:
- totals: graves by `kind`, cobwebs, haunted
- plots with highest `fog` (share of dead files per top-level dir)
- 5 oldest graves: `path`/`name`, `ageDays`, `author`, `lastMessage`
- top haunted files: `commits90d`, `authors`
- how to view: drag the file onto the viewer URL

## 4. Judge findings before calling anything dead

knip flags what it can't reach from an entry point. Common **false positives** — label them "likely false positive", never "safe to delete":
- `examples/`, `docs/`, `scripts/`, `sandbox/` files run standalone
- test files run by a runner glob (check the `test` script in `package.json`)
- CLI/bin or server entry points not listed in `package.json` (`bin`, `main`, `exports`)
- dependencies used only by examples, configs or scripts
- exports consumed by other packages in a monorepo, or public API of a library

Most trustworthy: unused **exports** inside `src/`/`lib/` of an app, and unused deps the code never mentions (grep to confirm).

## 5. Exorcise — only when the user picks a grave

```bash
cd <repo> && node "$GY" exorcise <id> .
```

- `file` → `git rm`; `dependency` → removed from `package.json`; `export` → only the leading `export` keyword is removed.
- Creates branch `graveyard/exorcise-<id>`, one commit, **no push**. Never push for the user.
- Then verify: run the repo's type-check/tests and show `git show --stat HEAD`. If anything fails, say so; undo with `git checkout - && git branch -D graveyard/exorcise-<id>`.

Exit codes: 0 ok · 1 unexpected · 2 not a git repo · 3 dirty tree · 4 id not in latest scan (rescan) · 5 unsafe edit — line doesn't start with `export` (CommonJS `exports.x =`): Graveyard refuses rather than guess; explain that, don't hand-edit around it.

## Known failures

- `Cannot find module …` while loading a config → dependencies not installed (step 2).
- `Unexpected token '﻿'` in a `package.json` → knip can't parse a UTF-8 BOM (seen on vite). No workaround; tell the user.
- Non-JS/TS repo → not supported.

## MCP (optional)

The engine also ships an MCP stdio server: `node $GRAVEYARD_HOME/engine/dist/mcp.js` with tools `scan_repo`, `list_graves`, `get_grave`, `exorcise`.
