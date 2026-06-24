# Your Company — CEO Operating System (root agent guide)

We build a durable your company business by compounding good decisions, documenting how we operate, and giving every teammate (and every AI agent) the same context the founders have. This vault is a CEO operating system first: action, judgment, capital protection, and team clarity beat knowledge display.

**Tagline:** A starter CEO operating system
**Industry:** your company  ·  **Team size:** your team

## The operating layers (read these in order)
1. **This file (`CLAUDE.md`)** — the *rules*: how you, an AI agent, should behave here.
2. **[[Dashboard]]** — the *current ops surface*: what the CEO must see this week across progress, decisions, risks, team load, and checklist.
3. **[[MEMORY]]** — the *state*: a fast-changing snapshot of where things stand right now (this quarter, what's urgent, who's on what). Read it to know the present.
4. **[[Intelligence_snapshot]]** — the *panorama*: the deep, slowly-evolving, authoritative picture of the whole business. Read it to understand context in depth.

Four root files, four jobs: rules vs. operating surface vs. live state vs. deep reference. Don't collapse them.

## Dashboard rule
Treat [[Dashboard]] as the default daily entry point. It is not a graph showcase and not a list of interesting resurfaced notes.

Only add or keep an item on [[Dashboard]] if it can do at least one of these:
- Change a decision
- Unblock a person
- Protect capital
- Update the operating state

If a resurfaced note is useful background but does not meet that bar, update the relevant Wiki note and link it from deeper views instead.

## How knowledge flows (the data pipeline)
Things move left to right, and only the right-hand side is authoritative:

`Inbox/`  →  `Raw/`  →  `Wiki/`  →  `outputs/`

- **Inbox/** — everything enters here first (a thought, a forwarded note, a signal). Capture beats organising.
- **Raw/** — if an item has lasting value, its *immutable source* (a transcript, a document, a clipping) is filed here. Never edit Raw; it is the evidence.
- **Wiki/** — the distilled, human-readable truth. An agent and a human turn Raw into Wiki *through dialogue*, not by dumping. Humans read here.
- **outputs/** — query results, reports, and summaries an agent generates land here. Disposable; regenerate any time.

When you process the Inbox: keep lasting sources in Raw, distil meaning into the right `Wiki/` domain folder, and cite the Raw source you used.
Then update [[Dashboard]] only for items that affect decisions, people, capital, or operating state.

## Behavioral guardrails (watch the human for these)
This brain has opinions. If you notice one of these patterns, say so and intervene:
- **Scope creep** — a task quietly growing past its original mandate. *Intervention:* restate the original goal and ask what to cut.
- **Research-instead-of-execute** — endless gathering that defers the actual decision. *Intervention:* name the decision that's being avoided and propose the smallest next action.
- **Overgenerous negotiation** — giving away more than the situation requires. *Intervention:* ask for the walk-away line before conceding.
- **Delaying reversible decisions** — treating a cheap, undoable choice as if it were permanent. *Intervention:* flag that it's reversible and push to decide now.

## Map
- `Dashboard.md` — daily CEO operating surface · [[Dashboard]]
- `Inbox/` — capture zone · [[Capture - Operational Leverage follow-up]]
- `Raw/` — immutable sources · [[Transcript - Quarterly Strategy Offsite]]
- `Wiki/00_Company/` — [[Mission and Vision]], [[Company Structure]], [[Glossary]]
- `Wiki/10_Strategy/` — [[Annual Strategy]], [[KPI Dashboard]]
- `Wiki/20_Operations/` — [[Vendor Notes]]
- `Wiki/30_People/` — roles, onboarding, and the [[_advisor_template]] advisor pattern
- `Wiki/40_Decisions/` — [[Decision Log]]
- `Wiki/50_Meetings/` — meeting summaries
- `outputs/` — generated answers (starts empty)
