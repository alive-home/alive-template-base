#!/usr/bin/env bash
# Versions for people who never see git. The agent runs this; the person only hears "saved",
# "added to the main version" or "back to Tuesday's version". See .claude/skills/versions.
#
#   scripts/versions.sh status                  where this session's work stands
#   scripts/versions.sh sync                    catch up with the main version before working
#   scripts/versions.sh ship "<what changed>" ["<details>"]
#                                               save the work and add it to the main version
#   scripts/versions.sh history [count]         the main version's timeline, newest first
#   scripts/versions.sh undo <version>          take back one version, keep everything after it
#   scripts/versions.sh restore <version>       make the project's files match an earlier version
#
# Nothing here rewrites history: undo and restore add a new version on top, so they can be undone
# in turn. Platform branches (alive/*) are never touched.
#
# Exit codes: 0 done, 1 problem (message says which), 2 conflict to resolve, 3 checks failed,
# 4 checks still running (run ship again), 5 the main version needs a teammate's approval.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# The agent's notes travel forward on their own: restoring an old version of the product must not
# also bring back an old version of what the agent has learned.
KEEP_ON_RESTORE=(":(top,exclude)AGENTS.md" ":(top,exclude)CLAUDE.md" ":(top,exclude)MEMORY.md" ":(top,exclude).claude")
CHECKS_WAIT="${VERSIONS_CHECKS_WAIT:-100}"
GH_BIN="gh"
[ -x /home/user/.alive/alive-gh ] && GH_BIN=/home/user/.alive/alive-gh

say() { printf '%s\n' "$*"; }
die() {
  local code="$1"
  shift
  say "$*" >&2
  exit "$code"
}
has_remote() { git remote get-url origin >/dev/null 2>&1; }
dirty() { [ -n "$(git status --porcelain)" ]; }
current_branch() { git symbolic-ref --quiet --short HEAD || die 1 "Not on a branch; switch to one first."; }
on_github() { has_remote && git remote get-url origin | grep -q 'github\.com' && command -v "$GH_BIN" >/dev/null; }

MAIN="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
MAIN="${MAIN#origin/}"
MAIN="${MAIN:-main}"

# Network git with retries on auth errors only: Alive rotates the git credential every few
# minutes, so one auth failure right after a pause is expected and passes by itself.
net() {
  local attempt out
  for attempt in 1 2 3 4 5; do
    if out="$("$@" 2>&1)"; then return 0; fi
    if [ "$attempt" -eq 5 ] || ! grep -qiE 'authentication|could not read username|401|403' <<<"$out"; then
      say "$out" >&2
      return 1
    fi
    sleep 30
  done
}

fetch() { net git fetch --quiet --prune origin || die 1 "Could not reach the shared copy. Try again in a minute."; }

stop_on_conflicts() {
  local files
  files="$(git diff --name-only --diff-filter=U)"
  [ -z "$files" ] && return 0
  say "Files where both sides changed the same lines:" >&2
  say "$files" >&2
  die 2 "Resolve each file keeping both intents, git add them, git commit --no-edit, then run the same command again."
}

# Work is already in the main version: an ancestor of it, or its pull request was merged
# (a squash merge leaves no ancestor link).
is_merged() {
  local branch="$1"
  git merge-base --is-ancestor HEAD "origin/$MAIN" && return 0
  on_github || return 1
  "$GH_BIN" pr list --head "$branch" --state merged --json headRefOid --jq '.[].headRefOid' 2>/dev/null |
    grep -qx "$(git rev-parse HEAD)"
}

switch_to_main() {
  if git show-ref --verify --quiet "refs/heads/$MAIN"; then
    git switch --quiet "$MAIN"
  else
    git switch --quiet -c "$MAIN" --track "origin/$MAIN"
  fi
}

slug() {
  local s
  s="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//' | cut -c1-40 | sed -E 's/-+$//')"
  printf '%s' "${s:-change}"
}

free_branch() {
  local name="$1" n=2
  while git show-ref --quiet "refs/heads/$name" "refs/remotes/origin/$name"; do
    name="$1-$n"
    n=$((n + 1))
  done
  printf '%s' "$name"
}

