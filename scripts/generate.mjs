#!/usr/bin/env node
// brain-blueprint generator
// Template-first, LLM-light: copies a skeleton instantly, makes ONE Claude call
// for industry-specific substitutions, then weaves 30+ densely-interlinked notes.
//
// Usage:
//   node scripts/generate.mjs "<industry>" <team_size> ["one-line focus"]
//   node scripts/generate.mjs --skeleton            # build the generic repo skeleton
//
// Requires: the `claude` CLI on PATH (uses the user's existing auth) and `zip`.
// If the LLM call fails for any reason, a deterministic fallback dataset is used
// so a live demo can never hard-fail.

import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const t0 = Date.now();

// ----------------------------------------------------------------------------
// args
// ----------------------------------------------------------------------------
const argv = process.argv.slice(2);
const SKELETON = argv.includes("--skeleton");
const NO_LLM = argv.includes("--no-llm") || SKELETON;
const NO_ZIP = argv.includes("--no-zip") || SKELETON;
const positional = argv.filter((a) => !a.startsWith("--"));

let industry, teamSize, focus;
if (SKELETON) {
  industry = "your company";
  teamSize = "your team";
  focus = "";
} else {
  industry = positional[0];
  teamSize = positional[1];
  focus = positional.slice(2).join(" ").trim();
  if (!industry || !teamSize) {
    console.error(
      'Usage: node scripts/generate.mjs "<industry>" <team_size> ["one-line focus"]'
    );
    process.exit(1);
  }
}

const slug = String(industry)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

const SHOWCASE = join(homedir(), "Showcase", "blueprints");
const outDir = SKELETON
  ? join(process.cwd(), "skeleton")
  : join(SHOWCASE, `${stamp()}_${slug}`);
const zipDir = join(SHOWCASE, "out");

