# Company Brain Starter

**A company brain is your organization's shared memory — written so that both your team and an AI assistant can read it.** This starter turns that memory into a CEO operating system: a daily Dashboard, decision logs, operating rules, evidence, and example notes that help you act instead of merely browse.

Open the [`skeleton/`](skeleton/) folder in [Obsidian](https://obsidian.md) to explore the linked example notes, Dashboard, and folder-level agent guidance. The contents are sample material to replace with your own company evidence.

---

## Current status

The generic vault and offline generator work today. A check of `main` at `c685631` on 2026-11-09 produced **77 files, 47 content notes and 364 wikilinks, with zero unresolved wikilinks**, plus a valid ZIP archive, using `--no-llm`. The offline regression script passed. These are results for the tested generic dataset, not a guarantee for every model response or future edit.

Live Claude generation and the scheduled steward were not exercised in that check. The steward's guarded-path test currently fails its 15 denial cases on macOS with BSD `awk`; see [Validation and known limits](#validation-and-known-limits). [PR #8](https://github.com/wilsonhj/company-brain-starter/pull/8) is open with generator, automation and Linux CI changes; those fixes are not on `main`.

## Quick start

**Use the generic vault:** clone this repository and open [`skeleton/`](skeleton/) as an Obsidian vault. No AI CLI is needed.

**Generate an offline demo:** install Node.js, then run:

```bash
git clone https://github.com/wilsonhj/company-brain-starter.git
cd company-brain-starter
node scripts/generate.mjs "software" 10 --out ./demo-company-brain --no-llm --no-open
```

This writes a generic starter with the supplied industry and team size, without a model call or opening an application. Open `./demo-company-brain` in Obsidian and start at `Dashboard.md`. The default archive is written under `./out/`; the system `zip` command is required. Add `--no-zip` to skip archive creation.

Use a new output folder for each run. If an explicit `--out` path is a file or a non-empty directory, the generator refuses to replace it. `--force` removes that protection and replaces the folder and its contents.

**Optional model personalization:** use an installed, authenticated agent CLI:

```bash
node scripts/generate.mjs "healthcare" 50 "multi-site clinics" --cli claude --out ./clinic-brain --no-open
```

Supported generator adapters are `--cli claude`, `--cli codex` and `--cli gemini`. Without `--cli`, detection checks them in that order on `PATH`; `BRAIN_CLI` also selects one. `--model <id>` or `BRAIN_MODEL` pins a model, which must match the selected CLI on current `main`. The adapter uses the CLI's existing authentication and may consume its usage allowance. The summary's **Source** identifies whether model output or fallback data was used.

The repository also supplies interactive wrappers. Launch the relevant CLI from the cloned repository root:

| CLI | Blueprint invocation | Repository definition |
|---|---|---|
| Claude Code | `/brain-blueprint "software" 10` | [`.claude/commands/brain-blueprint.md`](.claude/commands/brain-blueprint.md) |
| Codex | `$brain-blueprint "software" 10` | [`.agents/skills/brain-blueprint/SKILL.md`](.agents/skills/brain-blueprint/SKILL.md) |
| Gemini CLI | `/brain-blueprint "software" 10` | [`.gemini/commands/brain-blueprint.toml`](.gemini/commands/brain-blueprint.toml) |

Without an explicit `--out`, generated vaults go to `~/Showcase/blueprints/`, with archives in its `out/` folder. Obsidian auto-opening is attempted on macOS unless `--no-open` is set. For a presentation, prepare an offline vault first; model latency and personalization are optional.

---

## Why this exists

In most companies under a few hundred people, the most valuable knowledge lives in three places: the founders' heads, a buried chat history, and a graveyard of documents nobody re-opens. When someone leaves, it walks out the door. When someone joins, they spend months reconstructing it. And when you ask "why did we decide that?", nobody remembers.

A **company brain** fixes this by giving every consequential thing — your mission, your bets, your decisions, how each job is done — a single, durable home. The twist that makes it modern: it's written so an **AI agent can read it too**. Point a tool like [Claude Code](https://claude.com/claude-code), [OpenAI Codex](https://developers.openai.com/codex/cli), or [Gemini CLI](https://github.com/google-gemini/gemini-cli) at the folder and your company can suddenly *answer questions about itself*, with citations to the exact note.

This starter is built on five ideas worth understanding. None of them require any software project to adopt.

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

**`/steward` is the Claude Code upkeep command.** A brain that only advances when someone remembers to advance it will stall, so each vault ships a command that does the upkeep pass: triage `Inbox/` into `Raw/` and the `Wiki/`, refresh `MEMORY.md`, apply the Dashboard's admission bar, and commit the result. Run it on a schedule or by hand. It is written to be self-contained, because a scheduled run starts fresh with no memory of the last one.

The generated vault supplies `/steward` for Claude Code only. Codex and Gemini receive advisor commands, but no steward command or equivalent steward permission enforcement.

It is told never to edit existing files in `Raw/`, any `AGENTS.md` (or its `CLAUDE.md` stub), or `Wiki/40_Decisions/` — it *proposes* decision notes in its run log and leaves the call to you — and to commit without pushing. Superseding a decision stays a human act; the steward is there to file evidence, not to exercise judgment.

The Claude steward has three intended controls. They do not apply to ordinary Codex or Gemini sessions:

- **The instructions** in `.claude/commands/steward.md`.
- **A permission file**, `.claude/steward-settings.json`, which Claude Code enforces: it denies `git push`, `git add -A`, and edits to every `AGENTS.md` and `CLAUDE.md`, `Wiki/40_Decisions/`, `.agents/`, `.claude/`, `.codex/`, `.gemini/` and `.github/`. It deliberately does not deny `Raw/`, because a deny there also blocks moving a source *into* `Raw/` — found on the first real run. So the permission file cannot stop a change to or a deletion of an existing `Raw/` file: the instructions forbid it, and the workflow check below rejects such a commit before it pushes. Run the steward by hand with `claude --settings .claude/steward-settings.json`, then `/steward`; the workflow loads it for you. It is deliberately *not* `.claude/settings.json` — a project-level deny applies to every session in the vault and cannot be overridden, so it would also stop *your* Claude from logging a decision or editing a `CLAUDE.md`.
- **A check outside the agent**, in the workflow only: before pushing, it reads the committed diff and is intended to reject changes to anything already in `Raw/`, any `AGENTS.md` or `CLAUDE.md`, `Wiki/40_Decisions/`, `.agents/`, `.claude/`, `.codex/`, `.gemini/` or `.github/`. Moving new files *into* `Raw/` is allowed — that is the steward's job. A local run has no such check, so read its commit before you push it.

**Automation is a template, not an active service.** Each vault includes [`.github/workflows/steward.yml`](skeleton/.github/workflows/steward.yml), scheduled nightly on Ubuntu. It only becomes an active workflow after the generated vault is committed as its own GitHub repository with the workflow at that repository's root. Here it lives under `skeleton/` and does not run.

The workflow requires an `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` repository secret; without one it exits successfully without running the steward. On current `main`, the Claude action is not passed an explicit workflow `GITHUB_TOKEN`, so additional GitHub App setup may be needed. [PR #8](https://github.com/wilsonhj/company-brain-starter/pull/8) proposes passing that token; it is not merged, and removal of the App requirement still needs a real workflow run. Review credentials and repository access, then exercise manual runs before relying on the schedule.

The guard uses NUL-separated `awk` parsing. Its regression test fails on the tested macOS BSD `awk`, although PR #8's Ubuntu CI passes. Local steward sessions do not run this pre-push check automatically: inspect their commits before pushing.

---

## Idea 2 — The layered `AGENTS.md` (the part worth slowing down for)

An [`AGENTS.md`](https://agents.md) file is a short, plain-English instruction sheet for an AI agent working in that folder. Automatic discovery varies by CLI; the root guide explicitly requires reading applicable folder guides before working there. This starter puts one in **every** folder — and that layering is the whole trick:

| Folder | What its `AGENTS.md` tells the AI |
|---|---|
| **root** | The company's mission, how knowledge flows, and how to behave everywhere. |
| `Inbox/` | *"Everything enters here. Keep lasting sources in Raw, distil meaning into the Wiki, never let it go stale."* |
| `Wiki/40_Decisions/` | *"Every decision must record its options, owner, date, reversal conditions, linked sources, and a six-month review date. Never edit a past decision — supersede it."* |
| `Wiki/50_Meetings/` | *"One note per meeting. Capture decisions and owners, not a transcript. Cite the source transcript in Raw."* |

Because the guidance lives **next to the content**, the agent can read the company's operating rules for the folder it is working in — the same way a good new hire picks up "how we do things here" by sitting in the right room. You're not writing one giant prompt; you're layering small, local rules. That is what turns a folder of notes into a brain.

The root `AGENTS.md` also carries **behavioral guardrails** — a short list of patterns the AI is told to watch for and push back on (scope creep, researching instead of deciding, giving away too much in a negotiation, dithering over a decision that's easily reversible). A brain with opinions is more useful than a brain that only answers.

**Why `AGENTS.md` and not a tool-specific file?** It's the cross-tool standard, and the vault ships the small shims each tool needs so the *same* instructions work everywhere: OpenAI Codex reads `AGENTS.md` natively along the project-root-to-launch-directory path; the root guide instructs it to read applicable descendant guides before working there; Claude Code reads it through the one-line `CLAUDE.md` stubs (`@AGENTS.md` imports) sitting next to each one; Gemini CLI is pointed at it by the included `.gemini/settings.json`. Keep the rules in one place, and require the agent to read the guides that apply to each folder. Do not assume launching from the vault root loads every descendant guide.

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

Each generated brain comes with **one worked-example advisor**; model-personalized generation can choose one to fit your industry, so you can see the pattern immediately — then replace it with your own. (Open the starter and you'll find a generic operator; a generated healthcare brain might pick a public-health pioneer, a private-equity brain a famous dealmaker.)

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
  .agents/skills/              build-advisor and advisor for OpenAI Codex ($build-advisor, $advisor)
  .gemini/commands/            … and for Gemini CLI (+ settings.json pointing it at AGENTS.md)
  .github/workflows/           steward.yml — the nightly run, off until you add a secret

scripts/                       The generator that builds personalized vaults
.claude/commands/              The /brain-blueprint command (for whoever runs the showcase)
.agents/skills/                The same command for Codex
.gemini/commands/              … and for Gemini CLI
```

The templates link content notes to related notes and give hub notes several routes into the vault. This helps people and agents move from a question to supporting evidence. The generator reports wikilink counts but does not detect unresolved links; check that model-generated note titles and links resolve before sharing a vault.

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
- **Week 3 — Wire up an AI agent.** Open the folder in Claude Code, Codex, or Gemini CLI. Have it read the root guide and the applicable descendant `AGENTS.md` files before processing your week's Inbox into the Wiki; discovery differs by CLI.
- **Week 4 — Ask your company a question, and build an advisor.** *"Why did we choose our lead vendor?"* comes back with links to the exact notes. Then run `/build-advisor` to create an advisor tuned to your decisions.

---

## Two ways to use this repo

**1. Start from the generic skeleton (free, now).**
Clone this repo, open [`skeleton/`](skeleton/) in Obsidian as a vault, and start replacing the example notes with your own. Everything — the data-flow structure, the layered `AGENTS.md` files, the memory triad, the advisor factory, the 30-day plan — is yours to keep.

**2. Generate a personalized starter.**
If you have [Claude Code](https://claude.com/claude-code), [OpenAI Codex](https://developers.openai.com/codex/cli), or [Gemini CLI](https://github.com/google-gemini/gemini-cli), this repo ships a command that requests industry-specific substitutions and builds a starter vault:

```
/brain-blueprint "consumer goods" 200
/brain-blueprint healthcare 50 "multi-site clinics, US"
/brain-blueprint "financial services" 30 "PE fund"
```

It writes a fresh vault of interlinked sample notes to `~/Showcase/blueprints/` by default and creates a ZIP unless disabled. A successful model response supplies industry-flavored content; fallback and `--no-llm` runs use generic examples. The seeded state, metrics and decisions are fictional, not evidence about your company. Replace them before using the vault operationally. In Codex, use `$brain-blueprint` for the examples above.

---

## Adapting it to your industry (the demo is just an example)

If you saw this at a live demo, the showcase vault was a six-person **mining exploration** company running an eight-country portfolio. That story is a worked example, nothing more — the architecture is deliberately industry-neutral. Here is exactly what changes for your industry, and what never does.

**Fields model-personalized generation can seed for your industry:**

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

The generator is **template-first and LLM-light**:

- **One optional CLI call.** It requests compact JSON substitutions, rather than making one model call per note. `--no-llm` skips that call entirely.
- **Templates write the files.** Plain Node.js ESM generates the folders, notes, commands and workflow. There is no build step.
- **Fallback handles some model failures.** Missing CLIs, a failed invocation, timeout or JSON parsing error can select generic data. The CLI timeout is 56 seconds; this is not a guarantee that the whole run finishes within a minute. Invalid nested model data, filesystem errors and missing archive tools can still fail generation.
- **Output remains inspectable.** The summary reports the data source, files, note/link counts, output path and archive path. It does not check unresolved links. Model-provided names can affect links; validate the generated vault before sharing it.

### CLI scope

The generator has adapters for Claude Code, Codex and Gemini. Generated vaults include `build-advisor` and `advisor` definitions for all three: slash commands for Claude/Gemini and `$build-advisor` / `$advisor` skills for Codex. **The upkeep steward and its permission settings are Claude Code only.** Shared Markdown instructions do not make tool-specific permissions portable.

### Validation and known limits

From the repository root:

```bash
node --check scripts/generate.mjs
python3 scripts/test-generator.py
bash scripts/test-steward-guard.sh
```

The Python regression script requires Python 3.11+ and Node.js. It uses a stub Gemini executable, checks serialized command prompts and folder guidance, and compares a regenerated generic skeleton with committed templates after normalizing dates. It does not call a live model.

At `main` revision `c685631`, the generator regression passed during the 2026-11-09 readiness check. The steward guard test passed its three allowed-change cases but failed all 15 denial cases on macOS with BSD `awk`. That local guard is not verified safe on that platform. [PR #8's Ubuntu CI](https://github.com/wilsonhj/company-brain-starter/actions/runs/41330325050) passed its syntax and guard checks; it is evidence for that Linux PR run, not for current-main macOS behavior.

[PR #8](https://github.com/wilsonhj/company-brain-starter/pull/8) remains open. Its proposed changes include balanced JSON extraction from CLI output, model/CLI compatibility handling, explicit workflow-token wiring and a root CI workflow. Current `main` still uses first/last-brace JSON slicing and selects a CLI independently of a pinned model. Use the explicit matching `--cli` and `--model` options, or omit the model pin. Live CLI generation and automated stewardship need separate validation.

### Relationship to Custom Agent Harness

[Custom Agent Harness](https://github.com/wilsonhj/custom-agent-harness) is a separate runtime project. A possible future boundary is for a harness to execute work using a Company Brain vault as shared context. This repository does not currently contain that integration, and its generator or steward does not use the custom harness.

### Attribution

This fork builds on the MIT-licensed [Company Brain Starter by spacegeologist](https://github.com/spacegeologist/company-brain-starter). The original starter supplies the vault and template-first approach; this fork extends the operating Dashboard, agent guidance, generator checks and stewardship work. Retain the upstream license and contributor attribution when reusing it.

---

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, make your company smarter.

