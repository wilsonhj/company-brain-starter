---
description: Invoke one of your advisors on a topic — /advisor <name> <topic>
argument-hint: <name> <topic>
allowed-tools: Read, Glob, Grep
---

# /advisor — consult an advisor

Consult the advisor named **$1** on the topic: **$2**.

## Steps
1. **Find** the advisor's note in `Wiki/30_People/`. Try, in order: `Advisor - $1.md`, then `$1.md` (and a lowercase-hyphenated slug of $1), then glob `Wiki/30_People/*$1*.md`. If none exists, list the advisors in `Wiki/30_People/` and ask the visitor to pick one (or to run `/build-advisor` to create it).
2. **Ground** the analysis: read `MEMORY.md` for current state and skim `Intelligence_snapshot.md` and the relevant `Wiki/40_Decisions/` notes.
3. **Run the advisor's own Question framework** from their note, then produce their analysis in their **Output format** — in character with their Core methodology, and honestly noting their Anti-patterns where they apply.
4. **Close** with a suggested `Wiki/40_Decisions/` entry (options, owner, reversal conditions, six-month review date) if a decision is warranted.
