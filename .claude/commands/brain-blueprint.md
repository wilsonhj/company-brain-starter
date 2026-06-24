---
description: Generate a personalized "company brain" starter vault (40+ interlinked notes) for an industry in under 60s
argument-hint: "<industry>" <team_size> ["one-line focus"] [--out <folder>]
allowed-tools: Bash(node:*), Bash(open:*)
---

# /brain-blueprint

Generate a personalized Obsidian "company brain" starter vault for a visitor's
industry. Template-first and LLM-light: one Claude (Opus 4.8) call fills in
industry-specific substitutions, then the script weaves 40+ densely-interlinked
notes — a data-flow vault (Inbox → Raw → Wiki → outputs), a three-layer memory
triad (CLAUDE.md / MEMORY.md / Intelligence_snapshot.md), a layered `CLAUDE.md`
in every folder, and an industry-tailored advisor. Target: under 60 seconds.
By default the vault lands in `~/Showcase/blueprints/`; pass `--out ./folder`
when you want it written somewhere specific.

Running the generator now:

```!
node scripts/generate.mjs $ARGUMENTS
```

After it runs, tell the visitor:

1. The **company name** and **wall time** from the output above.
2. Open the vault so the graph blooms — run the `open -a Obsidian "..."` command
   printed above (or read it out for them to copy).
3. Point at the QR card: the **generic** starter (this same structure, un-personalized)
   lives in the public `company-brain-starter` repo. Offer to **AirDrop** the
   personalized `.zip` (path printed above) or **email** it after.
4. Start them on `Dashboard.md`: the CEO operating surface for progress, judgment
   calls, risk drift, team load, and this week's checklist.
5. The takeaway line: *"Every folder has its own `CLAUDE.md` telling the AI how to
   behave there, knowledge flows Inbox → Raw → Wiki → outputs, and the root files
   split the operating system into rules, Dashboard, today's state, and the deep
   picture. The Dashboard only surfaces notes that change decisions, unblock people,
   protect capital, or update operating state."* Point out the industry-tailored
   advisor and `/build-advisor` as the "build YOUR advisors" hook.

Do **not** attempt live personalized URLs on venue wifi — AirDrop or email only.
