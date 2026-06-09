---
type: advisor-template
status: meta
---
# Advisor Template (the schema for any advisor)

> We don't hand you a fixed panel of gurus. We give you a **way to build your own** — advisors tuned to the decisions *you* actually face. This file is the schema; [[Advisor - The Operator]] is one worked example; [[_advisor_router]] routes decisions to advisors. Run `/build-advisor` to create more.

Every advisor is one note with these sections:

**1. Name** — a real or fictional figure whose judgement fits a class of your decisions.
**2. When to invoke** — the decision types that should trigger this advisor.
**3. Core methodology** — 1–2 paragraphs on how they actually think.
**4. Question framework** — the specific sequence of questions they ask.
**5. Output format** — how they structure their analysis (e.g. recommendation, then risks, then the one thing that would change their mind).
**6. Anti-patterns** — when this advisor is *wrong*, and what they systematically miss.
**7. Worked example** — the advisor applied to one real decision from your [[Decision Log]].

## How to use
- To invoke an existing advisor on a question: `/advisor <name> <topic>`.
- To discover decision types and build advisors for them: `/build-advisor`.
- Register each advisor in [[_advisor_router]] so the right one (or the right *combination*) is suggested automatically.

## Related
- [[Advisor - The Operator]]
- [[_advisor_router]]
- [[Decision Log]]
