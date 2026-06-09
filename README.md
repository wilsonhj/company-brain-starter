# Company Brain Starter

**A company brain is your organization's shared memory — written so that both your team and an AI assistant can read it.** This repository is a ready-to-use starter: a folder structure, a set of example notes, and a 30-day plan to make it a habit.

Open the [`skeleton/`](skeleton/) folder in [Obsidian](https://obsidian.md) and you'll see it light up — every note links to others, so your company's knowledge becomes a living map instead of a pile of documents.

---

## Why this exists

In most companies under a few hundred people, the most valuable knowledge lives in three places: the founders' heads, a buried chat history, and a graveyard of documents nobody re-opens. When someone leaves, it walks out the door. When someone joins, they spend months reconstructing it. And when you ask "why did we decide that?", nobody remembers.

A **company brain** fixes this by giving every consequential thing — your mission, your bets, your decisions, how each job is done — a single, durable home. The twist that makes it modern: it's written so an **AI agent can read it too**. Point a tool like [Claude Code](https://claude.com/claude-code) at the folder and your company can suddenly *answer questions about itself*, with citations to the exact note.

---

## The key idea: a layered `CLAUDE.md`

This is the part worth slowing down for.

A `CLAUDE.md` file is a short, plain-English instruction sheet that an AI agent reads **automatically** before it does anything in that folder. This repo puts one in **every** folder — and that layering is the whole trick:

| Folder | What its `CLAUDE.md` tells the AI |
|---|---|
| **root** | The company's mission, and how to behave across the whole vault. |
| `40_Decisions/` | *"Every decision must record the options considered, a single owner, and what would make us reverse it. Never edit a past decision — supersede it."* |
| `50_Meetings/` | *"One note per meeting. Capture decisions and owners, not a transcript. File any decision into the decision log and link it both ways."* |
| `90_Inbox/` | *"Anything unsorted lands here first. Here are the triage rules for sorting it."* |

Because the guidance lives **next to the content**, the AI inherits your company's operating rules wherever it works — the same way a good new hire would pick up "how we do things here" by sitting in the right room. You're not writing one giant prompt; you're layering small, local rules. That is what turns a folder of notes into a brain.

---

## What's in here

```
skeleton/            A complete generic company brain you can copy and start using today
  CLAUDE.md          Root: company context + how agents should use the vault
  START_HERE.md      Your 30-day adoption plan (read this first)
  00_Company/        Mission, structure, glossary            + CLAUDE.md
  10_Strategy/       Annual strategy, bets, risks, KPIs       + CLAUDE.md
  20_Operations/     Playbooks, SOPs, vendor notes            + CLAUDE.md
  30_People/         Roles, onboarding, 1-on-1 template       + CLAUDE.md
  40_Decisions/      Decision log, one note per decision      + CLAUDE.md
  50_Meetings/       Meeting summaries, auto-filed            + CLAUDE.md
  90_Inbox/          Capture zone + agent triage rules        + CLAUDE.md

scripts/             The generator that builds personalized vaults
.claude/commands/    The /brain-blueprint slash command for Claude Code
```

Every note in the skeleton links to at least two others; the hub notes (Start Here, Annual Strategy, Decision Log) link to six or more. That density is deliberate — it's what makes the graph view *bloom* and what lets an AI hop from a question to the underlying evidence.

---

## The 30-day plan (no software project required)

You don't roll this out. You build one small habit per week. The full version lives in [`skeleton/START_HERE.md`](skeleton/START_HERE.md):

- **Week 1 — Capture meetings only.** After each meeting, drop a few bullets into `50_Meetings/`. Don't organize. Just build the habit of writing it down.
- **Week 2 — Add the decision log.** Each real choice gets a note: the options, what you picked, who owns it, what would reverse it. Five minutes each.
- **Week 3 — Wire up Claude Code.** Point it at the folder. It reads every `CLAUDE.md` automatically, so it already knows how your company works.
- **Week 4 — Ask your company a question.** *"Why did we choose our main vendor?"* The answer comes back with links to the exact notes. That's the payoff.

---

## Two ways to use this repo

**1. Start from the generic skeleton (free, now).**
Download or clone this repo, open [`skeleton/`](skeleton/) in Obsidian as a vault, and start replacing the example notes with your own. Everything — the structure, the layered `CLAUDE.md` files, the 30-day plan — is yours to keep.

**2. Generate a personalized starter.**
If you have [Claude Code](https://claude.com/claude-code), this repo ships a slash command that builds a starter vault tailored to *your* industry in under a minute:

```
/brain-blueprint "consumer goods" 200
/brain-blueprint healthcare 50 "multi-site clinics, US"
/brain-blueprint "financial services" 30 "PE fund"
```

It writes a fresh, industry-flavored vault (35 interlinked notes, every folder's `CLAUDE.md` written for your context) to `~/Showcase/blueprints/` and zips it up to hand over. Open it in Obsidian and watch the graph fill in from nothing.

---

## How it's built (for the technically curious)

The generator is intentionally **template-first and LLM-light**, because speed matters — a personalized vault must appear in under a minute.

- **One AI call, not thirty.** A single [Claude Haiku](https://claude.com/claude-code) call returns *only* the industry-specific substitutions (company name, role titles, decision topics, KPI names, glossary terms) as compact JSON. No per-note AI calls. We disable extended thinking for this extraction (`MAX_THINKING_TOKENS=0`) — it isn't needed for structured substitution and cutting it takes the call from ~45s to ~20s.
- **The templates do the writing.** A Node script weaves those substitutions into 35 notes and cross-links them deterministically, so link density and structure are guaranteed regardless of what the model returns.
- **It never hard-fails.** If the AI call times out or returns malformed JSON, a built-in generic dataset takes over — important when you're generating live in front of someone on a phone hotspot.
- **Why Node (plain ESM), not Python or TypeScript?** The task is "copy ~40 files + one API call + zip." Node has a fast cold start, ships with macOS-friendly tooling, is native to the Claude Code ecosystem, and plain `.mjs` needs **no build step** — so there's nothing between "run" and "done." The AI call dominates wall time anyway; the file work is instant.
- **Why Claude (not another provider)?** This is a Claude Code command, so it uses your existing Claude authentication — no extra API key to manage — and Haiku is the right latency/quality trade for short structured extraction.

Typical generation: **20–30 seconds**, 43 files, ~270 wikilinks, zero unresolved links, zero placeholder text.

---

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, make your company smarter.