cmd_status() {
  local branch
  branch="$(current_branch)"
  say "On: $branch (main version: $MAIN)"
  say "Unsaved files: $(git status --porcelain | wc -l | tr -d ' ')"
  has_remote || {
    say "No shared copy connected; versions live in this workspace only."
    return 0
  }
  fetch
  if [ "$branch" != "$MAIN" ] && is_merged "$branch"; then
    say "This work is already in the main version. Run sync before starting something new."
    return 0
  fi
  say "Saved here, not yet in the main version: $(git rev-list --count "origin/$MAIN..HEAD") version(s)"
  say "Newer in the main version, not here yet: $(git rev-list --count "HEAD..origin/$MAIN") version(s)"
  if on_github && [ "$branch" != "$MAIN" ]; then
    "$GH_BIN" pr list --head "$branch" --state open --json number,url --jq '.[] | "Waiting to join: #\(.number) \(.url)"'
  fi
}

cmd_sync() {
  has_remote || {
    say "No shared copy connected; nothing to catch up with."
    return 0
  }
  fetch
  local branch
  branch="$(current_branch)"
  if [ "$branch" != "$MAIN" ] && is_merged "$branch"; then
    switch_to_main || die 1 "Unsaved changes block the move to $MAIN; ship them first."
    say "Earlier work is already in the main version; continuing on $MAIN."
  fi
  if git merge-base --is-ancestor "origin/$MAIN" HEAD; then
    say "Up to date with the main version."
    return 0
  fi
  git merge --quiet --no-edit --autostash "origin/$MAIN" || stop_on_conflicts
  stop_on_conflicts
  say "Caught up with the main version."
}

wait_for_checks() {
  local pr="$1" state started=$SECONDS
  local query='if length == 0 then "none" elif any(.[]; .bucket == "fail" or .bucket == "cancel") then "fail" elif any(.[]; .bucket == "pending") then "pending" else "pass" end'
  while :; do
    state="$("$GH_BIN" pr checks "$pr" --json bucket --jq "$query" 2>/dev/null || true)"
    case "${state:-none}" in
      pass) return 0 ;;
      fail)
        "$GH_BIN" pr checks "$pr" --json name,bucket,link --jq '.[] | select(.bucket == "fail" or .bucket == "cancel") | "  \(.name): \(.link)"' >&2 || true
        die 3 "Checks failed on #$pr. Fix the cause, then run ship again with the same description."
        ;;
      none) [ $((SECONDS - started)) -ge 45 ] && return 0 ;; # no checks registered: this repo runs none
    esac
    [ $((SECONDS - started)) -ge "$CHECKS_WAIT" ] && die 4 "Checks still running on #$pr. Run ship again to finish; nothing is lost."
    sleep 15
  done
}

merge_pr() {
  local pr="$1" method="--squash" out
  [ "$("$GH_BIN" repo view --json squashMergeAllowed --jq .squashMergeAllowed)" = "true" ] || method="--merge"
  if ! out="$("$GH_BIN" pr merge "$pr" "$method" 2>&1)"; then
    say "$out" >&2
    grep -qiE 'review|approv|protected' <<<"$out" && die 5 "#$pr needs a teammate's approval before it can join the main version."
    die 1 "Could not add #$pr to the main version."
  fi
}