// ----------------------------------------------------------------------------
// 1. data: one LLM call -> structured substitutions  (with safe fallback)
// ----------------------------------------------------------------------------
function fallbackData() {
  const ind = String(industry).replace(/\b\w/g, (c) => c.toUpperCase());
  const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    company_name: SKELETON ? "Your Company" : `${ind} Holdings`,
    tagline: SKELETON
      ? "A starter company brain"
      : `Operating company in ${industry}`,
    mission: `We build a durable ${industry} business by compounding good decisions, documenting how we operate, and giving every teammate (and every AI agent) the same context the founders have.`,
    glossary: [
      { term: "Company Brain", def: "The single source of truth for how we think, decide, and operate." },
      { term: "Decision Log", def: "A dated record of every consequential choice and why we made it." },
      { term: "Playbook", def: "A repeatable procedure a new hire can follow without supervision." },
      { term: "Owner", def: "The single person accountable for a decision, bet, or risk." },
      { term: "Bet", def: "A deliberate, time-boxed wager of resources against a thesis." },
      { term: "North Star", def: "The one metric that best proxies durable value creation." },
      { term: "Reversal Condition", def: "The signal that tells us to undo a decision." },
      { term: "Capture", def: "Getting a thought, meeting, or signal into the Inbox before it is lost." },
    ],
    departments: ["Leadership", "Operations", "Commercial", "Finance", "People"],
    roles: [
      { title: "Founder / CEO", mandate: "Sets strategy, allocates capital, owns the highest-leverage decisions." },
      { title: "Head of Operations", mandate: "Turns strategy into repeatable playbooks and keeps delivery on time." },
      { title: "Commercial Lead", mandate: "Owns revenue: pipeline, pricing, and key customer relationships." },
      { title: "Finance Lead", mandate: "Owns the model, cash runway, and the numbers behind every bet." },
    ],
    bets: [
      { name: "Operational Leverage", thesis: "Document every process so the team can double output without doubling headcount." },
      { name: "Premium Positioning", thesis: "Win on quality and trust rather than competing on price." },
      { name: "AI-Native Operations", thesis: "Give agents the same context as staff so routine work runs itself." },
      { name: "Disciplined Expansion", thesis: "Enter one new market at a time, only after the core is profitable." },
    ],
    risks: [
      { name: "Key-Person Dependency", exposure: "Too much context lives only in the founders' heads.", mitigation: "Write it down weekly; the brain is the backup." },
      { name: "Margin Compression", exposure: "Input costs rise faster than we can reprice.", mitigation: "Track unit economics monthly; reprice on a schedule." },
      { name: "Overextension", exposure: "Growing in too many directions at once.", mitigation: "One bet at a time, with explicit reversal conditions." },
    ],
    kpis: [
      { name: "Revenue Run-Rate", target: "Grow 20% quarter over quarter" },
      { name: "Gross Margin", target: "Hold above 45%" },
      { name: "Cash Runway", target: "Never below 9 months" },
      { name: "Decisions Logged", target: "100% of consequential decisions captured" },
      { name: "Time-to-Onboard", target: "New hire productive within 14 days" },
      { name: "Customer Retention", target: "Net retention above 100%" },
    ],
    playbooks: [
      { title: "Weekly Operating Rhythm", steps: ["Monday metrics review", "Mid-week unblock standup", "Friday decision + retro"] },
      { title: "Hiring and Onboarding", steps: ["Define the mandate", "Structured interview loop", "First-14-days plan in the brain"] },
      { title: "Vendor Selection", steps: ["Write the requirement", "Shortlist three", "Pilot, then commit with a reversal clause"] },
      { title: "Incident Response", steps: ["Stabilise", "Communicate", "Write the post-mortem into the Decision Log"] },
    ],
    vendors: [
      { name: "Primary Banking Partner", category: "Finance", use: "Operating accounts and treasury." },
      { name: "Core Operations Platform", category: "Operations", use: "System of record for daily delivery." },
      { name: "People / Payroll Provider", category: "People", use: "Payroll, benefits, and compliance." },
      { name: "Analytics Stack", category: "Data", use: "Single dashboard feeding the KPI review." },
    ],
    decisions: [
      { title: "Adopt a Written Decision Log", context: "Decisions were made in chat and forgotten.", options: ["Keep deciding ad hoc", "Use a spreadsheet", "Use one note per decision in the brain"], choice: "One note per decision in the brain", rationale: "Searchable, linkable, and readable by AI agents.", reversal: "Revisit if the team finds logging slows them down for two sprints." },
      { title: "Standardise on a Single Operating Platform", context: "Three tools held overlapping data.", options: ["Keep all three", "Build in-house", "Consolidate onto one platform"], choice: "Consolidate onto one platform", rationale: "Lower cost and one source of truth.", reversal: "Reverse if the platform raises prices above budget." },
      { title: "Hold Cash Runway Above Nine Months", context: "Growth spending was outpacing revenue.", options: ["Spend to grow faster", "Hold 6 months", "Hold 9 months minimum"], choice: "Hold 9 months minimum", rationale: "Buys time to recover from one bad quarter.", reversal: "Loosen only after two profitable quarters." },
      { title: "Enter One New Market First", context: "Two expansion options on the table.", options: ["Both at once", "Neither yet", "The adjacent market first"], choice: "The adjacent market first", rationale: "Reuses existing playbooks; lower risk.", reversal: "Pause if the core market growth dips below target." },
      { title: "Wire Up an AI Company Brain", context: "Context lived in people's heads.", options: ["Hire more coordinators", "Buy a wiki", "Build an AI-readable brain with layered CLAUDE.md"], choice: "Build an AI-readable brain with layered CLAUDE.md", rationale: "Agents and humans share one context.", reversal: "Reassess if maintenance exceeds the time it saves." },
    ],
    meetings: [
      { title: "Quarterly Strategy Offsite", type: "Strategy", attendees: ["Founder / CEO", "Head of Operations", "Finance Lead"], notes: "Reviewed the annual bets and reset KPI targets for the quarter." },
      { title: "Weekly Operating Review", type: "Operations", attendees: ["Head of Operations", "Commercial Lead"], notes: "Walked the dashboard; agreed to consolidate onto one operating platform." },
      { title: "Finance and Runway Check", type: "Finance", attendees: ["Founder / CEO", "Finance Lead"], notes: "Confirmed the nine-month runway floor and the repricing schedule." },
      { title: "Market Expansion Working Session", type: "Strategy", attendees: ["Founder / CEO", "Commercial Lead"], notes: "Chose the adjacent market and named reversal conditions." },
    ],
    inbox_rules: [
      "Anything unfiled lands here first — capture beats organising.",
      "If it is a decision, an agent moves it to 40_Decisions and links the bet it serves.",
      "If it is a meeting, file under 50_Meetings and link any decisions made.",
      "If it names a metric, link it to the KPI Dashboard.",
      "Review and empty the Inbox every Friday.",
    ],
  };
}

