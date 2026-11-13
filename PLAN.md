# Kiroween 2026 plan: Graveyard (Costume Contest)

**Hard deadline: Fri 4 Dec 2026, 2:00 PM PT = Sat 5 Dec, 3:30 AM IST.** Aim to submit **Thu 3 Dec**.

## Today
- [ ] Request Kiro credits (form closes **Tue 1 Dec, 12:00 PM PT**; allow 48 business hours).
- [ ] `git init`, create a **public** GitHub repo `graveyard`, push this skeleton, and set the license so it shows in the About section.
- [ ] Open the folder in Kiro. Review/refine the spec *in Kiro* (Requirements → Design → Tasks) so the history shows real Kiro use.
- [ ] Check the 4 hooks appear in Kiro's hooks panel. If the JSON format was rejected, recreate them from the panel using the same prompts.

## Week 1 (13–19 Nov): engine
Tasks 1–7. Exit: `graveyard scan` produces correct JSON for 3 public repos, and the property tests pass.

## Week 2 (20–26 Nov): cemetery
Tasks 8–9, 13.1. Exit: hosted static site with 3 demo graveyards, plus Ledger view and keyboard navigation.

## Week 3 (27 Nov–3 Dec): magic + ship
Tasks 10–12, then submission:
- [ ] MCP server working inside Kiro (record a clip of it for the video).
- [ ] Exorcise demo on a real repo.
- [ ] Video under 3 min, uploaded to YouTube as public. No copyrighted music: use generated Web Audio wind or silence.
  - 0:00 problem: "Every repo has corpses nobody buried."
  - 0:20 pick a famous repo, walk the cemetery with the lantern.
  - 1:00 epitaph, then exorcise, then the PR diff.
  - 1:40 Kiro: spec, hooks firing, PBT counterexample, MCP in chat.
  - 2:30 who it's for, plus the link.
- [ ] Devpost text description.
- [ ] Kiro write-up (keep notes as you go in `KIRO_NOTES.md`).
- [ ] Blog post (dev.to / Medium / Hashnode) that says it was written for the Kiroween 2026 hackathon.
- [ ] Social post that **starts with** `#KiroweenHackathon26`. Write it yourself: judges score original thoughts over AI writing.

## Judging (5 × 20%): how Graveyard scores
- **Impact:** a real tool for maintainers and new joiners, with safe deletion.
- **Tech (Kiro use):** spec with EARS requirements, 4 hooks, 3 steering docs, MCP, PBT. Write down every PBT counterexample you hit.
- **Design:** cemetery plus Ledger, accessible, and every visual is backed by data.
- **Innovation:** dead-code tools exist, but none turn the data into a navigable place with history.
- **Presentation:** a tight 3-minute story.

## Rules to remember
- Disclose knip (pre-existing open source). It's already in the README.
- The demo URL must stay up and free until **29 Jan 2027**.
- Never gitignore `.kiro/`.

## Write-up notes (fill in as you build) → `KIRO_NOTES.md`
- Which hook saved the most time, with an example.
- A steering rule that changed Kiro's output (before/after).
- Spec vs vibe coding: one concrete moment.
- PBT bugs caught (shrunk counterexamples).
- What MCP made possible (querying graves from Kiro chat).
