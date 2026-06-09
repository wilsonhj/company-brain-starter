---
description: Invoke one of your advisors on a topic — /advisor <name> <topic>
argument-hint: <name> <topic>
allowed-tools: Read, Glob, Grep
---

# /advisor — consult an advisor

Consult the advisor named **$1** on the topic: **$2**.

## Steps
1. **Read** the advisor's note at `Wiki/30_People/Advisor - $1.md`. If it doesn't exist, list the advisors in `Wiki/30_People/` and ask the user to pick one (or to run `/build-advisor` to create it).
2. **Ground** the analysis: read `MEMORY.md` for current state and skim `Intelligence_snapshot.md` and the relevant `Wiki/40_Decisions/` notes for context.
3. **Run the advisor's own Question framework** from their note, then produce their analysis in their **Output format** — staying in character with their Core methodology, and honestly noting their Anti-patterns where relevant.
4. **Close** with a suggested `Wiki/40_Decisions/` entry (options, owner, reversal conditions, six-month review date) if a decision is warranted.
