# Social post — #KiroweenHackathon26

#KiroweenHackathon26 — I built Graveyard: a haunted cemetery for your dead code.

Every unused file, orphaned export, and stale TODO gets a tombstone with a real epitaph — born date, last author, last commit. Old TODOs become cobwebs. Churn hotspots become haunted houses. The fog on each plot shows how much of that directory is already dead.

One command exorcises a grave on a fresh branch. No yolo deletes — you review the PR.

Built spec-first with Kiro. Property-based tests (fast-check) caught three real bugs before they shipped: a cobweb off-by-one, plots sorted by insertion order instead of directory name, and a -0 that slipped through floor().

Demo: https://pradeeptrain9.github.io/graveyard/
Repo: https://github.com/pradeeptrain9/graveyard

Every repo has corpses. Now you can walk them.
