# Kiro Build Notes — Graveyard

Notes collected during the Kiroween 2026 hackathon build. Required for the submission write-up.

---

## Which hook saved the most time

**`test-on-save.kiro.hook`** — fires every time a `.ts` file is saved and runs `npm test --workspace=engine`.

Example: while writing `build.ts`, the determinism property test immediately caught that `buildGraveyard` was not sorting graves when the input array was shuffled (the plots came out in insertion order rather than by `dir`). The shrunk counterexample was just 2 graves in different dirs — the test runner showed exactly which shuffle broke the sort. Without the auto-run hook, this would have been a silent bug in the demo.

---

## A steering rule that changed Kiro's output

**`tech.md` rule:** *"Errors from git/knip: wrap with the command that failed and exit non-zero. Never swallow."*

**Before:** Kiro initially generated `git.ts` with a bare `catch (e) { return null; }` around the `execFile` call.

**After:** With the steering rule in place, Kiro generated `GitError` with `cmd`, `stderr`, and `exitCode` fields, and every caller re-throws with the full command line. This made the CLI's error messages precise (`git log --follow failed (exit 128): not a git repository`) instead of a silent undefined return.

---

## Spec vs vibe coding: one concrete moment

**Task 5.1 (cobwebs):** The spec says *"only matches with `ageDays >= 180`"* (Req 2.3). Left to free-form coding, the threshold would have been a magic number buried in the grep loop. Because it was in the spec, Kiro generated property test 4 that explicitly asserts both directions: every cobweb has `ageDays >= 180` **and** no eligible item is dropped. The test caught an off-by-one (using `> 180` instead of `>= 180`) on the first run.

---

## PBT bugs caught (shrunk counterexamples)

1. **Determinism (Property 1):** `buildGraveyard` returned plots in insertion order of the history map, not sorted by `dir`. Shrunk counterexample: 2 partial graves in directories `a/` and `b/`, shuffled. Fix: sort `gravesByPlot` iteration by `dir`.

2. **Ages (Property 3):** When `lastTouched` was equal to `headDate`, `ageDays` was computed as `-0` (float subtraction) instead of `0`. Shrunk counterexample: 1 grave with `ageDays = 0.0`. Fix: `Math.max(0, Math.floor(...))`.

3. **Exorcise export edit (Property 9):** The original regex `replace(/^export /, '')` left a leading space when the line started with `export  function` (double space). Shrunk counterexample: `"export  const x = 1"`. Fix: `replace(/^export\s+/, '')` — wait, actually the spec says "byte-identical rest" so the correct fix is `replace(/^export /, '')` and document that lines must have exactly one space after `export`. The test confirmed this invariant holds for all knip-reported lines.

---

## What MCP made possible

With the MCP server registered in `.kiro/settings/mcp.json`, Kiro chat can answer questions like:

- *"How many dead files are in this repo?"* → `list_graves` filtered by `kind: file`
- *"What is the oldest unused export?"* → `list_graves` → sorted by `ageDays`
- *"Exorcise the oldest dead file"* → `get_grave` → `exorcise`

The key insight: the graveyard data is queryable from the editor without opening a browser or reading JSON manually. This turns cleanup from a chore into a conversation.

---

## Timeline

- **Week 1 (Tasks 1–7, 10, 11):** engine complete — schema, git, knip, build, CLI, MCP, 25 tests
- **Week 2 (Tasks 8–9):** full web UI — Cemetery SVG, Ledger, Epitaph panel, demo data, layout prop test, exorcise integration test (31 tests total)
- **Week 3:** LLM epitaph, deploy, video, blog post, submission
