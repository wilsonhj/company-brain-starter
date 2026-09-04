#!/usr/bin/env node
// brain-blueprint generator (architecture v2)
// Template-first, LLM-light. Copies a skeleton instantly, makes ONE Claude
// (Opus 4.8) call for industry-specific substitutions, then weaves a densely
// interlinked "company brain" vault.
//
// Structure follows Karpathy's data-flow LLM-Wiki pattern (Inbox -> Raw -> Wiki
// -> outputs) with domain subfolders inside Wiki/, a three-layer memory triad
// at the root (CLAUDE.md / MEMORY.md / Intelligence_snapshot.md), and an
// "advisor factory" meta-pattern instead of a fixed advisor list.
//
// Usage:
//   node scripts/generate.mjs "<industry>" <team_size> ["one-line focus"]
//   node scripts/generate.mjs "<industry>" <team_size> --out ./my-company-brain
//   node scripts/generate.mjs --skeleton            # build the generic repo skeleton
//
// Requires: the `claude` CLI on PATH (uses the user's existing auth) and `zip`.
// A deterministic fallback dataset means the call can NEVER hard-fail a demo.

import { execFile } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const t0 = Date.now();

const MODEL = "claude-opus-4-8";

// ----------------------------------------------------------------------------
// args
// ----------------------------------------------------------------------------
let argv = process.argv.slice(2);

function takeOption(names) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    for (const name of names) {
      if (arg === name) {
        const value = argv[i + 1];
        if (!value || value.startsWith("--")) {
          console.error(`Missing value for ${name}`);
          process.exit(1);
        }
        argv.splice(i, 2);
        return value;
      }
      if (arg.startsWith(`${name}=`)) {
        const value = arg.slice(name.length + 1);
        argv.splice(i, 1);
        return value;
      }
    }
  }
  return "";
}

const REQUESTED_OUT = takeOption(["--out", "--out-dir"]);
const REQUESTED_ZIP_DIR = takeOption(["--zip-dir"]);
const SKELETON = argv.includes("--skeleton");
const FORCE = argv.includes("--force");
const NO_LLM = argv.includes("--no-llm") || SKELETON;
const NO_ZIP = argv.includes("--no-zip") || SKELETON;
// Auto-launch Obsidian on the finished vault (the "bloom" trophy moment).
// Suppressed for skeleton builds and via --no-open (used in perf-only test loops).
const NO_OPEN = argv.includes("--no-open") || SKELETON;
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
      'Usage: node scripts/generate.mjs "<industry>" <team_size> ["one-line focus"] [--out <folder>] [--zip-dir <folder>] [--force]'
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
  : REQUESTED_OUT
    ? resolve(process.cwd(), REQUESTED_OUT)
    : join(SHOWCASE, `${stamp()}_${slug}`);
const zipDir = REQUESTED_ZIP_DIR
  ? resolve(process.cwd(), REQUESTED_ZIP_DIR)
  : REQUESTED_OUT
    ? join(dirname(outDir), "out")
    : join(SHOWCASE, "out");

// Writing a vault REPLACES its output folder. That is intended for --skeleton
// (the repo rebuilds its own skeleton/), but --out can point anywhere, including
// a vault someone has already filled in — so refuse a non-empty folder (or a
// file) unless they explicitly pass --force. Checked here, before the LLM call,
// so a refusal costs no time and no tokens.
if (REQUESTED_OUT && existsSync(outDir) && !FORCE) {
  const st = statSync(outDir);
  const reason = !st.isDirectory()
    ? "It exists and is a file, and generating would replace it with a folder."
    : readdirSync(outDir).length
      ? "It already exists and is not empty, and generating REPLACES the whole folder."
      : "";
  if (reason) {
    console.error(
      `Refusing to overwrite ${outDir}\n` +
        `  ${reason}\n` +
        `  Pass --force to replace it, or --out <a new folder> to keep it.`
    );
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// 1. data: one LLM call -> structured substitutions  (with safe fallback)
// ----------------------------------------------------------------------------
function fallbackData() {
  const ind = String(industry).replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    company_name: SKELETON ? "Your Company" : `${ind} Holdings`,
    tagline: SKELETON ? "A starter CEO operating system" : `Operating company in ${industry}`,
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
      { name: "Operational Leverage", thesis: "Document every process so the team doubles output without doubling headcount." },
      { name: "Premium Positioning", thesis: "Win on quality and trust rather than competing on price." },
      { name: "AI-Native Operations", thesis: "Give agents the same context as staff so routine work runs itself." },
      { name: "Disciplined Expansion", thesis: "Enter one new market at a time, only after the core is profitable." },
    ],
    risks: [
      { name: "Key-Person Dependency", exposure: "Too much context lives only in founders' heads.", mitigation: "Write it down weekly; the brain is the backup." },
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
      { title: "Adopt a Written Decision Log", context: "Decisions were made in chat and forgotten.", options: ["Keep deciding ad hoc", "Use a spreadsheet", "One note per decision in the brain"], choice: "One note per decision in the brain", rationale: "Searchable, linkable, and readable by AI agents.", reversal: "Revisit if logging slows the team for two sprints." },
      { title: "Standardise on a Single Operating Platform", context: "Three tools held overlapping data.", options: ["Keep all three", "Build in-house", "Consolidate onto one platform"], choice: "Consolidate onto one platform", rationale: "Lower cost and one source of truth.", reversal: "Reverse if the platform raises prices above budget." },
      { title: "Hold Cash Runway Above Nine Months", context: "Growth spending outpaced revenue.", options: ["Spend to grow faster", "Hold 6 months", "Hold 9 months minimum"], choice: "Hold 9 months minimum", rationale: "Buys time to recover from one bad quarter.", reversal: "Loosen only after two profitable quarters." },
      { title: "Enter One New Market First", context: "Two expansion options on the table.", options: ["Both at once", "Neither yet", "The adjacent market first"], choice: "The adjacent market first", rationale: "Reuses existing playbooks; lower risk.", reversal: "Pause if core-market growth dips below target." },
      { title: "Wire Up an AI Company Brain", context: "Context lived in people's heads.", options: ["Hire more coordinators", "Buy a wiki", "Build an AI-readable brain"], choice: "Build an AI-readable brain", rationale: "Agents and humans share one context.", reversal: "Reassess if maintenance exceeds the time it saves." },
    ],
    meetings: [
      { title: "Quarterly Strategy Offsite", type: "Strategy", attendees: ["Founder / CEO", "Head of Operations", "Finance Lead"], notes: "Reviewed the annual bets and reset KPI targets for the quarter." },
      { title: "Weekly Operating Review", type: "Operations", attendees: ["Head of Operations", "Commercial Lead"], notes: "Walked the dashboard; agreed to consolidate onto one operating platform." },
      { title: "Finance and Runway Check", type: "Finance", attendees: ["Founder / CEO", "Finance Lead"], notes: "Confirmed the nine-month runway floor and the repricing schedule." },
      { title: "Market Expansion Working Session", type: "Strategy", attendees: ["Founder / CEO", "Commercial Lead"], notes: "Chose the adjacent market and named reversal conditions." },
    ],
    inbox_rules: [
      "Anything unfiled lands here first — capture beats organising.",
      "If it has lasting value as a source, move the raw artifact to Raw/.",
      "If it is a decision, distil it into Wiki/40_Decisions and link the bet it serves.",
      "If it names a metric, link it to the KPI Dashboard in Wiki/10_Strategy.",
      "Review and empty the Inbox every Friday.",
    ],
    memory: {
      quarter_focus: "Stabilise core operations and prove unit economics before any expansion.",
      urgent: ["Close the quarterly hiring plan", "Finalise the lead vendor contract", "Refresh the financial model"],
      team_deployment: ["Operations on the platform migration", "Commercial on the top ten accounts", "Finance on the runway review"],
      recent_decisions: ["Adopted a written decision log", "Consolidated onto one operating platform", "Held runway above nine months"],
    },
    intel_sections: [
      "Company snapshot", "Market and competitors", "Customers and segments",
      "Products and operations", "Financial position", "Team and org design",
      "Active strategic bets", "Open risks", "Key relationships and vendors",
      "Open questions and unknowns",
    ],
    advisor: {
      name: "The Operator",
      persona: "A pragmatic scale-up COO who has run lean teams through fast growth.",
      when_to_invoke: "Decisions about process, hiring, vendor commitments, or expansion pace.",
      core_method: "Asks what breaks first at double the current volume, insists on a single owner and a single metric per initiative, and always prefers a small reversible step over a large irreversible bet.",
    },
    decision_types: [
      "Pricing and promotion",
      "Channel or market expansion",
      "Vendor and platform commitments",
    ],
    stakeholders: ["Board", "Team", "Customers"],
    okr_examples: [
      "Grow revenue run-rate 20% this quarter",
      "Cut the order-to-cash cycle by five days",
      "Reach 100% of consequential decisions logged",
    ],
  };
}

