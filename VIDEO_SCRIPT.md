# Video script — Graveyard demo (target: under 3 min)

## 0:00 — The problem (20s)

*[Screen: a large `knip` output in the terminal — wall of red file paths]*

"Every repo has corpses nobody buried. Unused files. Exports nobody imports. TODOs from 2021. Knip can list them — but a list of paths doesn't tell you how dead something is, who last touched it, or whether it's safe to delete."

## 0:20 — Walk the cemetery (40s)

*[Screen: browser opens https://pradeeptrain9.github.io/graveyard/ with socket.io demo loaded]*

"This is Graveyard. Each plot is a directory. Each stone is dead code — taller means older."

*[Move mouse slowly across the scene — lantern follows]*

"The lantern follows your cursor. Outside it, everything is still readable — that's enforced at 3:1 contrast, not just dimmed to black."

*[Hover a tall stone in lib/contrib/]*

"This file hasn't been touched in 2019 days. It's a v2 compatibility shim."

*[Click the stone — Epitaph panel slides in]*

"Here's its epitaph: born June 2019, last touched April 2021, by Damien Arrachequesne — 'compat: v2 namespace shim'. Unvisited 2019 days."

"The cobweb means there's an old TODO on this file — 'Remove entire file — v2 compat shim is no longer needed'. That's 1240 days old."

## 1:00 — Exorcise (40s)

*[Screen: Epitaph panel, cursor on Copy button]*

"At the bottom: the exorcise command. I copy it."

*[Switch to terminal, paste and run]*

```
node engine/dist/cli.js exorcise f21f3e2090
```

*[Terminal output: `[graveyard] exorcised f21f3e2090`]*

"Graveyard created a branch `graveyard/exorcise-f21f3e2090`, ran `git rm`, and committed. It did not push. I review the diff, open a PR."

*[Run `git log --oneline -2` — show the commit]*
*[Run `git diff HEAD~1` — show the removal]*

"One file. One commit. No side effects."

## 1:40 — Kiro (50s)

*[Screen: Kiro IDE with spec open — requirements.md visible]*

"I built this spec-first with Kiro. The requirements doc drove the property tests."

*[Screen: cobwebs.prop.test.ts running in terminal — show it catching the off-by-one]*

"This is property test 4: every cobweb has ageDays ≥ 180, and no eligible item is dropped. It caught an off-by-one on my first run — I'd written `> 180` instead of `>= 180`. The shrunk counterexample was one item with exactly 180 days."

*[Screen: Kiro hooks panel — show test-on-save firing]*

"The test-on-save hook ran vitest every time I saved a file. The determinism bug — plots sorted by insertion order instead of directory — showed up as a shrunk 2-grave counterexample while I was still writing the function."

*[Screen: Kiro chat with MCP — type "list dead exports in this repo"]*

"The MCP server lets me query graves from Kiro chat. Same tools the CLI uses — no browser needed."

## 2:30 — Who it's for + link (30s)

*[Screen: Ledger view — sortable table, sort by ageDays desc]*

"Graveyard is for maintainers who want to clean up safely, and new joiners who want to understand why certain files exist. The Ledger view gives you the same data as the cemetery in a sortable table."

"Every visual is backed by a git fact. Nothing is guessed."

*[Screen: browser showing live demo URL]*

"Try it on your own repo: `node engine/dist/cli.js scan .`, then drop the JSON on the site."

**https://pradeeptrain9.github.io/graveyard/**
**https://github.com/pradeeptrain9/graveyard**

*[End — no music. Wind sound optional via the 🌬 button on the site.]*