function buildPrompt() {
  const focusLine = focus ? ` Focus: ${focus}.` : "";
  // LLM-light: ask ONLY for short industry-specific substitutions (names, titles,
  // terse phrases). The templates write the prose. Minified output keeps it fast.
  return `Generate industry-specific substitutions for a fictional but realistic company.
Industry: ${industry}. Team size: ${teamSize}.${focusLine}

Reply with MINIFIED JSON ON ONE LINE (no newlines, no markdown fence, no commentary). Every value concrete and specific to this industry — NEVER "lorem", "TODO", or placeholders. Respect the word caps to stay terse.

Keys and exact array lengths:
company_name(str), tagline(str,<=8 words),
glossary:8 of {term,def<=10w}, departments:5 of str,
roles:4 of {title,mandate<=10w}, bets:4 of {name,thesis<=12w},
risks:3 of {name,exposure<=9w,mitigation<=9w}, kpis:6 of {name,target<=6w},
playbooks:4 of {title,steps:3 of str<=8w}, vendors:4 of {name,category,use<=8w},
decisions:5 of {title,context<=12w,options:3 of str<=6w,choice<=8w,rationale<=12w,reversal<=12w},
meetings:4 of {title,type,attendees:2-3 of str,notes<=15w}, inbox_rules:5 of str<=12w

Output the minified JSON object only.`;
}

function coerce(data) {
  // Ensure shape; backfill from fallback if the model under-delivers.
  const fb = fallbackData();
  const out = { ...fb, ...data };
  const need = {
    glossary: 8, departments: 5, roles: 4, bets: 4, risks: 3,
    kpis: 6, playbooks: 4, vendors: 4, decisions: 5, meetings: 4, inbox_rules: 5,
  };
  for (const [k, n] of Object.entries(need)) {
    if (!Array.isArray(out[k]) || out[k].length < n) {
      out[k] = (Array.isArray(out[k]) ? out[k] : []).concat(fb[k]).slice(0, n);
    } else {
      out[k] = out[k].slice(0, n);
    }
  }
  for (const s of ["company_name", "tagline", "mission"]) {
    if (typeof out[s] !== "string" || !out[s].trim()) out[s] = fb[s];
  }
  return out;
}

async function getData() {
  if (NO_LLM) return { data: coerce(fallbackData()), source: "generic/skeleton" };
  try {
    const { stdout } = await execFileP(
      "claude",
      [
        "-p", buildPrompt(),
        "--model", "claude-haiku-4-5-20251001",
        "--output-format", "json",
      ],
      {
        maxBuffer: 1024 * 1024 * 16,
        timeout: 80000,
        // Haiku otherwise burns ~5k extended-thinking tokens on this simple
        // extraction (~45s). Disabling it cuts wall time to ~20s with identical
        // output. This single flag is what keeps generation under the 60s SLA.
        env: { ...process.env, MAX_THINKING_TOKENS: "0" },
      }
    );
    const outer = JSON.parse(stdout);
    let txt = String(outer.result || "").trim();
    // strip a ```json ... ``` fence if present, then take the first {...} block
    txt = txt.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
    const a = txt.indexOf("{");
    const b = txt.lastIndexOf("}");
    if (a >= 0 && b > a) txt = txt.slice(a, b + 1);
    const data = JSON.parse(txt);
    return { data: coerce(data), source: "claude-haiku" };
  } catch (e) {
    console.error(`[warn] LLM call failed (${e.message}); using fallback dataset.`);
    return { data: coerce(fallbackData()), source: "fallback" };
  }
}

// ----------------------------------------------------------------------------
// 2. note weaving
// ----------------------------------------------------------------------------
const files = {}; // relPath -> content
function put(p, body) {
  files[p] = body.endsWith("\n") ? body : body + "\n";
}
const link = (name) => `[[${name}]]`;
const related = (names) =>
  `\n## Related\n${names.map((n) => `- ${link(n)}`).join("\n")}\n`;
