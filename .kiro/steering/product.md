---
inclusion: always
---

# Graveyard — product

Graveyard scans a JavaScript/TypeScript git repository and renders its code-health facts as a haunted cemetery. It is a real maintenance tool wearing a costume: every spooky element maps to a measured fact.

## Users
Maintainers and reviewers who inherit a codebase and want to find dead code, rotting TODOs and churn hotspots fast — and delete safely.

## The mapping (the costume contract)
| Spooky element | Real fact | Source |
|---|---|---|
| Tombstone | Unused file, export or dependency | knip |
| Tombstone height | Days since last touched | git log |
| Epitaph | Name, born (first commit), last touched, author, last commit message | git log |
| Cobweb | TODO / FIXME / HACK comment older than 180 days | grep + git blame |
| Haunted house | File in top 10 by commits in last 90 days | git log |
| Fog density in a plot | Share of that directory's files that are dead | derived |
| Exorcism | Deleting a grave on a new branch | engine CLI |

**Rule: no decoration without data.** If a visual element cannot point at a row in `graveyard.json`, remove it.

## Product rules
- The engine is deterministic: same repo + same HEAD → byte-identical `graveyard.json` (except `scannedAt`).
- An LLM is optional and may only reword an epitaph from facts it is given. It never adds facts. On any LLM error or missing key, use the template epitaph. Fail closed.
- Graveyard never changes the user's repo except through `exorcise`, which: refuses on a dirty working tree, creates branch `graveyard/exorcise-<id>`, makes one commit, and never pushes.
- Spooky UI must stay usable: the Ledger (plain table) view shows the same data, all controls work by keyboard, motion respects `prefers-reduced-motion`, sound is off by default.
- No copyrighted music, characters or trademarks in UI, video or assets.
