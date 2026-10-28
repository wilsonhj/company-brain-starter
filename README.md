# Company Brain Starter

**A company brain is your organization's shared memory — written so that both your team and an AI assistant can read it.** This starter turns that memory into a CEO operating system: a daily Dashboard, decision logs, operating rules, evidence, and example notes that help you act instead of merely browse.

Open the [`skeleton/`](skeleton/) folder in [Obsidian](https://obsidian.md) and you'll see it light up — every note links to others, so your company's knowledge becomes a living map instead of a pile of documents.

---

## Start in 3 minutes

You can use this repo in two modes:

- **No setup beyond Obsidian:** open [`skeleton/`](skeleton/) as a vault and start editing the generic company brain.
- **Personalized starter:** use your AI agent CLI + Node.js to generate a fresh vault for your industry.

Prereqs for the personalized path: any one of [Claude Code](https://claude.com/claude-code),
[OpenAI Codex](https://developers.openai.com/codex/cli), or
[Gemini CLI](https://github.com/google-gemini/gemini-cli), plus Node.js, and
[Obsidian](https://obsidian.md) if you want the graph view.

```bash
git clone https://github.com/wilsonhj/company-brain-starter.git
cd company-brain-starter
claude   # or: codex, or: gemini
```

Launch your agent from the cloned repo root so it can see the repo's command
files (`.claude/commands/`, `.codex/skills/`, `.gemini/commands/`). Then type:

```text
/brain-blueprint "your industry" <team_size> ["focus"]
```

Examples:

```text
/brain-blueprint "consumer goods" 200
/brain-blueprint healthcare 50 "multi-site clinics"
/brain-blueprint "financial services" 30 "PE fund"
```

The generated vault appears in `~/Showcase/blueprints/`. Open that folder in
Obsidian to see the graph bloom, or use the `.zip` created there to share it.

Prefer to generate into a local folder you choose?

```bash
node scripts/generate.mjs "consumer goods" 200 --out ./my-company-brain
```

That writes the vault to `./my-company-brain` and creates a shareable zip next to it in `./out/`.
The generator uses whichever of `claude`/`codex`/`gemini` it finds on your PATH
(pick one explicitly with `--cli gemini`, and optionally pin a model with `--model <id>`).

**`--out` replaces the folder you point it at.** If it already exists and has
anything in it, the generator stops and tells you rather than overwriting your
notes. Pass `--force` when you genuinely want to replace it.

If you do not use an AI agent CLI yet, open [`skeleton/`](skeleton/) in Obsidian and
start from the generic version.

---

## Why this exists

In most companies under a few hundred people, the most valuable knowledge lives in three places: the founders' heads, a buried chat history, and a graveyard of documents nobody re-opens. When someone leaves, it walks out the door. When someone joins, they spend months reconstructing it. And when you ask "why did we decide that?", nobody remembers.

A **company brain** fixes this by giving every consequential thing — your mission, your bets, your decisions, how each job is done — a single, durable home. The twist that makes it modern: it's written so an **AI agent can read it too**. Point a tool like [Claude Code](https://claude.com/claude-code), [OpenAI Codex](https://developers.openai.com/codex/cli), or [Gemini CLI](https://github.com/google-gemini/gemini-cli) at the folder and your company can suddenly *answer questions about itself*, with citations to the exact note.

This starter is built on four ideas worth understanding. None of them require any software project to adopt.

---

## Idea 1 — Knowledge flows in one direction

Most knowledge bases rot because everything is dumped in one pile and nobody trusts any of it. This brain has a **pipeline**, and only the end of the pipeline is treated as truth:

> **Inbox → Raw → Wiki → outputs**

- **`Inbox/`** — everything enters here first: a thought, a forwarded email, a meeting you just left. You capture; you don't organize. Capturing beats filing.
- **`Raw/`** — if something has lasting value, its *original source* (a meeting transcript, a contract, a clipping) is filed here and **never edited**. This is your evidence.
- **`Wiki/`** — the distilled, human-readable truth. You and the AI turn Raw material into Wiki notes **through conversation**, not by pasting. This is where people read.
- **`outputs/`** — when you ask the brain a question, the answer lands here. It's disposable — regenerate it any time.

Because the flow is explicit, everyone (and every AI agent) knows where to look: the Wiki is authoritative, Raw is the receipts, the Inbox is the to-do, and outputs are throwaway. That single rule is what keeps the brain trustworthy as it grows.

Inside `Wiki/`, notes are organized by topic — company, strategy, operations, people, decisions, meetings — so the truth is easy to navigate.

**`/steward` is what keeps the pipeline moving.** A brain that only advances when someone remembers to advance it will stall, so each vault ships a command that does the upkeep pass: triage `Inbox/` into `Raw/` and the `Wiki/`, refresh `MEMORY.md`, apply the Dashboard's admission bar, and commit the result. Run it on a schedule or by hand. It is written to be self-contained, because a scheduled run starts fresh with no memory of the last one.

It is told never to edit `Raw/`, any `AGENTS.md` (or its `CLAUDE.md` stub), or `Wiki/40_Decisions/` — it *proposes* decision notes in its run log and leaves the call to you — and to commit without pushing. Superseding a decision stays a human act; the steward is there to file evidence, not to exercise judgment.

Those limits are held in three layers, because a prompt alone is not a guarantee:

- **The instructions** in `.claude/commands/steward.md`.
- **A permission file**, `.claude/steward-settings.json`, which Claude Code enforces: it denies `git push`, `git add -A`, and edits to `Raw/`, every `AGENTS.md` and `CLAUDE.md`, `Wiki/40_Decisions/`, `.claude/`, `.codex/`, `.gemini/` and `.github/`. Run the steward by hand with `claude --settings .claude/steward-settings.json`, then `/steward`; the workflow loads it for you. It is deliberately *not* `.claude/settings.json` — a project-level deny applies to every session in the vault and cannot be overridden, so it would also stop *your* Claude from logging a decision or editing a `CLAUDE.md`.
- **A check outside the agent**, in the workflow only: before pushing, it reads what was actually committed and refuses if anything already in `Raw/`, any `AGENTS.md` or `CLAUDE.md`, `Wiki/40_Decisions/`, `.claude/`, `.codex/`, `.gemini/` or `.github/` changed. Moving new files *into* `Raw/` is allowed — that is the steward's job. A local run has no such check, so read its commit before you push it.

**To put it on a timer,** each vault also ships `.github/workflows/steward.yml`: a nightly GitHub Action that runs the steward and pushes what it committed. It is inert until you add an `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` repository secret — without one the job finishes green and does nothing, rather than failing every night. The workflow passes both secrets into the action; an empty one is ignored, so either credential is enough. Run it by hand from the Actions tab a few times before trusting the schedule. (The workflow only takes effect once the vault is its own repository; inside this starter it sits under `skeleton/` and never fires.)

---

## Idea 2 — The layered `AGENTS.md` (the part worth slowing down for)

An [`AGENTS.md`](https://agents.md) file is a short, plain-English instruction sheet that an AI agent reads **automatically** before it does anything in that folder. This starter puts one in **every** folder — and that layering is the whole trick:

| Folder | What its `AGENTS.md` tells the AI |
|---|---|
| **root** | The company's mission, how knowledge flows, and how to behave everywhere. |
| `Inbox/` | *"Everything enters here. Keep lasting sources in Raw, distil meaning into the Wiki, never let it go stale."* |
| `Wiki/40_Decisions/` | *"Every decision must record its options, owner, date, reversal conditions, linked sources, and a six-month review date. Never edit a past decision — supersede it."* |
| `Wiki/50_Meetings/` | *"One note per meeting. Capture decisions and owners, not a transcript. Cite the source transcript in Raw."* |

Because the guidance lives **next to the content**, the AI inherits your company's operating rules wherever it works — the same way a good new hire picks up "how we do things here" by sitting in the right room. You're not writing one giant prompt; you're layering small, local rules. That is what turns a folder of notes into a brain.

The root `AGENTS.md` also carries **behavioral guardrails** — a short list of patterns the AI is told to watch for and push back on (scope creep, researching instead of deciding, giving away too much in a negotiation, dithering over a decision that's easily reversible). A brain with opinions is more useful than a brain that only answers.

**Why `AGENTS.md` and not a tool-specific file?** It's the cross-tool standard, and the vault ships the small shims each tool needs so the *same* instructions work everywhere: OpenAI Codex reads `AGENTS.md` natively (including the per-folder ones); Claude Code reads it through the one-line `CLAUDE.md` stubs (`@AGENTS.md` imports) sitting next to each one; Gemini CLI is pointed at it by the included `.gemini/settings.json`. Write your rules once, and any of the three agents inherits them.

---

## Idea 3 — The Dashboard is the daily operating surface

The vault is not meant to become a knowledge display wall. The CEO starts in **`Dashboard.md`**, which shows company progress, judgment calls, risks and drift, team load, this week's checklist, and links to the deeper evidence.

The rule is strict: a surfaced note only goes on the Dashboard if it can **change a decision, unblock a person, protect capital, or update the operating state**. Otherwise it belongs in the relevant Wiki note, with evidence in Raw.

That keeps the first screen useful: it tells the CEO what needs attention now, then points to `MEMORY.md`, `Intelligence_snapshot.md`, the Decision Log, metrics, meetings, and Raw sources for depth.

---

## Idea 4 — Three layers of memory

"What's in an `AGENTS.md`, and why does it matter?" The honest answer is that one file can't do everything, so this starter splits memory into **three files at the root**, each with one job:

1. **`AGENTS.md` — the rules.** How the AI should behave. Slow-changing.
2. **`MEMORY.md` — today's state.** A one-page snapshot an agent reads *first*: this quarter's focus, what's urgent, who's on what, the latest decisions. You update it weekly.
3. **`Intelligence_snapshot.md` — the deep picture.** The authoritative, full-panorama view of the whole business. Slow-changing, comprehensive, the thing an agent reads to understand context in depth.

Rules vs. live state vs. deep reference. Keeping them separate is what lets the AI answer both *"what should I be working on right now?"* and *"how does this company actually make money?"* without confusing the two.

---

## Idea 5 — We don't give you advisors. We give you a way to build *your* advisors.

Generic AI assistants ship a fixed cast of famous names. That's a parlor trick. The real value is an AI advisor tuned to the decisions **you** actually face — so this starter ships an **advisor factory** instead of a fixed list.

- **`Wiki/30_People/_advisor_template.md`** — the schema for any advisor: when to invoke them, how they think, the exact questions they ask, how they format their answer, and — crucially — when their view is *wrong*.
- **`/build-advisor`** — a command that reads your decision log and Raw material, works out the kinds of decisions you keep making, asks you which historical figure would best advise each one, and drafts an advisor for each, following the schema.
- **`/advisor <name> <topic>`** — consults one of your advisors on a live question, in their voice and method, and proposes a decision-log entry.

Each generated brain comes with **one worked-example advisor, chosen to fit your industry**, so you can see the pattern immediately — then replace it with your own. (Open the starter and you'll find a generic operator; a generated healthcare brain might pick a public-health pioneer, a private-equity brain a famous dealmaker.)

This is the differentiated idea: *a way to build your own bench*, not a borrowed one.

---

## What's in here

```
skeleton/                      A complete generic company brain — copy it and start today
  AGENTS.md                    Root: mission, data flow, behavioral guardrails
  CLAUDE.md                    One-line stub importing AGENTS.md (Claude Code shim)
  Dashboard.md                 Daily CEO operating surface: progress, judgment, risk, load, checklist
  MEMORY.md                    Layer 2: this-quarter state snapshot (fill in the blanks)
  Intelligence_snapshot.md     Layer 3: deep-picture starter (~section prompts to expand)
  START_HERE.md                Your 30-day adoption plan (read this first)
  Inbox/                       Capture zone + sample captures        + AGENTS.md
  Raw/                         Immutable source transcripts          + AGENTS.md
  Wiki/                        The distilled truth (read here)
    00_Company/  10_Strategy/  20_Operations/                        each + AGENTS.md
    30_People/   40_Decisions/ 50_Meetings/                          each + AGENTS.md
    30_People/_advisor_template.md, _advisor_router.md, Advisor - …  the advisor factory
  outputs/                     Generated answers land here (starts empty) + AGENTS.md
  .claude/commands/            /steward, /build-advisor and /advisor for Claude Code
  .claude/steward-settings.json  Steward-only deny rules (loaded explicitly, not for every session)
  .codex/skills/               /build-advisor and /advisor for OpenAI Codex
  .gemini/commands/            … and for Gemini CLI (+ settings.json pointing it at AGENTS.md)
  .github/workflows/           steward.yml — the nightly run, off until you add a secret

scripts/                       The generator that builds personalized vaults
.claude/commands/              The /brain-blueprint command (for whoever runs the showcase)
.codex/skills/                 The same command for Codex
.gemini/commands/              … and for Gemini CLI
```

Every note links to at least two others; hub notes (Start Here, Annual Strategy, Decision Log, the memory files) link to six or more. That density is deliberate — it's what makes the graph view *bloom*, and what lets an AI hop from a question to the underlying evidence.

### The self-coaching meta-templates

Beyond the example notes, every brain ships a set of **blank templates** for working *on yourself*, not just the company. They come empty (you fill them in), but each is seeded with industry-specific prompts so you're never staring at a blank page:

- **Meeting review** (`Wiki/50_Meetings/_meeting-review-template.md`) — after any meeting, capture what was *decided*, what got *punted*, the *behavioral flags* you noticed in yourself, and how it compared to the last meeting of its kind.
- **Communication style profile** (`Wiki/30_People/Your Profile.md`) — record how you actually want to sound to each audience (board, team, customers…), so the AI can speak in your voice.
- **Goal alignment** (`Wiki/10_Strategy/_goal-alignment-template.md`) — every two weeks, line up your declared OKRs against where your time actually went, score the gap, and adjust.
- **Advisor factory** (`Wiki/30_People/_advisor_template.md` + `/build-advisor`) — build a bench of AI advisors tuned to the decisions you keep facing.

Together these are the "depth surface area": the brain doesn't just remember the company, it helps you run yourself.

---

## The 30-day plan (no software project required)

You don't roll this out. You build one small habit per week. The full version lives in [`skeleton/START_HERE.md`](skeleton/START_HERE.md):

- **Week 1 — Capture meetings only.** After each meeting, drop the notes into `Inbox/`. Don't organize. Just build the habit of writing it down.
- **Week 2 — Add the decision log.** Each real choice gets a note: options, what you picked, who owns it, what would reverse it, when to review it. Five minutes each.
- **Week 3 — Wire up an AI agent.** Open the folder in Claude Code, OpenAI Codex, or Gemini CLI. It reads every `AGENTS.md` automatically, so it already knows how your company works. Ask it to process your week's Inbox into the Wiki.
- **Week 4 — Ask your company a question, and build an advisor.** *"Why did we choose our lead vendor?"* comes back with links to the exact notes. Then run `/build-advisor` to create an advisor tuned to your decisions.

---

## Two ways to use this repo

**1. Start from the generic skeleton (free, now).**
Clone this repo, open [`skeleton/`](skeleton/) in Obsidian as a vault, and start replacing the example notes with your own. Everything — the data-flow structure, the layered `AGENTS.md` files, the memory triad, the advisor factory, the 30-day plan — is yours to keep.

**2. Generate a personalized starter.**
If you have [Claude Code](https://claude.com/claude-code), [OpenAI Codex](https://developers.openai.com/codex/cli), or [Gemini CLI](https://github.com/google-gemini/gemini-cli), this repo ships a command that builds a starter vault tailored to *your* industry in under a minute:

```
/brain-blueprint "consumer goods" 200
/brain-blueprint healthcare 50 "multi-site clinics, US"
/brain-blueprint "financial services" 30 "PE fund"
```

It writes a fresh, industry-flavored vault (40+ interlinked notes, every folder's `AGENTS.md` written for your context, a memory triad seeded with plausible state, and an industry-fit advisor) to `~/Showcase/blueprints/` and zips it up to hand over. Open it in Obsidian and watch the graph fill in from nothing.

---

## Adapting it to your industry (the demo is just an example)

If you saw this at a live demo, the showcase vault was a six-person **mining exploration** company running an eight-country portfolio. That story is a worked example, nothing more — the architecture is deliberately industry-neutral. Here is exactly what changes for your industry, and what never does.

**Changes with your industry — and `/brain-blueprint` re-seeds all of it automatically:**

- Company name, role titles, KPI names, and glossary terms across the sample notes
- The decision topics in `Wiki/40_Decisions/` (a clinic chain debates site openings; a PE fund debates exits; an exploration company debates country entries)
- The stakeholder list in `Wiki/30_People/Your Profile.md` (communication style profile)
- The OKR prompts in `Wiki/10_Strategy/_goal-alignment-template.md`
- The worked-example advisor (healthcare → a public-health pioneer; private equity → a famous dealmaker)

**Never changes, in any industry:**

- The one-way flow: `Inbox → Raw → Wiki → outputs`
- The operating root: `AGENTS.md` = rules, `Dashboard.md` = daily surface, `MEMORY.md` = current state, `Intelligence_snapshot.md` = deep picture
- The layered per-folder `AGENTS.md` pattern
- The self-coaching templates and the advisor factory
- The 30-day adoption plan

**Adapting the skeleton by hand (~15 minutes, no generation needed):**

1. Rewrite `Wiki/00_Company/` for your business — mission, business model, org.
2. Replace the sample decisions in `Wiki/40_Decisions/` with two real ones from your own history, keeping the schema: options, owner, reversal conditions, review date.
3. Put your real audiences (board, team, customers, regulators…) into `Wiki/30_People/Your Profile.md`.
4. Rewrite the behavioral guardrails in the root `AGENTS.md` to *your* failure modes — those are personal, not industry-bound.
5. Run `/build-advisor` and let it propose advisors from your actual decision log.

Rule of thumb: **content is industry-specific; structure is not.** If you find yourself wanting to change the folder structure or the memory triad for your industry, you're probably re-solving a problem the pipeline already solves.

---

## How it's built (for the technically curious)

The generator is intentionally **template-first and LLM-light**, because speed matters — a personalized vault must appear in under a minute.

- **One AI call, not forty.** A single agent-CLI call returns *only* the industry-specific substitutions (company name, role titles, decision topics, KPI names, glossary terms, a state snapshot, the panorama's section headers, and one industry-fit advisor) as compact JSON. No per-note AI calls.
- **The templates do the writing.** A Node script weaves those substitutions into 40+ notes and cross-links them deterministically, so link density and structure are guaranteed regardless of what the model returns.
- **It never hard-fails.** If the AI call is slow or returns malformed JSON, a built-in generic dataset takes over and the vault still generates instantly — important when you're generating live in front of someone on a phone hotspot. The call's timeout sits *below* the 60-second budget, so even a worst-case slow response falls back rather than blowing the deadline.
- **A speed detail that matters.** For structured substitution the model doesn't need to "think out loud," so where a CLI supports it the extraction call runs with extended thinking disabled (Claude Code: `MAX_THINKING_TOKENS=0`) — turning it off roughly halves the wall-clock time, the difference between comfortably under a minute and not.
- **Why Node (plain ESM), not Python or TypeScript?** The task is "copy ~77 files + one CLI call + zip." Node has a fast cold start, is already installed alongside every major agent CLI, and plain `.mjs` needs **no build step** — nothing between "run" and "done." The AI call dominates wall time; the file work is instant.
- **Why a CLI (not a provider SDK)?** The generator shells out to whichever agent CLI you already use — `claude`, `codex`, or `gemini` — so it rides your existing authentication and default model. No API key to manage, no provider lock-in; `--cli` and `--model` override the defaults when you want to.

Typical generation: **40–45 seconds**, 77 files, ~360 wikilinks, zero unresolved links, zero placeholder text.

---

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, make your company smarter.