const fm = (o) =>
  "---\n" +
  Object.entries(o)
    .map(([k, v]) =>
      Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`
    )
    .join("\n") +
  "\n---\n";

function todayMinus(days) {
  const d = new Date(Date.now() - days * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Obsidian/filesystem-safe note basename. Applied to BOTH the filename and the
// wikilink so the two always match. Strips path separators and reserved chars.
function safe(s) {
  return String(s)
    .replace(/[\/\\:#^\[\]|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildVault(d) {
  const C = d.company_name;
  // canonical basenames (reused for both filenames and wikilinks)
  const N = {
    start: "START_HERE",
    mission: "Mission and Vision",
    structure: "Company Structure",
    glossary: "Glossary",
    strategy: "Annual Strategy",
    kpi: "KPI Dashboard",
    vendors: "Vendor Notes",
    onboarding: "Onboarding",
    oneonone: "1on1 Template",
    declog: "Decision Log",
    inbox: "Inbox",
    bet: (i) => safe(`Bet - ${d.bets[i].name}`),
    risk: (i) => safe(`Risk - ${d.risks[i].name}`),
    role: (i) => safe(`Role - ${d.roles[i].title}`),
    play: (i) => safe(`Playbook - ${d.playbooks[i].title}`),
    dec: (i) => safe(`Decision - ${d.decisions[i].title}`),
    meet: (i) => safe(`Meeting - ${d.meetings[i].title}`),
  };

  // ---- root CLAUDE.md
  put(
    "CLAUDE.md",
    `# ${C} — Company Brain

${d.mission}

**Tagline:** ${d.tagline}
**Industry:** ${industry}  ·  **Team size:** ${teamSize}${focus ? `  ·  **Focus:** ${focus}` : ""}

## What this vault is
This is the company's shared memory: how we think, decide, and operate. It is written to be read by **people and by AI agents** (Claude Code). Every folder has its own \`CLAUDE.md\` that tells an agent how to behave there — read it before acting in that folder.

## How an agent should use this vault
- Start at ${link(N.start)} and ${link(N.mission)} for context.
- Before answering a question, read the relevant folder's \`CLAUDE.md\`.
- Cite your sources with wikilinks to the exact note, e.g. ${link(N.declog)}.
- When you learn something new, capture it in ${link(N.inbox)} — never lose a signal.
- Decisions are sacred: never edit a past decision; add a new one that supersedes it.

## Map
- \`00_Company/\` — who we are · ${link(N.mission)}, ${link(N.structure)}, ${link(N.glossary)}
- \`10_Strategy/\` — where we're going · ${link(N.strategy)}, ${link(N.kpi)}
- \`20_Operations/\` — how we run · ${link(N.vendors)}
- \`30_People/\` — who does what · ${link(N.onboarding)}
- \`40_Decisions/\` — what we chose and why · ${link(N.declog)}
- \`50_Meetings/\` — what we discussed
- \`90_Inbox/\` — what we just captured · ${link(N.inbox)}
`
  );

  // ---- START_HERE (hub)
  put(
    "START_HERE.md",
    `# Start Here — ${C}

Welcome to the ${C} company brain. This is a 30-day plan to make it a habit. No software jargon, no big rollout — one small step per week.

## Why this exists
The most valuable thing in a ${teamSize}-person company is context: why we made each call, how each job is done, what we're betting on. Today that lives in people's heads and in chat. This vault moves it somewhere durable that both your team and an AI assistant can read.

## The 30-day plan

**Week 1 — Capture meetings only.**
Do nothing else. After every meeting, drop a few bullets into \`50_Meetings/\`. Don't organise, don't format. The only goal is to build the habit of writing things down. See ${link(N.onboarding)} for the rhythm.

**Week 2 — Add the decision log.**
Start a note in ${link(N.declog)} each time you make a real choice: the options you weighed, what you picked, who owns it, and what would make you reverse it. Five minutes per decision.

**Week 3 — Wire up Claude Code.**
Point Claude Code at this folder. It reads the root \`CLAUDE.md\` and every folder's \`CLAUDE.md\` automatically, so it already knows how your company works. Ask it to file your week's meeting notes for you.

**Week 4 — Ask your company a question.**
Try it: "Based on our decision log, why did we choose our main vendor?" or "Summarise the risks to our ${d.bets[0].name} bet." The answer comes back with links to the exact notes. That's the payoff — your company can now answer questions about itself.

## Jump in
- Our reason for being → ${link(N.mission)}
- Where we're headed → ${link(N.strategy)} and ${link(N.kpi)}
- A real decision → ${link(N.declog)}
- How we run day to day → ${link(N.vendors)}
- Capture anything new → ${link(N.inbox)}
`
  );

  // ---- 00_Company
  put(
    "00_Company/CLAUDE.md",
    `# Agent guide — 00_Company

This folder holds the company's identity: mission, structure, and shared language.

When working here:
- Treat ${link(N.mission)} as the source of truth for *why we exist*. Don't contradict it.
- Keep ${link(N.glossary)} authoritative: if a term is used elsewhere, define it here.
- ${link(N.structure)} should always reflect the current ${teamSize}-person org. If a role changes, update it and link the affected ${link(N.role(0))} note.
- This folder is mostly stable. Prefer adding to it over rewriting it.
`
  );
  put(
    "00_Company/Mission and Vision.md",
    fm({ type: "company", status: "living" }) +
      `# Mission and Vision

${d.mission}

**Tagline:** *${d.tagline}*

## What we believe
- Context compounds. The more clearly we write down how we operate, the faster everyone — including our AI agents — gets.
- Decisions over opinions. We keep a written ${link(N.declog)} so we can learn from our own track record.
- Focus beats breadth, especially at ${teamSize} people. Our bets are deliberate; see ${link(N.strategy)}.

## How we measure it
The mission is real only if the numbers move. We track that in ${link(N.kpi)}.
` +
      related([N.structure, N.strategy, N.glossary])
  );
  put(
    "00_Company/Company Structure.md",
    fm({ type: "company", team_size: teamSize }) +
      `# Company Structure

${C} is a ${teamSize}-person company in ${industry}${focus ? ` (${focus})` : ""}, organised into ${d.departments.length} areas:

${d.departments.map((x) => `- **${x}**`).join("\n")}

## Leadership and key roles
${d.roles.map((r, i) => `- ${link(N.role(i))} — ${r.mandate}`).join("\n")}

New joiners should read ${link(N.onboarding)} first.
` +
      related([N.mission, N.role(0), N.role(1), N.onboarding])
  );
  put(
    "00_Company/Glossary.md",
    fm({ type: "company", status: "living" }) +
      `# Glossary

The shared language of ${C}. If you use one of these words, mean this:

${d.glossary.map((g) => `- **${g.term}** — ${g.def}`).join("\n")}
` +
      related([N.mission, N.strategy])
  );

  // ---- 10_Strategy
  put(
    "10_Strategy/CLAUDE.md",
    `# Agent guide — 10_Strategy

This folder holds where we're going: the annual strategy, our active bets, and the risks against them.

When working here:
- Every **bet** note must state a one-sentence thesis and link at least one ${link(N.kpi)} metric that proves or kills it.
- Every **risk** note must name an exposure *and* a mitigation, and link the bet it threatens.
- ${link(N.strategy)} is the hub — keep its links to bets and risks current.
- Don't invent new strategy here; reflect decisions recorded in ${link(N.declog)}.
`
  );
  put(
    "10_Strategy/Annual Strategy.md",
    fm({ type: "strategy", horizon: "annual", status: "active" }) +
      `# Annual Strategy

${C}'s plan for the year. The strategy is the sum of a few deliberate bets, the risks we accept, and the numbers that tell us we're winning.

## Our bets
${d.bets.map((b, i) => `- ${link(N.bet(i))} — ${b.thesis}`).join("\n")}

## Risks we're watching
${d.risks.map((r, i) => `- ${link(N.risk(i))} — ${r.exposure}`).join("\n")}

## How we'll know it's working
Tracked in ${link(N.kpi)}. The strategy connects back to ${link(N.mission)}.
` +
      related([
        N.bet(0), N.bet(1), N.bet(2), N.bet(3),
        N.risk(0), N.risk(1), N.risk(2),
        N.kpi, N.mission,
      ])
  );
  d.bets.forEach((b, i) => {
    const kpi = d.kpis[i % d.kpis.length].name;
    put(
      `10_Strategy/${N.bet(i)}.md`,
      fm({ type: "bet", status: "active", owner: d.roles[i % d.roles.length].title }) +
        `# Bet: ${b.name}

**Thesis.** ${b.thesis}

**Why now.** This is one of ${C}'s active wagers for the year — see ${link(N.strategy)}.

**What proves it.** Watch **${kpi}** in ${link(N.kpi)}.

**What kills it.** The main threat is ${link(N.risk(i % d.risks.length))}.

**Owner.** ${link(N.role(i % d.roles.length))}.
` +
        related([N.strategy, N.kpi, N.risk(i % d.risks.length)])
    );
  });
  d.risks.forEach((r, i) => {
    put(
      `10_Strategy/${N.risk(i)}.md`,
      fm({ type: "risk", severity: ["high", "medium", "medium"][i] || "medium" }) +
        `# Risk: ${r.name}

**Exposure.** ${r.exposure}

**Mitigation.** ${r.mitigation}

**Threatens.** ${link(N.bet(i % d.bets.length))} — and through it, the wider ${link(N.strategy)}.

If this risk materialises, a decision should be logged in ${link(N.declog)}.
` +
        related([N.bet(i % d.bets.length), N.strategy, N.declog])
    );
  });
  put(
    "10_Strategy/KPI Dashboard.md",
    fm({ type: "strategy", cadence: "monthly" }) +
      `# KPI Dashboard

The handful of numbers that tell ${C} whether the ${link(N.strategy)} is working. Reviewed monthly.

| Metric | Target |
|---|---|
${d.kpis.map((k) => `| ${k.name} | ${k.target} |`).join("\n")}

Each metric should map to at least one bet. Start with ${link(N.bet(0))} and ${link(N.bet(1))}.
` +
      related([N.strategy, N.bet(0), N.bet(1), N.mission])
  );

  // ---- 20_Operations
  put(
    "20_Operations/CLAUDE.md",
    `# Agent guide — 20_Operations

This folder holds how we actually run: playbooks, SOPs, and vendor notes.

When working here:
- A **playbook** must be runnable by a new hire with no supervision — concrete numbered steps, not principles.
- Link each playbook to the ${link(N.role(0))} who owns it and to any ${link(N.vendors)} it depends on.
- When a process changes because of a decision, link the relevant note in ${link(N.declog)}.
- Keep ${link(N.vendors)} current; an outdated vendor list is worse than none.
`
  );
  d.playbooks.forEach((p, i) => {
    put(
      `20_Operations/${N.play(i)}.md`,
      fm({ type: "playbook", owner: d.roles[i % d.roles.length].title }) +
        `# Playbook: ${p.title}

A repeatable procedure for ${C}. Owned by ${link(N.role(i % d.roles.length))}.

## Steps
${(p.steps || []).map((s, j) => `${j + 1}. ${s}`).join("\n")}

## Dependencies
Relies on ${link(N.vendors)}. If you improve this playbook, note why in ${link(N.inbox)}.
` +
        related([N.vendors, N.role(i % d.roles.length), N.inbox])
    );
  });
  put(
    "20_Operations/Vendor Notes.md",
    fm({ type: "operations", status: "living" }) +
      `# Vendor Notes

The outside partners ${C} depends on, and what each is for. Selecting a new one? Follow ${link(N.play(2))}.

${d.vendors
  .map((v) => `- **${v.name}** _(${v.category})_ — ${v.use}`)
  .join("\n")}
` +
      related([N.play(0), N.play(2), N.declog])
  );

  // ---- 30_People
  put(
    "30_People/CLAUDE.md",
    `# Agent guide — 30_People

This folder holds who does what: roles, onboarding, and 1-on-1 templates.

When working here:
- Each **role** note states a single clear mandate and the playbooks that role owns.
- ${link(N.onboarding)} is the first thing a new hire reads — keep it to the first 14 days.
- Never put performance details or sensitive personal data in the brain. Roles and mandates only.
- Link roles back to ${link(N.structure)}.
`
  );
  d.roles.forEach((r, i) => {
    put(
      `30_People/${N.role(i)}.md`,
      fm({ type: "role" }) +
        `# Role: ${r.title}

**Mandate.** ${r.mandate}

**Owns.** ${link(N.play(i % d.playbooks.length))}.

**Sits within.** See ${link(N.structure)}.

**Cadence.** Runs a weekly 1-on-1 — use ${link(N.oneonone)}.
` +
        related([N.structure, N.play(i % d.playbooks.length), N.onboarding])
    );
  });
  put(
    "30_People/Onboarding.md",
    fm({ type: "people", status: "living" }) +
      `# Onboarding — First 14 Days

How a new joiner at ${C} gets productive fast. The whole plan is: read the brain, shadow the rhythm, own one thing.

## Day 1–2 — Context
Read ${link(N.start)}, ${link(N.mission)}, and ${link(N.structure)}. Skim ${link(N.glossary)}.

## Day 3–7 — Rhythm
Sit in on meetings (filed in ${link(N.meet(0))} style) and read the latest ${link(N.declog)}.

## Day 8–14 — Ownership
Pick up one ${link(N.role(0))}-style responsibility and run your first 1-on-1 with ${link(N.oneonone)}.
` +
      related([N.start, N.structure, N.role(0), N.oneonone])
  );
  put(
    "30_People/1on1 Template.md",
    fm({ type: "template" }) +
      `# 1-on-1 Template

Copy this for each weekly 1-on-1. Keep it short and honest.

- **Wins since last time:**
- **Blockers I can remove:**
- **One thing about the company you'd change:**
- **Progress on your owned playbook** (link it):
- **Decisions to escalate** → log in ${link(N.declog)}:

New to the team? Start from ${link(N.onboarding)}.
` +
      related([N.onboarding, N.role(0)])
  );

  // ---- 40_Decisions
  put(
    "40_Decisions/CLAUDE.md",
    `# Agent guide — 40_Decisions

This is the most important folder in the company. It is the written memory of every consequential choice.

**Non-negotiable rules for every decision note:**
- Record the **options considered** (at least two real alternatives).
- Name a single **owner** — the one person accountable.
- State the **reversal conditions** — what signal would make us undo this.
- Capture the **rationale** in plain language a future hire can follow.

**Never edit a past decision.** If a decision changes, write a *new* note that supersedes it and link back. Keep ${link(N.declog)} as the index of everything.
`
  );
  put(
    "40_Decisions/Decision Log.md",
    fm({ type: "decision-index", status: "living" }) +
      `# Decision Log

Every consequential choice ${C} has made, newest first. Click any decision to see the options, the owner, and what would make us reverse it.

${d.decisions.map((x, i) => `- ${link(N.dec(i))} — *${x.choice}*`).join("\n")}

This log is the backbone of the brain — it connects to ${link(N.strategy)} and feeds ${link(N.onboarding)}.
` +
      related([
        N.dec(0), N.dec(1), N.dec(2), N.dec(3), N.dec(4), N.strategy,
      ])
  );
  d.decisions.forEach((dec, i) => {
    const owner = d.roles[i % d.roles.length].title;
    const meetIdx = i % d.meetings.length;
    put(
      `40_Decisions/${N.dec(i)}.md`,
      fm({ type: "decision", date: todayMinus((i + 1) * 9), owner }) +
        `# Decision: ${dec.title}

**Date.** ${todayMinus((i + 1) * 9)}
**Owner.** ${link(N.role(i % d.roles.length))}

## Context
${dec.context}

## Options considered
${(dec.options || []).map((o) => `- ${o}`).join("\n")}

## Decision
**${dec.choice}.** ${dec.rationale}

## Reversal conditions
${dec.reversal}

## Trace
This choice supports ${link(N.bet(i % d.bets.length))} and was discussed in ${link(N.meet(meetIdx))}. Indexed in ${link(N.declog)}.
` +
        related([N.declog, N.bet(i % d.bets.length), N.meet(meetIdx), N.role(i % d.roles.length)])
    );
  });

  // ---- 50_Meetings
  put(
    "50_Meetings/CLAUDE.md",
    `# Agent guide — 50_Meetings

This folder holds meeting summaries, ideally filed automatically by an agent.

When working here:
- One note per meeting. Capture **decisions** and **owners**, not a transcript.
- If a meeting produced a decision, create the note in ${link(N.declog)} and link it both ways.
- Title format: \`Meeting - <topic>\`. Include the date and who was there.
- Unsure where something goes? Drop it in ${link(N.inbox)} and let triage sort it.
`
  );
  d.meetings.forEach((m, i) => {
    const decIdx = i % d.decisions.length;
    put(
      `50_Meetings/${N.meet(i)}.md`,
      fm({ type: "meeting", date: todayMinus((i + 1) * 7), category: m.type }) +
        `# ${m.title}

**Date.** ${todayMinus((i + 1) * 7)}  ·  **Type.** ${m.type}
**Attendees.** ${(m.attendees || []).join(", ")}

## Summary
${m.notes}

## Decisions made
This meeting fed ${link(N.dec(decIdx))}. See the full ${link(N.declog)}.
` +
        related([N.dec(decIdx), N.declog, N.role(i % d.roles.length)])
    );
  });

  // ---- 90_Inbox
  put(
    "90_Inbox/CLAUDE.md",
    `# Agent guide — 90_Inbox

This is the capture zone. Anything unsorted lands here first — capturing always beats organising.

**Triage rules for an agent:**
${d.inbox_rules.map((r) => `- ${r}`).join("\n")}

Empty this folder regularly. A full inbox is fine; a *stale* inbox is not.
`
  );
  put(
    "90_Inbox/Inbox.md",
    fm({ type: "inbox", status: "capture" }) +
      `# Inbox

Drop anything here — a thought, a meeting note, a signal — and let triage file it later.

## Triage rules
${d.inbox_rules.map((r) => `- ${r}`).join("\n")}

## Where things go
- Decisions → ${link(N.declog)}
- Meetings → ${link(N.meet(0))}
- Metrics → ${link(N.kpi)}

New here? Read ${link(N.start)}.
` +
      related([N.declog, N.kpi, N.start])
  );

  return files;
}