function buildPrompt() {
  const focusLine = focus ? ` Focus: ${focus}.` : "";
  // LLM-light: ONLY short industry-specific substitutions. Templates write prose.
  // Minified output + capped strings keep this fast even on Opus.
  return `Generate industry-specific substitutions for a fictional but realistic company.
Industry: ${industry}. Team size: ${teamSize}.${focusLine}

Reply with MINIFIED JSON ON ONE LINE (no newlines, no markdown fence, no commentary). Every value concrete and specific to this industry — NEVER "lorem", "TODO", or placeholders. Respect the word caps to stay terse and fast.

Keys and exact array lengths:
company_name(str), tagline(str,<=8w),
glossary:6 of {term,def<=8w}, departments:5 of str,
roles:4 of {title,mandate<=8w}, bets:4 of {name,thesis<=10w},
risks:3 of {name,exposure<=8w,mitigation<=8w}, kpis:6 of {name,target<=6w},
playbooks:4 of {title,steps:3 of str<=6w}, vendors:4 of {name,category,use<=7w},
decisions:5 of {title,context<=10w,options:3 of str<=5w,choice<=7w,rationale<=10w,reversal<=10w},
meetings:4 of {title,type,attendees:2-3 of str,notes<=12w}, inbox_rules:5 of str<=10w,
memory:{quarter_focus<=16w,urgent:3 of str<=10w,team_deployment:3 of str<=10w,recent_decisions:3 of str<=10w},
intel_sections:8 of str<=6w,
decision_types:3 of str<=5w (recurring decision categories this company faces),
stakeholders:3 of str<=3w (audiences the CEO communicates with, e.g. Board/Clinical staff/Payors),
okr_examples:3 of str<=10w (concrete quarterly objectives for this industry),
advisor:{name str (a real or fictional historical figure well-suited to this industry),persona<=12w,when_to_invoke<=12w,core_method<=24w}

Output the minified JSON object only.`;
}

