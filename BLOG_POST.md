# I built a haunted cemetery for dead code — here's what Kiro's spec-first flow actually changed

*Written for the Kiroween 2026 hackathon.*

Every repo I've worked on has a graveyard. Files nobody imports. Exports nobody uses. Dependencies that crept in for one feature in 2021 and never left. TODOs that have outlived three major versions.

Tools like [knip](https://github.com/webpro-nl/knip) can find this stuff. But a flat list of paths doesn't tell you *how dead* something is, *who* last touched it, or *how risky* it is to delete. So I built Graveyard: a haunted cemetery that maps your dead code onto a visual scene where every scary element is backed by a measured fact.

**[Live demo →](https://pradeeptrain9.github.io/graveyard/)**
**[Repo →](https://github.com/pradeeptrain9/graveyard)**

---

## What it looks like

The cemetery renders one **plot** per top-level directory. Inside each plot, dead files, unused exports, and orphaned dependencies are **tombstones** — taller stones are older code (height bucket = `floor(log2(ageDays/30 + 1))`). Move your mouse and a **lantern** follows, lighting the area around you while keeping the rest readable at ≥ 3:1 contrast.

Old TODO/FIXME/HACK comments (found with `git grep`, aged with `git blame`) become **cobwebs** on the stones. The 10 most-churned files in the last 90 days become **haunted houses** — the files that change the most are your bug magnets. Plots are covered in **fog** proportional to their dead-file ratio.

Click a stone and an **epitaph** slides in:

> *Here lies SocketReservedEventsMap. Born August 5, 2021. Last touched October 1, 2023 by Damien Arrachequesne: "types: reserved events map". Unvisited 1120 days.*

At the bottom of the panel: `node engine/dist/cli.js exorcise ee80e28a1f`. Run it, and Graveyard creates a branch `graveyard/exorcise-ee80e28a1f`, removes the artifact, commits — and stops. You review the diff and open a PR. No yolo deletes.

---

## The architecture

```
repo ──► engine (git + knip facts) ──► buildGraveyard() ──► graveyard.json
                                                                    │
                                               ┌────────────────────┴──────────┐
                                               ▼                               ▼
                                         web (static)                   mcp.ts (stdio)
```

The key design decision: `buildGraveyard()` and `layout.ts` are **pure functions**. They take parsed facts and return JSON — no git, no filesystem, no React. This makes them fast to test with generated data and easy to reason about.

---

## What Kiro's spec-first flow actually changed

I built this for the Kiroween 2026 hackathon using [Kiro](https://kiro.dev), which starts from a spec (Requirements → Design → Tasks) rather than jumping straight to code. Here's what concretely changed.

### The cobweb threshold bug

The spec says: *"THE SYSTEM SHALL include only matches with `ageDays >= 180` as cobwebs."*

Kiro generated a property test that checks this in both directions:
1. Every cobweb has `ageDays >= 180`
2. No item with `ageDays >= 180` is dropped

My first implementation used `> 180` instead of `>= 180`. The test caught it on the first run. The shrunk counterexample was a single item with `ageDays === 180`. Without the spec driving the test, that off-by-one would have lived quietly in production.

### The GitError steering rule

My `tech.md` steering doc says: *"Errors from git/knip: wrap with the command that failed and exit non-zero. Never swallow."*

Kiro's first draft of `git.ts` had `catch (e) { return null }`. With the steering rule in place, it generated a typed `GitError` class with `cmd`, `stderr`, and `exitCode`. Every error message in the CLI now says exactly which command failed and what git printed to stderr. That's the difference between `Error: null` and `git log --follow failed (exit 128): not a git repository: /tmp/test`.

### The determinism bug

Property test 1 checks that `buildGraveyard(facts)` equals `buildGraveyard(shuffle(facts))` modulo `scannedAt`. The `test-on-save` hook runs vitest on every file save, so this fired while I was still writing `build.ts`.

The shrunk counterexample: 2 partial graves in directories `a/` and `b/`, input shuffled. The bug: `plots` came out in insertion order of the history map, not sorted by `dir`. Fix: add one `plots.sort((a, b) => a.dir.localeCompare(b.dir))`. Without the auto-run hook and the property test, this would have caused non-deterministic output that only surfaced when scanning repos with multiple directories — hard to reproduce, easy to miss.

### The `-0` bug

Property test 3 checks `every ageDays >= 0`. It caught `ageDays === -0` when `lastTouched === headDate`. JavaScript's `Math.floor(0)` is `0` but `Math.floor(-0)` is `-0`, and `-0 < 0` is `false` but `-0 === 0` is also `true` while `Object.is(-0, 0)` is `false`. The fix: `Math.max(0, Math.floor(...))`. Shrunk counterexample: 1 grave where `lastTouched` equals `headDate`.

---

## The MCP server

Graveyard exposes a stdio MCP server with four tools: `scan_repo`, `list_graves`, `get_grave`, `exorcise`. Registered in `.kiro/settings/mcp.json`, I could ask Kiro chat questions like "what's the oldest dead file in this repo?" while building, without leaving the editor. The same tools will work for anyone who adds the MCP config to their own workspace.

---

## Property-based testing with fast-check

9 properties, 50–200 runs each. The ones that caught real bugs:

| Property | Bug caught |
|----------|-----------|
| Determinism (shuffle invariant) | Plots sorted by insertion order, not `dir` |
| Ages ≥ 0 | `ageDays === -0` when lastTouched = headDate |
| Cobweb threshold (both directions) | Off-by-one: `> 180` instead of `>= 180` |
| Export edit keeps rest byte-identical | Double-space after `export` left a leading space |

The shrunk counterexamples were the real value — fast-check doesn't just tell you a test failed, it gives you the minimal input that triggers it. That made every fix surgical.

---

## Try it

```bash
# Scan your repo
node engine/dist/cli.js scan .

# Then open graveyard.json in the web UI, or run:
node engine/dist/cli.js exorcise <id>
```

Or drop a `graveyard.json` on the [live demo](https://pradeeptrain9.github.io/graveyard/).

The demo loads socket.io, got, and chalk as examples — with realistic graves, cobwebs, and haunted files so you can see what a real cemetery looks like.

---

*Built for Kiroween 2026. #KiroweenHackathon26*
