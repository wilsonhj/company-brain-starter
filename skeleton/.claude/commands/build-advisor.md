---
description: Live-discover your recurring decision types and draft a custom AI advisor for each
allowed-tools: Read, Glob, Grep, Write
model: claude-haiku-4-5-20251001
effort: low
---

# /build-advisor — advisor factory (live discovery)

Run this as a fast, scripted-feeling sequence — the whole loop should feel near-instant (well under 30 seconds after the visitor answers). You don't impose a fixed panel of gurus; you help the visitor build advisors tuned to the decisions *they* actually face. **Do not read any other files** — everything you need is in this command. Do the minimum: present, ask, write one file, print Done.

## Step 1 — Scan (print this line verbatim, then continue immediately)
> Scanning Raw/ and Wiki/40_Decisions/ for recurring decision types...

The three recurring decision types below were identified when this brain was generated. Do not re-analyse — just present them.

## Step 2 — Present the three decision types (print as a numbered list)
1. Pricing and promotion
2. Channel or market expansion
3. Vendor and platform commitments

## Step 3 — Ask, then STOP and wait
Ask in one line:
> "Who in history — real or fictional — would be the best advisor here? Name one (or one per type)."

## Step 4 — Draft instantly (the critical path)
For each advisor the visitor names, immediately **Write** `Wiki/30_People/<advisor_slug>.md` (slug = lowercase, hyphenated name) with these sections, filled from what you know about that figure — no file reads needed:
`# Advisor: <Name>` · **When to invoke** (tie to the matching decision type above) · **Core methodology** (1 short paragraph) · **Question framework** (3–4 questions) · **Output format** (a few bullets) · **Anti-patterns** (when they're wrong) · **Worked example** (apply them to one decision from `Wiki/40_Decisions/`). Keep it tight. Naming only one advisor is fine.

## Step 5 — Print Done (this is the finish line)
Print exactly:
> Done — drafted Wiki/30_People/<advisor_slug>.md. Try `/advisor <name> <topic>` to invoke.

## Step 6 — Optional, only if asked
Offer to add a row to [[_advisor_router]] mapping the decision type to the new advisor, and to promote a heavily-used advisor into a reusable skill (`.claude/skills/<name>/SKILL.md`). Don't block the finish line on this.
