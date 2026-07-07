---
name: advisor
description: Invoke one of the vault's advisors on a topic — advisor <name> <topic>
---

# advisor — consult an advisor

Consult the advisor the user names, on the topic they give.

## Steps
1. **Find** the advisor's note in `Wiki/30_People/`. Try, in order: `Advisor - <name>.md`, then `<name>.md` (and a lowercase-hyphenated slug of <name>), then glob `Wiki/30_People/*<name>*.md`. If none exists, list the advisors in `Wiki/30_People/` and ask the visitor to pick one (or to run `/build-advisor` to create it).
2. **Ground** the analysis: read `MEMORY.md` for current state and skim `Intelligence_snapshot.md` and the relevant `Wiki/40_Decisions/` notes.
3. **Run the advisor's own Question framework** from their note, then produce their analysis in their **Output format** — in character with their Core methodology, and honestly noting their Anti-patterns where they apply.
4. **Close** with a suggested `Wiki/40_Decisions/` entry (options, owner, reversal conditions, six-month review date) if a decision is warranted.
