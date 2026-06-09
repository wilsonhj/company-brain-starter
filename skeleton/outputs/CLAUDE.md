# Agent guide — outputs/ (generated products)

Query results, reports, and summaries an agent produces land here — for example the answer to "summarise every decision that touched pricing."

**Rules:**
- Everything here is **disposable**. It is derived from `Wiki/` and `Raw/`; regenerate it any time.
- Never let an `outputs/` file become the source of truth. If a generated summary contains a new fact, that fact belongs in the Wiki.
- Name outputs by the question they answer and the date, so they're easy to prune.

This folder starts empty — it fills up the first time you ask the brain a question with Claude Code.
