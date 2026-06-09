# Your Company — Company Brain (root agent guide)

We build a durable your company business by compounding good decisions, documenting how we operate, and giving every teammate (and every AI agent) the same context the founders have.

**Tagline:** A starter company brain
**Industry:** your company  ·  **Team size:** your team

## The three-layer memory (read these in order)
1. **This file (`CLAUDE.md`)** — the *rules*: how you, an AI agent, should behave here.
2. **[[MEMORY]]** — the *state*: a fast-changing snapshot of where things stand right now (this quarter, what's urgent, who's on what). Read it to know the present.
3. **[[Intelligence_snapshot]]** — the *panorama*: the deep, slowly-evolving, authoritative picture of the whole business. Read it to understand context in depth.

Three files, three jobs: rules vs. live state vs. deep reference. Don't collapse them.

## How knowledge flows (the data pipeline)
Things move left to right, and only the right-hand side is authoritative:

`Inbox/`  →  `Raw/`  →  `Wiki/`  →  `outputs/`

- **Inbox/** — everything enters here first (a thought, a forwarded note, a signal). Capture beats organising.
- **Raw/** — if an item has lasting value, its *immutable source* (a transcript, a document, a clipping) is filed here. Never edit Raw; it is the evidence.
- **Wiki/** — the distilled, human-readable truth. An agent and a human turn Raw into Wiki *through dialogue*, not by dumping. Humans read here.
- **outputs/** — query results, reports, and summaries an agent generates land here. Disposable; regenerate any time.

When you process the Inbox: keep lasting sources in Raw, distil meaning into the right `Wiki/` domain folder, and cite the Raw source you used.

## Behavioral guardrails (watch the human for these)
This brain has opinions. If you notice one of these patterns, say so and intervene:
- **Scope creep** — a task quietly growing past its original mandate. *Intervention:* restate the original goal and ask what to cut.
- **Research-instead-of-execute** — endless gathering that defers the actual decision. *Intervention:* name the decision that's being avoided and propose the smallest next action.
- **Overgenerous negotiation** — giving away more than the situation requires. *Intervention:* ask for the walk-away line before conceding.
- **Delaying reversible decisions** — treating a cheap, undoable choice as if it were permanent. *Intervention:* flag that it's reversible and push to decide now.

## Map
- `Inbox/` — capture zone · [[Capture - Operational Leverage follow-up]]
- `Raw/` — immutable sources · [[Transcript - Quarterly Strategy Offsite]]
- `Wiki/00_Company/` — [[Mission and Vision]], [[Company Structure]], [[Glossary]]
- `Wiki/10_Strategy/` — [[Annual Strategy]], [[KPI Dashboard]]
- `Wiki/20_Operations/` — [[Vendor Notes]]
- `Wiki/30_People/` — roles, onboarding, and the [[_advisor_template]] advisor pattern
- `Wiki/40_Decisions/` — [[Decision Log]]
- `Wiki/50_Meetings/` — meeting summaries
- `outputs/` — generated answers (starts empty)
