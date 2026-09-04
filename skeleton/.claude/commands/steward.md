---
description: Process the Inbox into the Wiki, refresh the operating surface, and commit the day's changes
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(mv:*)
---

# /steward — scheduled brain steward

Keep the Your Company brain moving without a human having to remember to do it. Run this
on a schedule, or by hand whenever the Inbox has piled up.

**Every run starts a fresh session with no memory of any previous run.**
Everything you need is in this file and in the vault itself. Work only inside
this vault.

## Ground yourself first
Read, in this order:
1. `CLAUDE.md` — the rules you operate under here.
2. `MEMORY.md` — where things stand right now.

## 1. Triage `Inbox/`
For every file in `Inbox/`:
- **Looks like a secret** (`.env`, `*.pem`, `*.key`, `id_rsa`, filenames containing
  `credential` or `secret`) → leave it in Inbox and list it for a human. Never
  move it to `Raw/` and never stage it.
- **A lasting source** (a transcript, a document, a clipping) → move the file
  *verbatim* into `Raw/`. Never rewrite a source while filing it.
- **Meaning worth keeping** → distil it into the right `Wiki/` domain folder, and
  link the `Raw/` note it came from. Follow that folder's own `CLAUDE.md`.
- **Neither, or you cannot tell** → leave it where it is and list it in the run
  log as needing a human. Never delete something you did not understand.

Every claim you add to the Wiki must be traceable to a `Raw/` file or to the
Inbox item you are processing. If you cannot cite it, do not write it.

## 2. Refresh `MEMORY.md`
Update the quarter focus, urgent and in-flight work, team deployment, and recent
decisions to match what you just filed, and set the `updated:` date. Keep it to
one page — it is a snapshot of the present, not a log.

## 3. Apply the Dashboard admission bar
Add or keep an item on `Dashboard.md` only if it can **change a decision,
unblock a person, protect capital, or update the operating state**. Move
anything that no longer clears that bar into the relevant Wiki note. The
Dashboard is an operating surface, not a knowledge wall.

## 4. Propose decisions — never write them
If something you filed reads like a settled choice, draft the decision note
**in the run log**, in the schema `Wiki/40_Decisions/CLAUDE.md` requires (options
considered, owner, decision date, reversal conditions, linked memos, six-month
review date), for a human to accept or reject. Do not create, edit, or supersede
anything in `Wiki/40_Decisions/` yourself.

## 5. Write the run log
Write `outputs/steward/<YYYY-MM-DD>.md`: what you filed and where, which Wiki
notes you changed, the decision notes you are proposing, and anything you left
for a human. Keep it short — `outputs/` is disposable, and git is the durable
record.

## 6. Commit
Stage only the paths this pass is allowed to change, then commit with a one-line
summary — for example `steward: filed 3 inbox items, proposed 1 decision`:

```
git add -- Inbox/ Raw/ MEMORY.md Dashboard.md Wiki/ ':!**/CLAUDE.md' ':!Wiki/40_Decisions'
git add -- outputs/steward/<YYYY-MM-DD>.md
```

Do not use `git add -A`. **Do not push.** Pushing is the human's call (or the
workflow step that runs after this command). Make it only if they have
explicitly asked you to.

If this vault is not a git repository, skip this step and say so in your summary.

## Never
- Edit or delete a note in `Wiki/40_Decisions/`. Superseding a decision is a
  human act.
- Edit anything in `Raw/`. It is the evidence.
- Edit `CLAUDE.md`, at the root or in any folder. The rules and the behavioural
  guardrails belong to the human.
- Assert a fact you cannot trace to an Inbox item or a `Raw/` file.
- Touch anything outside this vault.
- Run `git push`. The allowlist does not include it.

## Finish
Report what you filed, what you changed, what you are proposing, and what needs a
human. An empty Inbox with nothing to change is a fine outcome — say so and stop
without committing.
