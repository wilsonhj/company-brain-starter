---
description: Generate a personalized "company brain" starter vault (30+ interlinked notes) for an industry in under 60s
argument-hint: "<industry>" <team_size> ["one-line focus"]
allowed-tools: Bash(node:*), Bash(open:*)
---

# /brain-blueprint

Generate a personalized Obsidian "company brain" starter vault for a visitor's
industry. Template-first and LLM-light: one fast Claude (Haiku) call fills in
industry-specific substitutions, then the script weaves 35 densely-interlinked
notes with a layered `CLAUDE.md` in every folder. Target: under 60 seconds.

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
4. The takeaway line: *"Every folder has its own `CLAUDE.md` telling the AI how to
   behave there — that layering is what turns a folder of notes into a company brain."*

Do **not** attempt live personalized URLs on venue wifi — AirDrop or email only.
