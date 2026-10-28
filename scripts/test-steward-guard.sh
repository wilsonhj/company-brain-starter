#!/usr/bin/env bash
# Run the steward "guarded paths" step from skeleton/.github/workflows/steward.yml
# against a temporary repository. core.quotePath is forced on (GitHub's default)
# except for the one case that turns it off.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
workflow="$root/skeleton/.github/workflows/steward.yml"

# This sandbox injects core.quotePath=false through GIT_CONFIG_KEY_*, which
# outranks `git config` in the repo. Drop it so the fixture's own setting wins.
unset GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

guard_script="$work/guard.sh"
summary="$work/step-summary"
origin="$work/origin.git"
repo="$work/repo"

awk '
  $0 == "      - name: Refuse a commit that touches guarded paths" {
    in_step = 1
    next
  }
  in_step && /^      - name: / { exit }
  in_step && $0 == "        run: |" { in_run = 1; next }
  in_run && substr($0, 1, 10) == "          " { print substr($0, 11); next }
  in_run { exit }
' "$workflow" > "$guard_script"

if ! grep -q 'git diff -z --name-status --no-renames' "$guard_script"; then
  echo "failed to extract the guarded-paths step from $workflow" >&2
  exit 1
fi

git init -q --bare "$origin"
git init -q -b main "$repo"
cd "$repo"
git config user.email "guard-test@example.com"
git config user.name "Guard Test"
git config commit.gpgsign false
git config core.quotepath true

mkdir -p Raw Inbox Wiki/40_Decisions .claude .github/workflows
printf 'plain\n' > Raw/plain.md
printf 'cafe\n' > 'Raw/Café transcript.md'
printf 'meeting\n' > 'Raw/会议.md'
printf 'hi\n' > 'Raw/say "hi".md'
printf 'src\n' > Raw/rename-src.md
printf 'note\n' > Inbox/note.md
printf 'rules\n' > CLAUDE.md
printf 'decision\n' > Wiki/40_Decisions/Decision.md
printf '{}\n' > .claude/steward-settings.json
printf 'name: steward\n' > .github/workflows/steward.yml

git add -A
git commit -q -m 'base'
export GITHUB_REF_NAME=main
export GITHUB_STEP_SUMMARY="$summary"
git remote add origin "$origin"
git push -q origin "HEAD:${GITHUB_REF_NAME}"
base_commit="$(git rev-parse HEAD)"
git rev-parse "origin/${GITHUB_REF_NAME}" >/dev/null

if [[ "$(git config --get core.quotepath)" != "true" ]]; then
  echo "core.quotepath is not true in the fixture repo" >&2
  exit 1
fi

fail=0

prepare() {
  git reset -q --hard "$base_commit"
  git clean -q -fd
  git config core.quotepath true
  : > "$GITHUB_STEP_SUMMARY"
}

commit_dirty() {
  if [[ -n "$(git status --porcelain)" ]]; then
    git add -A
    git commit -q -m "$1"
  fi
}

# Non-empty when Git C-quoted a path. Proves quotePath is actually in effect,
# so a parser that forgets -z cannot pass the non-ASCII cases by accident.
require_c_quoted() {
  local label="$1"
  local diff
  diff="$(git diff --name-status --no-renames "origin/${GITHUB_REF_NAME}..HEAD")"
  if [[ "$diff" != *$'\t"'* ]]; then
    printf 'setup error: %s did not C-quote the path:\n%s\n' "$label" "$diff" >&2
    exit 1
  fi
}

expect() {
  local name="$1"
  local want="$2"
  local got=0
  local out
  out="$(bash "$guard_script" 2>&1)" || got=$?
  if [[ "$got" -eq "$want" ]]; then
    printf 'PASS  %s  exit %s\n' "$name" "$got"
  else
    printf 'FAIL  %s  expected exit %s, got %s\n' "$name" "$want" "$got" >&2
    printf '%s\n' "$out" >&2
    echo "----- git diff --name-status -----" >&2
    git diff --name-status --no-renames "origin/${GITHUB_REF_NAME}..HEAD" >&2 || true
    echo "----- step summary -----" >&2
    cat "$GITHUB_STEP_SUMMARY" >&2 || true
    fail=1
  fi
}

prepare
printf '\nchanged\n' >> Raw/plain.md
commit_dirty 'modify plain'
expect 'modify Raw/plain.md' 1

prepare
printf 'new\n' > 'Raw/naïve.md'
commit_dirty 'add naive'
expect 'add Raw/naïve.md' 0

prepare
printf '\nchanged\n' >> 'Raw/Café transcript.md'
commit_dirty 'modify cafe'
require_c_quoted 'modify Raw/Café transcript.md'
expect 'modify Raw/Café transcript.md' 1

prepare
printf '\nchanged\n' >> 'Raw/会议.md'
commit_dirty 'modify meeting'
require_c_quoted 'modify Raw/会议.md'
expect 'modify Raw/会议.md' 1

prepare
git rm -q -- 'Raw/会议.md'
commit_dirty 'delete meeting'
require_c_quoted 'delete Raw/会议.md'
expect 'delete Raw/会议.md' 1

prepare
printf '\nchanged\n' >> 'Raw/say "hi".md'
commit_dirty 'modify quoted name'
git config core.quotepath false
if [[ "$(git config --get core.quotepath)" != "false" ]]; then
  echo "core.quotepath did not switch to false" >&2
  exit 1
fi
require_c_quoted 'modify Raw/say "hi".md'
expect 'modify Raw/say "hi".md (core.quotepath false)' 1

prepare
git mv Raw/rename-src.md Raw/rename-dst.md
commit_dirty 'rename raw'
expect 'rename Raw file to another Raw name' 1

prepare
git rm -q -- Inbox/note.md
commit_dirty 'delete inbox'
expect 'delete Inbox/note.md only' 0

prepare
printf '\nchanged\n' >> CLAUDE.md
commit_dirty 'modify claude'
expect 'modify CLAUDE.md' 1

prepare
printf '\nchanged\n' >> Wiki/40_Decisions/Decision.md
commit_dirty 'modify decision'
expect 'modify Wiki/40_Decisions/Decision.md' 1

prepare
printf '\nchanged\n' >> .claude/steward-settings.json
commit_dirty 'modify claude settings'
expect 'modify .claude/steward-settings.json' 1

prepare
printf '\nchanged\n' >> .github/workflows/steward.yml
commit_dirty 'modify workflow'
expect 'modify .github/workflows/steward.yml' 1

prepare
expect 'no commit ahead of origin' 0

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