cmd_ship() {
  local title="${1:-}" body="${2:-}" branch pr url
  [ -n "$title" ] || die 1 'Usage: ship "<what changed, in plain words>" ["<details>"]'
  stop_on_conflicts
  branch="$(current_branch)"
  has_remote && fetch
  if has_remote && [ "$branch" != "$MAIN" ] && is_merged "$branch" && [ -z "$(git status --porcelain)" ]; then
    say "Already in the main version."
    return 0
  fi
  has_remote && [ "$branch" != "$MAIN" ] && is_merged "$branch" && die 1 "This branch is already in the main version; run sync first (it keeps unsaved changes)."
  if [ "$branch" = "$MAIN" ] && has_remote && { dirty || [ "$(git rev-list --count "origin/$MAIN..HEAD")" -gt 0 ]; }; then
    branch="$(free_branch "$(slug "$title")")"
    git switch --quiet -c "$branch"
    # The new branch holds any local-only versions; local main goes back to the shared one.
    git branch --quiet --force "$MAIN" "origin/$MAIN"
  fi
  local args=(-m "$title")
  [ -n "$body" ] && args+=(-m "$body")
  git add -A
  git diff --cached --quiet || git commit --quiet "${args[@]}"
  has_remote || {
    say "Saved: $title (this workspace only; no shared copy is connected)."
    return 0
  }
  [ "$(git rev-list --count "origin/$MAIN..HEAD")" -gt 0 ] || {
    say "Nothing new: the main version already has all of this."
    return 0
  }
  git merge-base --is-ancestor "origin/$MAIN" HEAD || { git merge --quiet --no-edit "origin/$MAIN" || stop_on_conflicts; }

  if ! on_github; then
    # One version per change on the main version, like a squash merge: catch-up merges and
    # in-between saves stay on the branch.
    local version
    version="$(git commit-tree "HEAD^{tree}" -p "origin/$MAIN" "${args[@]}")"
    net git push --quiet origin "$version:refs/heads/$MAIN" || die 5 "The shared copy refused the update to $MAIN."
    switch_to_main && git merge --quiet --ff-only "$version"
    say "Added to the main version: $title ($(git rev-parse --short HEAD))"
    return 0
  fi

  net git push --quiet -u origin "HEAD:refs/heads/$branch" || die 1 "Could not upload the work. Try again in a minute."
  pr="$("$GH_BIN" pr list --head "$branch" --state open --json number --jq '.[0].number // empty')"
  if [ -z "$pr" ]; then
    url="$("$GH_BIN" pr create --base "$MAIN" --head "$branch" --title "$title" --body "${body:-$title}")" ||
      die 1 "Could not open the review for this work."
    pr="${url##*/}"
  fi
  wait_for_checks "$pr"
  merge_pr "$pr"
  fetch
  switch_to_main && git merge --quiet --ff-only "origin/$MAIN"
  net git push --quiet origin --delete "$branch" || true
  say "Added to the main version: $title (#$pr)"
}

cmd_history() {
  local ref=HEAD
  has_remote && fetch && ref="origin/$MAIN"
  git log "$ref" --first-parent -n "${1:-15}" --date=format:'%a %d %b %Y %H:%M' --format='%h  %ad  %an  %s'
}

need_version() {
  [ -n "${1:-}" ] && git rev-parse --verify --quiet "$1^{commit}" >/dev/null || die 1 "Unknown version: ${1:-<none>}. Pick one from history."
  dirty && die 1 "Unsaved changes first: ship them, then try again."
  return 0
}

cmd_undo() {
  need_version "${1:-}"
  local subject
  subject="$(git log -1 --format=%s "$1")"
  if [ "$(git rev-list --parents -n 1 "$1" | wc -w)" -gt 2 ]; then
    git revert --no-commit -m 1 "$1" || stop_on_conflicts
  else
    git revert --no-commit "$1" || stop_on_conflicts
  fi
  git commit --quiet -m "Undo: $subject"
  say "Took back \"$subject\". Run ship to add this to the main version."
}

cmd_restore() {
  need_version "${1:-}"
  git restore --source="$1" --staged --worktree -- ":/" "${KEEP_ON_RESTORE[@]}"
  if git diff --cached --quiet; then
    say "The files already match that version."
    return 0
  fi
  git commit --quiet -m "Back to the version of $(git log -1 --date=format:'%d %b %Y %H:%M' --format='%ad (%s)' "$1")"
  say "Files now match version $(git rev-parse --short "$1"); the agent's notes (AGENTS.md, MEMORY.md, skills) were kept. Run ship to add this to the main version."
}

command="${1:-}"
shift || true
case "$command" in
  status | sync | ship | history | undo | restore) "cmd_$command" "$@" ;;
  *) die 1 "Usage: scripts/versions.sh status|sync|ship|history|undo|restore (see the top of this file)" ;;
esac
