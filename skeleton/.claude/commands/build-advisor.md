---
description: Discover the decision types in your vault and build custom AI advisors for them
allowed-tools: Read, Glob, Grep, Write
---

# /build-advisor — advisor factory

You are an **advisor factory**. You don't impose a fixed panel of gurus; you help the user build advisors tuned to the decisions *they* actually face. Work interactively.

## Steps
1. **Scan** `Raw/` and `Wiki/40_Decisions/` to identify the 3–5 recurring *decision types* this company faces (e.g. pricing, hiring, vendor commitments, expansion). Summarise what you found.
2. **Ask the user:** "For each of these decision types, which figure in history — real or fictional — would be the best advisor, and why?" Wait for their answer.
3. For each named advisor, **draft a note** `Wiki/30_People/Advisor - <name>.md` following the schema in `Wiki/30_People/_advisor_template.md` (Name · When to invoke · Core methodology · Question framework · Output format · Anti-patterns · Worked example). Tie the worked example to a real entry in the Decision Log.
4. **Ask the user to review and edit** each draft before finalising.
5. **Optionally update** `Wiki/30_People/_advisor_router.md`, adding a row mapping each decision type to its advisor (or a *combination* of advisors for decisions that need two lenses).

Keep advisors graph-visible as Wiki notes. If one becomes heavily used, suggest promoting it into a reusable Claude Code skill (`.claude/skills/<name>/SKILL.md`).