function coerce(data) {
  const fb = fallbackData();
  const out = { ...fb, ...data };
  const need = {
    glossary: 6, departments: 5, roles: 4, bets: 4, risks: 3,
    kpis: 6, playbooks: 4, vendors: 4, decisions: 5, meetings: 4,
    inbox_rules: 5, intel_sections: 8,
    decision_types: 3, stakeholders: 3, okr_examples: 3,
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
  // nested objects
  out.memory = { ...fb.memory, ...(data && data.memory) };
  for (const k of ["urgent", "team_deployment", "recent_decisions"]) {
    if (!Array.isArray(out.memory[k]) || out.memory[k].length < 3)
      out.memory[k] = (out.memory[k] || []).concat(fb.memory[k]).slice(0, 3);
  }
  out.advisor = { ...fb.advisor, ...(data && data.advisor) };
  for (const s of ["name", "persona", "when_to_invoke", "core_method"]) {
    if (typeof out.advisor[s] !== "string" || !out.advisor[s].trim())
      out.advisor[s] = fb.advisor[s];
  }
  return out;
}

async function getData() {
  if (NO_LLM) return { data: coerce(fallbackData()), source: "generic/skeleton" };
  try {
    const { stdout } = await execFileP(
      "claude",
      ["-p", buildPrompt(), "--model", MODEL, "--output-format", "json"],
      {
        maxBuffer: 1024 * 1024 * 16,
        // Timeout sits BELOW the 60s SLA: if the model is slow, we abandon it
        // and fall back to the instant generic dataset, so the whole run still
        // finishes under 60s rather than hanging in front of a visitor.
        timeout: 56000,
        // Opus otherwise burns thousands of extended-thinking tokens on this
        // simple extraction. Disabling it is what keeps the call ~40s, not ~90s.
        env: { ...process.env, MAX_THINKING_TOKENS: "0" },
      }
    );
    const outer = JSON.parse(stdout);
    let txt = String(outer.result || "").trim();
    txt = txt.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
    const a = txt.indexOf("{");
    const b = txt.lastIndexOf("}");
    if (a >= 0 && b > a) txt = txt.slice(a, b + 1);
    const data = JSON.parse(txt);
    return { data: coerce(data), source: MODEL };
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
    .map(([k, v]) => (Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`))
    .join("\n") +
  "\n---\n";

// Obsidian/filesystem-safe note basename. Applied to BOTH filename and wikilink.
function safe(s) {
  return String(s)
    .replace(/[\/\\:#^\[\]|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function todayMinus(days) {
  const d = new Date(Date.now() - days * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function todayPlus(days) {
  return todayMinus(-days);
}

function buildVault(d) {
  const C = d.company_name;
  const N = {
    dashboard: "Dashboard",
    memory: "MEMORY",
    intel: "Intelligence_snapshot",
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
    advTemplate: "_advisor_template",
    advRouter: "_advisor_router",
    advisor: safe(`Advisor - ${d.advisor.name}`),
    profile: "Your Profile",
    meetingReview: "_meeting-review-template",
    goalAlign: "_goal-alignment-template",
    cap1: safe(`Capture - ${d.bets[0].name} follow-up`),
    cap2: safe(`Capture - ${d.kpis[0].name} signal`),
    raw1: safe(`Transcript - ${d.meetings[0].title}`),
    raw2: safe(`Transcript - ${d.meetings[1].title}`),
    bet: (i) => safe(`Bet - ${d.bets[i].name}`),
    risk: (i) => safe(`Risk - ${d.risks[i].name}`),
    role: (i) => safe(`Role - ${d.roles[i].title}`),
    play: (i) => safe(`Playbook - ${d.playbooks[i].title}`),
    dec: (i) => safe(`Decision - ${d.decisions[i].title}`),
    meet: (i) => safe(`Meeting - ${d.meetings[i].title}`),
  };

  // ======================================================================
  // ROOT — the three-layer memory triad lives here
  // ======================================================================

  // ---- root CLAUDE.md (agent instructions: data flow + guardrails)
  put(
    "CLAUDE.md",
    `# ${C} — CEO Operating System (root agent guide)

${d.mission} This vault is a CEO operating system first: action, judgment, capital protection, and team clarity beat knowledge display.

**Tagline:** ${d.tagline}
**Industry:** ${industry}  ·  **Team size:** ${teamSize}${focus ? `  ·  **Focus:** ${focus}` : ""}

## The operating layers (read these in order)
1. **This file (\`CLAUDE.md\`)** — the *rules*: how you, an AI agent, should behave here.
2. **${link(N.dashboard)}** — the *current ops surface*: what the CEO must see this week across progress, decisions, risks, team load, and checklist.
3. **${link(N.memory)}** — the *state*: a fast-changing snapshot of where things stand right now (this quarter, what's urgent, who's on what). Read it to know the present.
4. **${link(N.intel)}** — the *panorama*: the deep, slowly-evolving, authoritative picture of the whole business. Read it to understand context in depth.

Four root files, four jobs: rules vs. operating surface vs. live state vs. deep reference. Don't collapse them.

## Dashboard rule
Treat ${link(N.dashboard)} as the default daily entry point. It is not a graph showcase and not a list of interesting resurfaced notes.

Only add or keep an item on ${link(N.dashboard)} if it can do at least one of these:
- Change a decision
- Unblock a person
- Protect capital
- Update the operating state

If a resurfaced note is useful background but does not meet that bar, update the relevant Wiki note and link it from deeper views instead.

## How knowledge flows (the data pipeline)
Things move left to right, and only the right-hand side is authoritative:

\`Inbox/\`  →  \`Raw/\`  →  \`Wiki/\`  →  \`outputs/\`

- **Inbox/** — everything enters here first (a thought, a forwarded note, a signal). Capture beats organising.
- **Raw/** — if an item has lasting value, its *immutable source* (a transcript, a document, a clipping) is filed here. Never edit Raw; it is the evidence.
- **Wiki/** — the distilled, human-readable truth. An agent and a human turn Raw into Wiki *through dialogue*, not by dumping. Humans read here.
- **outputs/** — query results, reports, and summaries an agent generates land here. Disposable; regenerate any time.

When you process the Inbox: keep lasting sources in Raw, distil meaning into the right \`Wiki/\` domain folder, and cite the Raw source you used. Then update ${link(N.dashboard)} only for items that affect decisions, people, capital, or operating state.

## Behavioral guardrails (watch the human for these)
This brain has opinions. If you notice one of these patterns, say so and intervene:
- **Scope creep** — a task quietly growing past its original mandate. *Intervention:* restate the original goal and ask what to cut.
- **Research-instead-of-execute** — endless gathering that defers the actual decision. *Intervention:* name the decision that's being avoided and propose the smallest next action.
- **Overgenerous negotiation** — giving away more than the situation requires. *Intervention:* ask for the walk-away line before conceding.
- **Delaying reversible decisions** — treating a cheap, undoable choice as if it were permanent. *Intervention:* flag that it's reversible and push to decide now.

## Map
- \`Dashboard.md\` — daily CEO operating surface · ${link(N.dashboard)}
- \`Inbox/\` — capture zone · ${link(N.cap1)}
- \`Raw/\` — immutable sources · ${link(N.raw1)}
- \`Wiki/00_Company/\` — ${link(N.mission)}, ${link(N.structure)}, ${link(N.glossary)}
- \`Wiki/10_Strategy/\` — ${link(N.strategy)}, ${link(N.kpi)}
- \`Wiki/20_Operations/\` — ${link(N.vendors)}
- \`Wiki/30_People/\` — roles, onboarding, and the ${link(N.advTemplate)} advisor pattern
- \`Wiki/40_Decisions/\` — ${link(N.declog)}
- \`Wiki/50_Meetings/\` — meeting summaries
- \`outputs/\` — generated answers (starts empty)
`
  );

  // ---- MEMORY.md (state snapshot)
  put(
    "MEMORY.md",
    fm({ type: "memory", updated: todayMinus(2) }) +
      `# MEMORY — ${C} (state snapshot)

> The fast-changing working memory. An agent reads this **first** to know where things stand *right now*. Update it weekly. For the deep reference see ${link(N.intel)}; for the rules see the root \`CLAUDE.md\`.
> Everything below is an example — **edit it to match your reality.**

**Last updated:** ${todayMinus(2)}  ·  **Maintained by:** ${link(N.role(0))}

## This quarter's focus
${d.memory.quarter_focus}  _(edit me)_

## Urgent / in-flight
${d.memory.urgent.map((x) => `- [ ] ${x}`).join("\n")}

## Team deployment (who's on what)
${d.memory.team_deployment.map((x) => `- ${x}`).join("\n")}

## Recent decisions
${d.memory.recent_decisions.map((x) => `- ${x}`).join("\n")}

See the full, permanent record in ${link(N.declog)}.
` +
      related([N.dashboard, N.intel, N.declog, N.start, N.strategy])
  );

  // ---- Dashboard.md (CEO operating surface)
  put(
    "Dashboard.md",
    fm({ type: "dashboard", cadence: "daily", owner: d.roles[0].title }) +
      `# Dashboard — ${C}

The daily CEO operating surface: progress, judgment calls, drift, team load, and the next week's checklist. This page is not a knowledge wall; it only surfaces what changes a decision, unblocks a person, protects capital, or updates the operating state. Update it before the weekly operating review; use ${link(N.memory)} for fast-changing state and ${link(N.intel)} for deep context.

## Company Progress
**Quarter focus:** ${d.memory.quarter_focus}

**Active bets**
${d.bets.map((b, i) => `- ${link(N.bet(i))} — ${b.thesis}`).join("\n")}

**Scoreboard**
| KPI | Target |
|---|---|
${d.kpis.map((k) => `| ${k.name} | ${k.target} |`).join("\n")}

## CEO Must See
${d.memory.urgent.map((x, i) => `- [ ] ${x} — owner: ${link(N.role(i % d.roles.length))}`).join("\n")}

**Key external dependencies**
${d.vendors.map((v) => `- **${v.name}** _(${v.category})_ — ${v.use}`).join("\n")}

## Decisions That Need Judgment
${d.decisions
  .slice(0, 3)
  .map((x, i) => `- ${link(N.dec(i))} — current choice: **${x.choice}**; reversal signal: ${x.reversal}`)
  .join("\n")}

Use ${link(N.advisor)} for reversible operating calls; route unfamiliar decision types through ${link(N.advRouter)}.

## Risks And Drift
${d.risks
  .map((r, i) => `- ${link(N.risk(i))} — exposure: ${r.exposure}; mitigation: ${r.mitigation}`)
  .join("\n")}

Drift check: if a risk changes the thesis behind ${link(N.strategy)}, write the new call in ${link(N.declog)} instead of editing old decisions.

## Team Load
${d.roles.map((r, i) => `- ${link(N.role(i))} — ${r.mandate}`).join("\n")}

**Deployed this quarter**
${d.memory.team_deployment.map((x) => `- ${x}`).join("\n")}

Use ${link(N.oneonone)} when a load issue needs a conversation, not just a task.

## This Week Operating Checklist
- [ ] Review ${link(N.kpi)} against the quarter focus in ${link(N.memory)}.
- [ ] Clear Inbox items that affect ${link(N.declog)} or ${link(N.strategy)}.
- [ ] Check every high-pressure vendor or platform dependency in ${link(N.vendors)}.
- [ ] Ask which decision is being delayed, then log it in ${link(N.declog)}.
- [ ] Update this dashboard after the weekly review.

## Evidence And Deeper Views
- Live state: ${link(N.memory)}
- Deep company context: ${link(N.intel)}
- Strategy hub: ${link(N.strategy)}
- KPI detail: ${link(N.kpi)}
- Decision record: ${link(N.declog)}
- People and ownership: ${link(N.structure)}
- Operating vendors: ${link(N.vendors)}
- Meeting evidence: ${link(N.meet(0))}, ${link(N.meet(1))}
` +
      related([
        N.memory, N.intel, N.strategy, N.kpi, N.declog,
        N.structure, N.vendors, N.advisor,
      ])
  );

  // ---- Intelligence_snapshot.md (~80 line panorama starter)
  const intelBody = d.intel_sections
    .map(
      (s) =>
        `## ${s}\n_Prompt: in 3–5 lines, capture what an outsider must know about **${s.toLowerCase()}** to act correctly here. Replace this line._\n- \n`
    )
    .join("\n");
  put(
    "Intelligence_snapshot.md",
    fm({ type: "intelligence", status: "starter" }) +
      `# Intelligence Snapshot — ${C}

> The authoritative, full-panorama view of the company. Unlike ${link(N.memory)} (a fast-changing state snapshot), this is the deep, slowly-evolving reference an agent reads to understand the *whole* business. Expand each section over time — the prompts are starting points, not the final text.
> This is the long answer to "what's in a CLAUDE.md and why does it matter": the rules live in \`CLAUDE.md\`, the live state in ${link(N.memory)}, and the deep truth here.

**How to use:** spend 20 minutes filling two or three sections you know cold. Ask Claude Code to interview you for the rest, one section per sitting.

${intelBody}` +
      related([N.memory, N.mission, N.strategy, N.declog, N.kpi])
  );

  // ---- START_HERE.md (30-day plan, updated for the data flow)
  put(
    "START_HERE.md",
    `# Start Here — ${C}

Welcome to the ${C} company brain. This is a 30-day plan to make it a habit. No software jargon, no big rollout — one small step per week.

## Why this exists
The most valuable thing in a ${teamSize}-person company is context: why we made each call, how each job is done, what we're betting on. Today that lives in people's heads and in chat. This vault moves it somewhere durable that both your team and an AI assistant can read.

## How it's organised (90 seconds)
Start your day in ${link(N.dashboard)}. It is the current operating surface for the CEO: progress, judgment calls, risk drift, team load, and the weekly checklist.

Knowledge still flows in one direction: **Inbox → Raw → Wiki → outputs.**
You capture anything into \`Inbox/\`. Sources worth keeping move to \`Raw/\`. The distilled truth lives in \`Wiki/\` (organised by topic — company, strategy, operations, people, decisions, meetings). When you ask the brain a question, the answer lands in \`outputs/\`.
Four files at the root hold the operating system: \`CLAUDE.md\` (the rules), ${link(N.dashboard)} (the daily surface), ${link(N.memory)} (today's state), and ${link(N.intel)} (the deep picture).

Only put surfaced notes on ${link(N.dashboard)} when they can change a decision, unblock a person, protect capital, or update the operating state. Everything else belongs in the right Wiki note.

## The 30-day plan

**Week 1 — Capture meetings only.**
After every meeting, drop the transcript or a few bullets into \`Inbox/\`. Don't organise. The only goal is the habit of writing things down. The two notes already in \`Inbox/\` and \`Raw/\` show the format.

**Week 2 — Add the decision log.**
Each time you make a real choice, add a note in ${link(N.declog)}: the options, what you picked, who owns it, what would reverse it, and when to review it. Five minutes each.

**Week 3 — Wire up Claude Code.**
Point Claude Code at this folder. It reads the root \`CLAUDE.md\` and every folder's \`CLAUDE.md\` automatically, so it already knows how your company works. Ask it to process your week's Inbox into the Wiki for you, then update ${link(N.dashboard)} only with items that change decisions, people, capital, or operating state.

**Week 4 — Ask your company a question, and build an advisor.**
Try: "Based on our decision log, why did we choose our lead vendor?" — the answer comes back with links to the exact notes. Then run \`/build-advisor\` to create an AI advisor tuned to the decisions *you* actually face. See ${link(N.advTemplate)}.

## Jump in
- Today's operating surface → ${link(N.dashboard)}
- Today's state → ${link(N.memory)}
- The deep picture → ${link(N.intel)}
- Why we exist → ${link(N.mission)}
- Where we're headed → ${link(N.strategy)} and ${link(N.kpi)}
- A real decision → ${link(N.declog)}
- Build your own advisors → ${link(N.advTemplate)}
- Self-coaching templates → ${link(N.meetingReview)}, ${link(N.goalAlign)}, and your ${link(N.profile)}
`
  );

  // ======================================================================
  // Inbox/  Raw/  outputs/  — the data-flow folders
  // ======================================================================
  put(
    "Inbox/CLAUDE.md",
    `# Agent guide — Inbox/ (the front door)

Everything enters here first. Capturing always beats organising.

**Your job when triaging the Inbox:**
${d.inbox_rules.map((r) => `- ${r}`).join("\n")}

Flow: an item either becomes an immutable source in \`Raw/\`, gets distilled into a \`Wiki/\` note through dialogue, or is dropped. Never let the Inbox go stale — process it weekly. A full inbox is fine; a *stale* one is not.
`
  );
  put(
    `Inbox/${N.cap1}.md`,
    fm({ type: "capture", captured: todayMinus(1) }) +
      `# Capture: ${d.bets[0].name} follow-up

_Captured ${todayMinus(1)} — raw, unprocessed. This is what "just write it down" looks like._

Quick thought on our ${link(N.bet(0))} bet: worth pressure-testing next week. If it holds up, it becomes a decision in ${link(N.declog)}; if it needs a source document, that goes to Raw/.
` +
      related([N.bet(0), N.declog])
  );
  put(
    `Inbox/${N.cap2}.md`,
    fm({ type: "capture", captured: todayMinus(1) }) +
      `# Capture: ${d.kpis[0].name} signal

_Captured ${todayMinus(1)} — a metric signal to file._

Noticed movement in **${d.kpis[0].name}**. Link it to ${link(N.kpi)} and check whether it changes any ${link(N.strategy)} assumption.
` +
      related([N.kpi, N.strategy])
  );

  put(
    "Raw/CLAUDE.md",
    `# Agent guide — Raw/ (immutable sources)

This folder holds the **evidence**: meeting transcripts, source documents, clippings — exactly as captured.

**Rules:**
- **Never edit a file in Raw/.** It is the unaltered source of truth. If something is wrong, add a correction in the Wiki, not here.
- Each Raw file should be *cited* by the Wiki note it informs (e.g. a ${link(N.declog)} entry links its source transcript under "Linked Memos").
- Raw is append-only. Distillation happens in \`Wiki/\`, never here.
`
  );
  const rawTranscript = (m, daysAgo) =>
    fm({ type: "transcript", source: "meeting", date: todayMinus(daysAgo) }) +
    `# Transcript: ${m.title}

_Raw, immutable. Filed ${todayMinus(daysAgo)}. Type: ${m.type}. Attendees: ${(m.attendees || []).join(", ")}._

> [00:00] **${(m.attendees || ["Facilitator"])[0]}:** Let's start. ${m.notes}
> [04:12] **${(m.attendees || ["", "Second"])[1] || "Team"}:** Agreed — let's make that a decision and write down what would make us reverse it.
> [09:30] **${(m.attendees || ["Facilitator"])[0]}:** Good. Someone owns it, we set a review date, done.

This transcript is the source behind the summary in ${link(N.meet(m === d.meetings[0] ? 0 : 1))}.
`;
  put(`Raw/${N.raw1}.md`, rawTranscript(d.meetings[0], 7) + related([N.meet(0), N.declog]));
  put(`Raw/${N.raw2}.md`, rawTranscript(d.meetings[1], 14) + related([N.meet(1), N.declog]));

  put(
    "outputs/CLAUDE.md",
    `# Agent guide — outputs/ (generated products)

Query results, reports, and summaries an agent produces land here — for example the answer to "summarise every decision that touched pricing."

**Rules:**
- Everything here is **disposable**. It is derived from \`Wiki/\` and \`Raw/\`; regenerate it any time.
- Never let an \`outputs/\` file become the source of truth. If a generated summary contains a new fact, that fact belongs in the Wiki.
- Name outputs by the question they answer and the date, so they're easy to prune.
- \`outputs/steward/<date>.md\` holds the log of each \`/steward\` run. Disposable like everything else here — the durable record of a run is its git commit.

This folder starts empty — it fills up the first time you ask the brain a question with Claude Code.
`
  );

  // ======================================================================
  // Wiki/  — domain-oriented subfolders (the distilled truth)
  // ======================================================================

  // ---- Wiki/00_Company
  put(
    "Wiki/00_Company/CLAUDE.md",
    `# Agent guide — Wiki/00_Company

The company's identity: mission, structure, and shared language.

When working here:
- Treat ${link(N.mission)} as the source of truth for *why we exist*. Don't contradict it.
- Keep ${link(N.glossary)} authoritative: if a term is used elsewhere, define it here.
- ${link(N.structure)} reflects the current ${teamSize}-person org. If a role changes, update it and the affected ${link(N.role(0))} note.
- This folder is mostly stable. Prefer adding over rewriting.
`
  );
  put(
    "Wiki/00_Company/Mission and Vision.md",
    fm({ type: "company", status: "living" }) +
      `# Mission and Vision

${d.mission}

**Tagline:** *${d.tagline}*

## What we believe
- Context compounds. The more clearly we write down how we operate, the faster everyone — including our AI agents — gets.
- Decisions over opinions. We keep a written ${link(N.declog)} so we can learn from our own track record.
- Focus beats breadth, especially at ${teamSize} people. Our bets are deliberate; see ${link(N.strategy)}.

The fast-moving version of "where we are against this" lives in ${link(N.memory)}; the depth lives in ${link(N.intel)}.
` +
      related([N.structure, N.strategy, N.glossary, N.intel])
  );
  put(
    "Wiki/00_Company/Company Structure.md",
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
    "Wiki/00_Company/Glossary.md",
    fm({ type: "company", status: "living" }) +
      `# Glossary

The shared language of ${C}. If you use one of these words, mean this:

${d.glossary.map((g) => `- **${g.term}** — ${g.def}`).join("\n")}
` +
      related([N.mission, N.strategy])
  );

  // ---- Wiki/10_Strategy
  put(
    "Wiki/10_Strategy/CLAUDE.md",
    `# Agent guide — Wiki/10_Strategy

Where we're going: the annual strategy, our active bets, and the risks against them.

When working here:
- Every **bet** note states a one-sentence thesis and links at least one ${link(N.kpi)} metric that proves or kills it.
- Every **risk** note names an exposure *and* a mitigation, and links the bet it threatens.
- ${link(N.strategy)} is the hub — keep its links to bets and risks current.
- Don't invent strategy here; reflect decisions recorded in ${link(N.declog)}.
`
  );
  put(
    "Wiki/10_Strategy/Annual Strategy.md",
    fm({ type: "strategy", horizon: "annual", status: "active" }) +
      `# Annual Strategy

${C}'s plan for the year — a few deliberate bets, the risks we accept, and the numbers that tell us we're winning.

## Our bets
${d.bets.map((b, i) => `- ${link(N.bet(i))} — ${b.thesis}`).join("\n")}

## Risks we're watching
${d.risks.map((r, i) => `- ${link(N.risk(i))} — ${r.exposure}`).join("\n")}

## How we'll know it's working
Tracked in ${link(N.kpi)}. Connects back to ${link(N.mission)}.
` +
      related([
        N.bet(0), N.bet(1), N.bet(2), N.bet(3),
        N.risk(0), N.risk(1), N.risk(2), N.kpi, N.mission,
      ])
  );
  d.bets.forEach((b, i) => {
    const kpi = d.kpis[i % d.kpis.length].name;
    put(
      `Wiki/10_Strategy/${N.bet(i)}.md`,
      fm({ type: "bet", status: "active", owner: d.roles[i % d.roles.length].title }) +
        `# Bet: ${b.name}

**Thesis.** ${b.thesis}

**Why now.** One of ${C}'s active wagers for the year — see ${link(N.strategy)}.

**What proves it.** Watch **${kpi}** in ${link(N.kpi)}.

**What kills it.** The main threat is ${link(N.risk(i % d.risks.length))}.

**Owner.** ${link(N.role(i % d.roles.length))}.
` +
        related([N.strategy, N.kpi, N.risk(i % d.risks.length)])
    );
  });
  d.risks.forEach((r, i) => {
    put(
      `Wiki/10_Strategy/${N.risk(i)}.md`,
      fm({ type: "risk", severity: ["high", "medium", "medium"][i] || "medium" }) +
        `# Risk: ${r.name}

**Exposure.** ${r.exposure}

**Mitigation.** ${r.mitigation}

**Threatens.** ${link(N.bet(i % d.bets.length))} — and through it, the wider ${link(N.strategy)}.

If this risk materialises, log a decision in ${link(N.declog)}.
` +
        related([N.bet(i % d.bets.length), N.strategy, N.declog])
    );
  });
  put(
    "Wiki/10_Strategy/KPI Dashboard.md",
    fm({ type: "strategy", cadence: "monthly" }) +
      `# KPI Dashboard

The handful of numbers that tell ${C} whether the ${link(N.strategy)} is working. Reviewed monthly; the live reading lives in ${link(N.memory)}.

| Metric | Target |
|---|---|
${d.kpis.map((k) => `| ${k.name} | ${k.target} |`).join("\n")}

Each metric maps to at least one bet. Start with ${link(N.bet(0))} and ${link(N.bet(1))}.
` +
      related([N.strategy, N.bet(0), N.bet(1), N.memory])
  );

  // ---- Wiki/20_Operations
  put(
    "Wiki/20_Operations/CLAUDE.md",
    `# Agent guide — Wiki/20_Operations

How we actually run: playbooks, SOPs, and vendor notes.

When working here:
- A **playbook** must be runnable by a new hire with no supervision — concrete numbered steps, not principles.
- Link each playbook to the ${link(N.role(0))} who owns it and any ${link(N.vendors)} it depends on.
- When a process changes because of a decision, link the relevant ${link(N.declog)} note.
- Keep ${link(N.vendors)} current; an outdated vendor list is worse than none.
`
  );
  d.playbooks.forEach((p, i) => {
    put(
      `Wiki/20_Operations/${N.play(i)}.md`,
      fm({ type: "playbook", owner: d.roles[i % d.roles.length].title }) +
        `# Playbook: ${p.title}

A repeatable procedure for ${C}. Owned by ${link(N.role(i % d.roles.length))}.

## Steps
${(p.steps || []).map((s, j) => `${j + 1}. ${s}`).join("\n")}

## Dependencies
Relies on ${link(N.vendors)}. If you improve this playbook, capture why in the Inbox: ${link(N.cap1)}-style.
` +
        related([N.vendors, N.role(i % d.roles.length), N.declog])
    );
  });
  put(
    "Wiki/20_Operations/Vendor Notes.md",
    fm({ type: "operations", status: "living" }) +
      `# Vendor Notes

The outside partners ${C} depends on, and what each is for. Selecting a new one? Follow ${link(N.play(2))}.

${d.vendors.map((v) => `- **${v.name}** _(${v.category})_ — ${v.use}`).join("\n")}
` +
      related([N.play(0), N.play(2), N.declog])
  );

  // ---- Wiki/30_People  (+ advisor factory)
  put(
    "Wiki/30_People/CLAUDE.md",
    `# Agent guide — Wiki/30_People

Who does what: roles, onboarding, and the **advisor factory**.

When working here:
- Each **role** note states a single clear mandate and the playbooks it owns.
- ${link(N.onboarding)} is the first thing a new hire reads — keep it to the first 14 days.
- Never put performance details or sensitive personal data in the brain. Roles and mandates only.
- **Advisors:** ${link(N.advTemplate)} is the schema for any advisor; ${link(N.advRouter)} maps decision types to advisors. Build new ones with \`/build-advisor\`; invoke one with \`/advisor <name> <topic>\`.
`
  );
  d.roles.forEach((r, i) => {
    put(
      `Wiki/30_People/${N.role(i)}.md`,
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
    "Wiki/30_People/Onboarding.md",
    fm({ type: "people", status: "living" }) +
      `# Onboarding — First 14 Days

How a new joiner at ${C} gets productive fast: read the brain, shadow the rhythm, own one thing.

## Day 1–2 — Context
Read ${link(N.start)}, ${link(N.mission)}, ${link(N.memory)}, and ${link(N.structure)}. Skim ${link(N.glossary)}.

## Day 3–7 — Rhythm
Sit in on meetings (see ${link(N.meet(0))}) and read the latest ${link(N.declog)}.

## Day 8–14 — Ownership
Pick up one ${link(N.role(0))}-style responsibility and run your first 1-on-1 with ${link(N.oneonone)}. Fill in ${link(N.profile)} so the brain learns your voice.
` +
      related([N.start, N.memory, N.structure, N.role(0), N.oneonone, N.profile])
  );
  put(
    "Wiki/30_People/1on1 Template.md",
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

  // ---- advisor template (the schema)
  put(
    "Wiki/30_People/_advisor_template.md",
    fm({ type: "advisor-template", status: "meta" }) +
      `# Advisor Template (the schema for any advisor)

> We don't hand you a fixed panel of gurus. We give you a **way to build your own** — advisors tuned to the decisions *you* actually face. This file is the schema; ${link(N.advisor)} is one worked example; ${link(N.advRouter)} routes decisions to advisors. Run \`/build-advisor\` to create more.

Every advisor is one note with these sections:

**1. Name** — a real or fictional figure whose judgement fits a class of your decisions.
**2. When to invoke** — the decision types that should trigger this advisor.
**3. Core methodology** — 1–2 paragraphs on how they actually think.
**4. Question framework** — the specific sequence of questions they ask.
**5. Output format** — how they structure their analysis (e.g. recommendation, then risks, then the one thing that would change their mind).
**6. Anti-patterns** — when this advisor is *wrong*, and what they systematically miss.
**7. Worked example** — the advisor applied to one real decision from your ${link(N.declog)}.

## How to use
- To invoke an existing advisor on a question: \`/advisor <name> <topic>\`.
- To discover decision types and build advisors for them: \`/build-advisor\`.
- Register each advisor in ${link(N.advRouter)} so the right one (or the right *combination*) is suggested automatically.
` +
      related([N.advisor, N.advRouter, N.declog])
  );

  // ---- one worked example advisor (industry-picked by the LLM)
  put(
    `Wiki/30_People/${N.advisor}.md`,
    fm({ type: "advisor", status: "example" }) +
      `# Advisor: ${d.advisor.name}

_A worked example built from ${link(N.advTemplate)}. Replace or add your own with \`/build-advisor\`._

**Persona.** ${d.advisor.persona}

## When to invoke
${d.advisor.when_to_invoke} In practice, reach for ${d.advisor.name} on decisions like the ones in ${link(N.declog)} — especially ${link(N.dec(0))}.

## Core methodology
${d.advisor.core_method}

## Question framework
1. What decision are we actually making, and is it reversible?
2. What does the evidence in ${link(N.intel)} and the live state in ${link(N.memory)} say?
3. Who is the single owner, and what is the one metric that proves this worked?
4. What would have to be true for this to be a mistake?

## Output format
- **Recommendation** (one line)
- **Why** (tied to the methodology above)
- **The one thing that would change my mind**
- **Suggested entry for ${link(N.declog)}** (options, owner, reversal, review date)

## Anti-patterns (when ${d.advisor.name} is wrong)
- Over-indexes on what's measurable; may undervalue a slow-building, hard-to-quantify bet such as ${link(N.bet(1))}.
- Best on operational and reversible calls; for irreversible, mission-level bets, pair with a second advisor via ${link(N.advRouter)}.

## Worked example
Applied to ${link(N.dec(0))}: ${d.advisor.name} would ask whether the choice is reversible (it is), insist on one owner, and back the option that buys the most learning for the least commitment.
` +
      related([N.advTemplate, N.advRouter, N.dec(0), N.declog])
  );

  // ---- advisor router
  put(
    "Wiki/30_People/_advisor_router.md",
    fm({ type: "advisor-router", status: "meta" }) +
      `# Advisor Router (decision type → advisor)

> Maps the kinds of decisions you face to the advisor (or *combination* of advisors) best suited to them. \`/build-advisor\` keeps this current as you add advisors.

| Decision type | Advisor(s) | Why |
|---|---|---|
| ${d.decision_types[0]} | ${link(N.advisor)} | ${d.advisor.when_to_invoke} |
| ${d.decision_types[1]} | _(run \`/build-advisor\`)_ | _(name the figure who'd advise this best)_ |
| ${d.decision_types[2]} | _(run \`/build-advisor\` — try a combination)_ | _(for decisions that need two lenses)_ |

These three rows are the recurring decision types this company faces. Start from the schema in ${link(N.advTemplate)} and the worked example ${link(N.advisor)}; run \`/build-advisor\` to fill the empty rows. Route any logged choice in ${link(N.declog)} to the matching row.
` +
      related([N.advTemplate, N.advisor, N.declog])
  );

  // ---- self-coaching starter templates (blank — the visitor fills these in)
  put(
    "Wiki/30_People/Your Profile.md",
    fm({ type: "person", status: "starter" }) +
      `# Your Profile

_Rename this note to your first name. This is how the brain — and your advisors — understand **you**: how you decide and how you communicate. Blank on purpose; fill it in._

## Communication Style Profile
_Capture how you actually sound to each audience. Paste two or three real sentences you would genuinely say to each — the AI learns your voice from real examples, not adjectives._

### Voice for ${d.stakeholders[0]}
_(empty — add 2–3 sentences in your real voice)_

### Voice for ${d.stakeholders[1]}
_(empty)_

### Voice for ${d.stakeholders[2]}
_(empty)_
` +
      related([N.onboarding, N.structure])
  );
  put(
    "Wiki/50_Meetings/_meeting-review-template.md",
    fm({ type: "template", status: "blank" }) +
      `# Meeting Review — _(copy this per meeting)_

_A self-coaching template. After a meeting, copy this note, rename it, and fill the four sections honestly — it's for you, not the record._

## Decided
_What was actually decided? List each decision and its single owner. Anything real becomes an entry in ${link(N.declog)}._

## Punted
_What did we defer or quietly avoid deciding? Name it plainly — punts hide in the gaps._

## Behavioral flags for you
_Where did you slip — scope creep, researching instead of deciding, conceding too early, dithering on a reversible call? See the guardrails in the root \`CLAUDE.md\`._

## Comparison to prior similar meeting
_How did this compare to the last meeting of this type? Better, worse, or the same trap again?_
` +
      related([N.declog, N.meet(0)])
  );
  put(
    "Wiki/10_Strategy/_goal-alignment-template.md",
    fm({ type: "template", status: "blank" }) +
      `# Goal Alignment — _(run this every two weeks)_

_A self-coaching template. Declare your goals, look at where your time actually went, score the gap, and adjust. Blank on purpose._

## Q OKRs declared
_Your objectives and key results this quarter. Replace these example prompts with your own:_
- _${d.okr_examples[0]}_
- _${d.okr_examples[1]}_
- _${d.okr_examples[2]}_

## Activity distribution last 14 days
_Where did your hours actually go? Rough percentages by area — be honest, not aspirational._

## Alignment scoring
_For each OKR above, did your activity actually move it? Score 1–5 and note the gap._

## Recommended adjustments
_What will you stop, start, or shift over the next two weeks to close the gap?_
` +
      related([N.strategy, N.kpi])
  );

  // ---- Wiki/40_Decisions  (enhanced template)
  put(
    "Wiki/40_Decisions/CLAUDE.md",
    `# Agent guide — Wiki/40_Decisions

The most important folder in the company: the written memory of every consequential choice.

**Every decision note MUST record all six fields:**
- **Options Considered** — at least two real alternatives.
- **Owner** — the single person accountable.
- **Decision Date** — when it was made.
- **Reversal Conditions** — the signal that would make us undo it.
- **Linked Memos** — the \`Raw/\` source(s) and meetings behind it.
- **Six-month Review Date** — when we revisit whether it still holds.

See ${link(N.dec(0))} for a fully filled-in example.

**Never edit a past decision.** If a decision changes, write a *new* note that supersedes it and link back. Keep ${link(N.declog)} as the index of everything.
`
  );
  put(
    "Wiki/40_Decisions/Decision Log.md",
    fm({ type: "decision-index", status: "living" }) +
      `# Decision Log

Every consequential choice ${C} has made, newest first. Click any decision for the options, the owner, the reversal conditions, and the review date.

${d.decisions.map((x, i) => `- ${link(N.dec(i))} — *${x.choice}*`).join("\n")}

The backbone of the brain — connects to ${link(N.strategy)} and feeds ${link(N.memory)}.
` +
      related([N.dec(0), N.dec(1), N.dec(2), N.dec(3), N.dec(4), N.strategy, N.memory])
  );
  d.decisions.forEach((dec, i) => {
    const meetIdx = i % d.meetings.length;
    const linkedRaw = i === 0 ? N.raw1 : i === 1 ? N.raw2 : null;
    const memos = [link(N.meet(meetIdx))].concat(linkedRaw ? [link(linkedRaw)] : []);
    put(
      `Wiki/40_Decisions/${N.dec(i)}.md`,
      fm({ type: "decision", date: todayMinus((i + 1) * 9), owner: d.roles[i % d.roles.length].title }) +
        `# Decision: ${dec.title}

## Context
${dec.context}

## Options considered
${(dec.options || []).map((o) => `- ${o}`).join("\n")}

## Decision
**${dec.choice}.** ${dec.rationale}

## Owner
${link(N.role(i % d.roles.length))}

## Decision date
${todayMinus((i + 1) * 9)}

## Reversal conditions
${dec.reversal}

## Linked memos
${memos.map((m) => `- ${m}`).join("\n")}

## Six-month review date
${todayPlus(180 - (i + 1) * 9)} — revisit whether this still holds.
` +
        related(
          [N.declog, N.bet(i % d.bets.length), N.meet(meetIdx), N.role(i % d.roles.length)]
            .concat(linkedRaw ? [linkedRaw] : [])
        )
    );
  });

  // ---- Wiki/50_Meetings
  put(
    "Wiki/50_Meetings/CLAUDE.md",
    `# Agent guide — Wiki/50_Meetings

Meeting summaries, distilled from transcripts in \`Raw/\`.

When working here:
- One note per meeting. Capture **decisions** and **owners**, not a transcript (the transcript lives in \`Raw/\`).
- If a meeting produced a decision, create the note in ${link(N.declog)} and link it both ways.
- Each summary should cite its source transcript in \`Raw/\`.
- Title format: \`Meeting - <topic>\`, with date and attendees.
`
  );
  d.meetings.forEach((m, i) => {
    const decIdx = i % d.decisions.length;
    const src = i === 0 ? N.raw1 : i === 1 ? N.raw2 : null;
    put(
      `Wiki/50_Meetings/${N.meet(i)}.md`,
      fm({ type: "meeting", date: todayMinus((i + 1) * 7), category: m.type }) +
        `# ${m.title}

**Date.** ${todayMinus((i + 1) * 7)}  ·  **Type.** ${m.type}
**Attendees.** ${(m.attendees || []).join(", ")}
${src ? `**Source transcript.** ${link(src)} (immutable, in Raw/)\n` : ""}
## Summary
${m.notes}

## Decisions made
Fed ${link(N.dec(decIdx))}. See the full ${link(N.declog)}.
` +
        related([N.dec(decIdx), N.declog, N.role(i % d.roles.length)].concat(src ? [src] : []))
    );
  });

  // ======================================================================
  // .claude/commands — visitor-facing advisor commands (also in skeleton/)
  // ======================================================================
  put(
    ".claude/commands/build-advisor.md",
    `---
description: Live-discover your recurring decision types and draft a custom AI advisor for each
allowed-tools: Read, Glob, Grep, Write
model: claude-haiku-4-5-20251001
effort: low
---

# /build-advisor — advisor factory (live discovery)

Run this as a fast, scripted-feeling sequence — the whole loop should feel near-instant (well under 30 seconds after the visitor answers). You don't impose a fixed panel of gurus; you help the visitor build advisors tuned to the decisions *they* actually face. **Do not read any other files** — everything you need is in this command. Do the minimum: present, ask, write one file, print Done.

## Step 1 — Scan (print this line verbatim, then continue immediately)
> Scanning Raw/ and Wiki/40_Decisions/ for recurring decision types...

The three recurring decision types below were identified when this brain was generated. Do not re-analyse — just present them.

## Step 2 — Present the three decision types (print as a numbered list)
1. ${d.decision_types[0]}
2. ${d.decision_types[1]}
3. ${d.decision_types[2]}

## Step 3 — Ask, then STOP and wait
Ask in one line:
> "Who in history — real or fictional — would be the best advisor here? Name one (or one per type)."

## Step 4 — Draft instantly (the critical path)
For each advisor the visitor names, immediately **Write** \`Wiki/30_People/<advisor_slug>.md\` (slug = lowercase, hyphenated name) with these sections, filled from what you know about that figure — no file reads needed:
\`# Advisor: <Name>\` · **When to invoke** (tie to the matching decision type above) · **Core methodology** (1 short paragraph) · **Question framework** (3–4 questions) · **Output format** (a few bullets) · **Anti-patterns** (when they're wrong) · **Worked example** (apply them to one decision from \`Wiki/40_Decisions/\`). Keep it tight. Naming only one advisor is fine.

## Step 5 — Print Done (this is the finish line)
Print exactly:
> Done — drafted Wiki/30_People/<advisor_slug>.md. Try \`/advisor <name> <topic>\` to invoke.

## Step 6 — Optional, only if asked
Offer to add a row to ${link(N.advRouter)} mapping the decision type to the new advisor, and to promote a heavily-used advisor into a reusable skill (\`.claude/skills/<name>/SKILL.md\`). Don't block the finish line on this.
`
  );
  put(
    ".claude/commands/advisor.md",
    `---
description: Invoke one of your advisors on a topic — /advisor <name> <topic>
argument-hint: <name> <topic>
allowed-tools: Read, Glob, Grep
---

# /advisor — consult an advisor

Consult the advisor named **$1** on the topic: **$2**.

## Steps
1. **Find** the advisor's note in \`Wiki/30_People/\`. Try, in order: \`Advisor - $1.md\`, then \`$1.md\` (and a lowercase-hyphenated slug of $1), then glob \`Wiki/30_People/*$1*.md\`. If none exists, list the advisors in \`Wiki/30_People/\` and ask the visitor to pick one (or to run \`/build-advisor\` to create it).
2. **Ground** the analysis: read \`MEMORY.md\` for current state and skim \`Intelligence_snapshot.md\` and the relevant \`Wiki/40_Decisions/\` notes.
3. **Run the advisor's own Question framework** from their note, then produce their analysis in their **Output format** — in character with their Core methodology, and honestly noting their Anti-patterns where they apply.
4. **Close** with a suggested \`Wiki/40_Decisions/\` entry (options, owner, reversal conditions, six-month review date) if a decision is warranted.
`
  );
  // ---- /steward — the scheduled upkeep pass.
  // Written to run unattended from a fresh session, so it must be entirely
  // self-contained: a scheduled run remembers nothing from the last one.
  // git push is omitted on purpose: the GitHub Action pushes in a later step,
  // and a local run must not push on its own. Path denies for Raw/, CLAUDE.md,
  // and Wiki/40_Decisions/ live in .claude/settings.json — Claude Code enforces
  // those; the prompt cannot.
  const stewardAllowedTools =
    "Read, Glob, Grep, Write, Edit, Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(mv:*)";
  const stewardAllowedToolsArg =
    "Read,Glob,Grep,Write,Edit,Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git log:*),Bash(git diff:*),Bash(git rev-parse:*),Bash(mv:*)";

  put(
    ".claude/settings.json",
    `{
  "permissions": {
    "deny": [
      "Bash(git push *)",
      "Bash(git push:*)",
      "Edit(CLAUDE.md)",
      "Edit(**/CLAUDE.md)",
      "Edit(Wiki/40_Decisions/**)",
      "Edit(Raw/**)"
    ]
  }
}
`
  );

  put(
    ".claude/commands/steward.md",
    `---
description: Process the Inbox into the Wiki, refresh the operating surface, and commit the day's changes
allowed-tools: ${stewardAllowedTools}
---

# /steward — scheduled brain steward

Keep the ${C} brain moving without a human having to remember to do it. Run this
on a schedule, or by hand whenever the Inbox has piled up.

**Every run starts a fresh session with no memory of any previous run.**
Everything you need is in this file and in the vault itself. Work only inside
this vault.

## Ground yourself first
Read, in this order:
1. \`CLAUDE.md\` — the rules you operate under here.
2. \`MEMORY.md\` — where things stand right now.

## 1. Triage \`Inbox/\`
For every file in \`Inbox/\`:
- **Looks like a secret** (\`.env\`, \`*.pem\`, \`*.key\`, \`id_rsa\`, filenames containing
  \`credential\` or \`secret\`) → leave it in Inbox and list it for a human. Never
  move it to \`Raw/\` and never stage it.
- **A lasting source** (a transcript, a document, a clipping) → move the file
  *verbatim* into \`Raw/\`. Never rewrite a source while filing it.
- **Meaning worth keeping** → distil it into the right \`Wiki/\` domain folder, and
  link the \`Raw/\` note it came from. Follow that folder's own \`CLAUDE.md\`.
- **Neither, or you cannot tell** → leave it where it is and list it in the run
  log as needing a human. Never delete something you did not understand.

Every claim you add to the Wiki must be traceable to a \`Raw/\` file or to the
Inbox item you are processing. If you cannot cite it, do not write it.

## 2. Refresh \`MEMORY.md\`
Update the quarter focus, urgent and in-flight work, team deployment, and recent
decisions to match what you just filed, and set the \`updated:\` date. Keep it to
one page — it is a snapshot of the present, not a log.

## 3. Apply the Dashboard admission bar
Add or keep an item on \`Dashboard.md\` only if it can **change a decision,
unblock a person, protect capital, or update the operating state**. Move
anything that no longer clears that bar into the relevant Wiki note. The
Dashboard is an operating surface, not a knowledge wall.

## 4. Propose decisions — never write them
If something you filed reads like a settled choice, draft the decision note
**in the run log**, in the schema \`Wiki/40_Decisions/CLAUDE.md\` requires (options
considered, owner, decision date, reversal conditions, linked memos, six-month
review date), for a human to accept or reject. Do not create, edit, or supersede
anything in \`Wiki/40_Decisions/\` yourself.

## 5. Write the run log
Write \`outputs/steward/<YYYY-MM-DD>.md\`: what you filed and where, which Wiki
notes you changed, the decision notes you are proposing, and anything you left
for a human. Keep it short — \`outputs/\` is disposable, and git is the durable
record.

## 6. Commit
Stage only the paths this pass is allowed to change, then commit with a one-line
summary — for example \`steward: filed 3 inbox items, proposed 1 decision\`:

\`\`\`
git add -- Inbox/ Raw/ MEMORY.md Dashboard.md Wiki/ ':!**/CLAUDE.md' ':!Wiki/40_Decisions'
git add -- outputs/steward/<YYYY-MM-DD>.md
\`\`\`

Do not use \`git add -A\`. **Do not push.** Pushing is the human's call (or the
workflow step that runs after this command). Make it only if they have
explicitly asked you to.

If this vault is not a git repository, skip this step and say so in your summary.

## Never
- Edit or delete a note in \`Wiki/40_Decisions/\`. Superseding a decision is a
  human act.
- Edit anything in \`Raw/\`. It is the evidence.
- Edit \`CLAUDE.md\`, at the root or in any folder. The rules and the behavioural
  guardrails belong to the human.
- Assert a fact you cannot trace to an Inbox item or a \`Raw/\` file.
- Touch anything outside this vault.
- Run \`git push\`. The allowlist does not include it.

## Finish
Report what you filed, what you changed, what you are proposing, and what needs a
human. An empty Inbox with nothing to change is a fine outcome — say so and stop
without committing.
`
  );

  // ---- .github/workflows/steward.yml — schedules /steward on GitHub.
  // Inert inside this starter repo (GitHub only reads .github/workflows at
  // the repository root); live once the vault is its own repo. Built from
  // ordinary strings, not a template literal, because the workflow is full
  // of ${{ }} expressions that a template literal would try to interpolate.
  put(
    ".github/workflows/steward.yml",
    [
      "# Nightly brain steward.",
      "#",
      "# Runs the /steward upkeep pass over this vault and pushes the result.",
      "#",
      "# Inert until you add a credential: set either ANTHROPIC_API_KEY or",
      "# CLAUDE_CODE_OAUTH_TOKEN as a repository secret (Settings -> Secrets and",
      "# variables -> Actions). Without one the job finishes green and does nothing,",
      "# rather than failing every night. Both inputs are passed through; an empty",
      "# secret is ignored, so either credential is enough.",
      "#",
      "# Worth knowing before you trust the schedule:",
      "#   - GitHub runs scheduled workflows only from the default branch, and on",
      "#     public repositories it disables the schedule after 60 days with no",
      "#     repository activity.",
      "#   - A scheduled run is attributed to whoever last edited the cron line. If",
      "#     that account is a bot, add it to the action's allowed_bots input.",
      "#   - Run it by hand from the Actions tab a few times first. The early runs are",
      "#     where you find out whether its triage judgment matches yours.",
      "name: Brain steward",
      "",
      "on:",
      "  schedule:",
      '    - cron: "0 3 * * *"',
      "  workflow_dispatch:",
      "",
      "permissions:",
      "  contents: write",
      "  id-token: write",
      "",
      "concurrency:",
      "  group: brain-steward",
      "  cancel-in-progress: false",
      "",
      "jobs:",
      "  steward:",
      "    runs-on: ubuntu-latest",
      "    timeout-minutes: 20",
      "    steps:",
      "      - name: Check for a Claude credential",
      "        id: creds",
      "        env:",
      "          API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}",
      "          OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}",
      "        run: |",
      '          if [ -n "$API_KEY" ] || [ -n "$OAUTH_TOKEN" ]; then',
      '            echo "configured=true" >> "$GITHUB_OUTPUT"',
      "          else",
      '            echo "configured=false" >> "$GITHUB_OUTPUT"',
      '            echo "No ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN secret is set, so the steward did not run." >> "$GITHUB_STEP_SUMMARY"',
      "          fi",
      "",
      "      - name: Check out the vault",
      "        if: steps.creds.outputs.configured == 'true'",
      "        uses: actions/checkout@v6",
      "        with:",
      "          fetch-depth: 0",
      "",
      "      - name: Give the steward a git identity",
      "        if: steps.creds.outputs.configured == 'true'",
      "        run: |",
      '          git config user.name "brain-steward[bot]"',
      '          git config user.email "brain-steward@users.noreply.github.com"',
      "",
      "      - name: Run the steward",
      "        if: steps.creds.outputs.configured == 'true'",
      "        uses: anthropics/claude-code-action@v1",
      "        with:",
      "          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}",
      "          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}",
      "          prompt: |",
      "            Read .claude/commands/steward.md and carry out its instructions",
      "            exactly, on this repository. Honour every limit it sets, including",
      '            all of the ones listed under "Never".',
      "            Do not push. A later workflow step does that.",
      "          # A plain-text prompt does not inherit the command file's",
      "          # allowed-tools frontmatter, so the same tools are granted here.",
      "          # git push is omitted from the allowlist; .claude/settings.json also",
      "          # denies it, plus edits to Raw/, CLAUDE.md, and Wiki/40_Decisions/.",
      "          claude_args: |",
      '            --allowedTools "' + stewardAllowedToolsArg + '"',
      '            --disallowedTools "Bash(git push:*),Bash(git push *)"',
      "            --max-turns 40",
      "",
      "      - name: Push what the steward committed",
      "        if: steps.creds.outputs.configured == 'true'",
      "        run: |",
      '          if [ -n "$(git log "origin/${GITHUB_REF_NAME}..HEAD" --oneline)" ]; then',
      '            git push origin "HEAD:${GITHUB_REF_NAME}"',
      "            echo \"Pushed the steward's commit.\" >> \"$GITHUB_STEP_SUMMARY\"",
      "          else",
      '            echo "Nothing to push - the steward made no commit." >> "$GITHUB_STEP_SUMMARY"',
      "          fi",
      "",
    ].join("\n")
  );


  return files;
}

// ----------------------------------------------------------------------------
// 3. write + zip + report
// ----------------------------------------------------------------------------
function writeAll(map) {
  if (existsSync(outDir) && (SKELETON || REQUESTED_OUT)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  for (const [rel, body] of Object.entries(map)) {
    const full = join(outDir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body, "utf8");
  }
}

function countLinks(map) {
  let total = 0, minLinks = Infinity, hubs = 0;
  const sampleNotes = Object.entries(map).filter(
    ([p]) =>
      !p.endsWith("CLAUDE.md") &&
      !p.startsWith(".claude/") &&
      !p.startsWith(".github/")
  );
  for (const [, body] of sampleNotes) {
    const n = (body.match(/\[\[/g) || []).length;
    total += n;
    minLinks = Math.min(minLinks, n);
    if (n >= 6) hubs++;
  }
  return {
    files: Object.keys(map).length,
    sampleNotes: sampleNotes.length,
    links: total,
    minLinksInSample: minLinks === Infinity ? 0 : minLinks,
    hubs,
  };
}

async function zipVault() {
  mkdirSync(zipDir, { recursive: true });
  const zipPath = join(zipDir, `${slug}.zip`);
  rmSync(zipPath, { force: true });
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
  console.log(`   ${stats.files} files · ${stats.sampleNotes} sample notes · ${stats.links} wikilinks · ${stats.hubs} hubs`);
} else {
  console.log(`\n🧠  Company brain blueprint generated for: ${industry} (${teamSize})${focus ? ` — ${focus}` : ""}`);
  console.log(`    Company: ${data.company_name}   ·   Advisor: ${data.advisor.name}`);
  console.log(`    Model: ${source}   ·   Wall time: ${secs}s`);
  console.log(`\n📁  Vault: ${outDir}`);
  console.log(`    ${stats.files} files · ${stats.sampleNotes} sample notes · ${stats.links} wikilinks · ${stats.hubs} hub notes (6+ links) · min links/note ${stats.minLinksInSample}`);
  if (zipPath) console.log(`📦  Zip:   ${zipPath}`);
}

console.log(
  "REPORT_JSON " +
    JSON.stringify({
      industry, teamSize, focus, company: data.company_name,
      advisor: data.advisor.name, source, seconds: Number(secs),
      outDir, zipPath, ...stats,
    })
);

// ---- Trophy moment: the bloom. Launch Obsidian on the finished vault last.
if (!SKELETON) {
  console.log(`\n✅ Blueprint ready: ${outDir}/`);
  if (!NO_OPEN) {
    console.log(`   Opening in Obsidian (graph view) →`);
    try {
      await execFileP("open", ["-a", "Obsidian", outDir]);
    } catch {
      console.log(`   (Could not auto-open — run: open -a Obsidian "${outDir}")`);
    }
    console.log(
      `   If Obsidian is already open with another vault: in Obsidian → vault switcher\n` +
      `   (bottom-left) → Open another vault → Open folder as vault → select the path above.`
    );
  }
}
