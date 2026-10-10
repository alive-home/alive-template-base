---
name: curate
description: Tidy the project's memory and skills by merging overlaps, distilling, and removing what is stale. Use when MEMORY.md is over 80% of its budget, the agent-context lint fails on a budget, skills overlap, or someone asks to clean up what the agent has learned.
---

# Curate

A consolidation pass over `MEMORY.md` and `.claude/skills/`. The target: a few skills that each
cover a kind of work, and a memory file where every line earns its place in every session. A pile
of narrow one-session skills is the failure to fix, not a library to keep.

## When to use

- `bun run lint:agent-context` warns that memory is above 80%, or fails on a budget.
- Two skills cover the same kind of work, or a `SKILL.md` has grown long.
- Someone asks to clean up, review or reset what the agent has learned.

## Steps

1. Run `bun run lint:agent-context` and note memory usage and any warnings.
2. `MEMORY.md`:
   - Merge entries about the same subject into one dense entry.
   - Delete entries that the code, README or `AGENTS.md` now state, and entries that are no longer
     true. Check the code before trusting an entry; `git log -S "<term>"` shows when it changed.
   - Move procedures into the skill for that kind of task, and rules everyone must follow into
     `AGENTS.md`.
   - Rewrite orders as facts with a reason ("Always X" becomes "Owner wants X because Y").
3. Skills:
   - List them with their descriptions. Ask: would a maintainer write these as separate skills, or
     as one skill with a section each? If one, merge the narrower skills into the broader one and
     delete their folders.
   - Distill while merging: the same lesson twice becomes one rule; incident stories, dates and PR
     numbers go. Moving a file under `references/` unchanged is filing, not distilling.
   - A long `SKILL.md` keeps the always-needed rules and moves depth into `references/<topic>.md`.
   - Fix a skill whose steps no longer match the code; delete it if that kind of task is gone.
4. Run `bun run lint:agent-context` again.
5. Commit with a message that lists what was merged, moved and deleted. Git history is the archive:
   `git log -p -- MEMORY.md .claude/skills` brings anything back.

## Pitfalls

- Shortening an entry by dropping its reason. The reason is what keeps a fact usable later: cut
  words, not reasons.
- Deleting a skill only because it looks unused. Its task may not have come up yet; judge content,
  not traffic.
- Merging `learn` or `curate` into something else. `AGENTS.md` and the lint output send agents to
  them by name.

## Check

`bun run lint:agent-context` passes and memory usage is lower than before, or no consolidation
was needed. Say so in one line.