// ----------------------------------------------------------------------------
// 3. write + zip + report
// ----------------------------------------------------------------------------
function writeAll(map) {
  if (existsSync(outDir) && SKELETON) {
    // refresh skeleton cleanly
    rmSync(outDir, { recursive: true, force: true });
  }
  for (const [rel, body] of Object.entries(map)) {
    const full = join(outDir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body, "utf8");
  }
}

function countLinks(map) {
  let total = 0;
  let minLinks = Infinity;
  let hubs = 0;
  const sampleNotes = Object.entries(map).filter(
    ([p]) => !p.endsWith("CLAUDE.md")
  );
  for (const [, body] of sampleNotes) {
    const n = (body.match(/\[\[/g) || []).length;
    total += n;
    minLinks = Math.min(minLinks, n);
    if (n >= 6) hubs++;
  }
  return {
    notes: Object.keys(map).length,
    sampleNotes: sampleNotes.length,
    links: total,
    minLinksInSample: minLinks,
    hubs,
  };
}

async function zipVault() {
  mkdirSync(zipDir, { recursive: true });
  const zipPath = join(zipDir, `${slug}.zip`);
  rmSync(zipPath, { force: true });
  // zip the vault dir, stored relative to its parent
  await execFileP("zip", ["-r", "-q", zipPath, "."], { cwd: outDir });
  return zipPath;
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
const { data, source } = await getData();
const map = buildVault(data);
writeAll(map);
const stats = countLinks(map);
let zipPath = null;
if (!NO_ZIP) zipPath = await zipVault();

const secs = ((Date.now() - t0) / 1000).toFixed(1);

if (SKELETON) {
  console.log(`\n✅ Skeleton written to ${outDir}`);
  console.log(
    `   ${stats.notes} files · ${stats.sampleNotes} sample notes · ${stats.links} wikilinks · ${stats.hubs} hubs`
  );
} else {
  console.log(`\n🧠  Company brain blueprint generated for: ${industry} (${teamSize})${focus ? ` — ${focus}` : ""}`);
  console.log(`    Company: ${data.company_name}`);
  console.log(`    Data source: ${source}   ·   Wall time: ${secs}s`);
  console.log(`\n📁  Vault: ${outDir}`);
  console.log(
    `    ${stats.notes} files · ${stats.sampleNotes} sample notes · ${stats.links} wikilinks · ${stats.hubs} hub notes (6+ links) · min links/note ${stats.minLinksInSample}`
  );
  if (zipPath) console.log(`📦  Zip:   ${zipPath}`);
  console.log(`\n👉  Open in Obsidian:`);
  console.log(`    open -a Obsidian "${outDir}"`);
  console.log(`    (or: Obsidian → Open folder as vault → choose the path above)\n`);
}

// machine-readable line for the harness / test runner
console.log(
  "REPORT_JSON " +
    JSON.stringify({
      industry, teamSize, focus, company: data.company_name, source,
      seconds: Number(secs), outDir, zipPath, ...stats,
    })
);
