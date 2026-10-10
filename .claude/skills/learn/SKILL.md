---
name: learn
description: Save what this session taught you so the next session starts smarter. Use after substantial work in this repo, after the owner corrects how something should be done, after a fix that took real digging, or when asked to remember something or turn what was just done into a reusable procedure.
---

# Learn

Decide where each lesson belongs, then write it there in the shape below. Most sessions with real
work produce at least one small update; skipping it is a missed lesson, not a neutral outcome. A
smooth session with no correction and no new technique produces nothing: say "Nothing to save."
and stop.

## When to use

- A task in this repo took several steps you would otherwise have to rediscover.
- The owner corrected your approach, output, tone or format ("not like that", "stop doing X").
  Corrections are the strongest signal there is.
- A skill or memory entry you relied on turned out wrong or incomplete.
- Someone says "remember this" or "make this reusable".

## 1. Pick the home (one fact, one place)

| Lesson | Home |
|---|---|
| A rule everyone working here must follow | `AGENTS.md`, in the matching section |
| How to do a kind of task here: steps, commands, order, pitfalls | A skill in `.claude/skills/` |
| The owner's correction about how a kind of task should be done | The skill for that task (create it if needed) |
| A short fact useful for almost any task: gotcha, decision and reason, product preference, where an outside thing lives | `MEMORY.md` |
| Progress, TODOs, what got done today | Not here: commit message, issue or task board |

## 2. Skills, in this order

Pick the first option that fits:

1. Update the skill you used this session.
2. Update an existing skill that covers the same kind of task (list `.claude/skills/`, read the
   candidates' `SKILL.md`).
3. Add a support file to an existing skill and link it from `SKILL.md` in one line:
   `references/<topic>.md` for depth needed only sometimes, `scripts/<name>` for something to run
   rather than retype, `templates/<name>` for a starter file to copy.
4. Create a new skill only when nothing covers the kind of task. Name it for the class of work
   (`add-api-procedure`), never for today's incident (`fix-login-bug`). If the name only makes sense
   for today, go back to 1–3.

Read the current file before editing it, and edit the version you just read.

New skill layout: `.claude/skills/<name>/SKILL.md`, `name` equal to the folder name
(lowercase-hyphenated), `description` saying what it does and when to use it (that is all an agent
sees before loading it). Body: a short intro, `## When to use`, `## Steps`, `## Pitfalls`, `## Check`.
Roughly 100 lines for a simple skill, 200 for a complex one; push depth into `references/`.

## 3. Shape of what you write

- Steps first, in the order they are done, with the exact commands. Attach each pitfall to the step
  it affects.
- A pitfall is a rule plus one clause of why: "Search the tests for a helper before changing its
  signature: hand-written mocks copy the old shape and fail in a suite you did not run."
- No PR numbers, dates or quoted chat as content. The rule has to stand without the story behind it.
- The same lesson twice is one rule. Search for it first and sharpen the existing line instead of
  adding a second.
- Wrong guidance gets rewritten where it stands, not followed by "UPDATE: actually...".
- Don't restate what `AGENTS.md`, the README or the code already say.
- Memory entries are facts with their reason, never bare orders (see `AGENTS.md` § Memory).

## 4. Don't save

- Setup failures the person can fix: a missing binary, an unset env var, an expired token. If it
  will recur, save the fix under a setup skill, never "X doesn't work".
- Claims that a tool or feature is broken. They harden into refusals long after the cause is gone.
- Errors that disappeared on retry. If retrying was the fix, the lesson is the retry.
- Attempts that never worked. A session that ended without a working method saves nothing; dead
  ends written up as "the recommended approach" get trusted and repeated.
- One-off tasks that are not a recurring kind of work.
- Secrets, tokens, personal data.

## Check

1. `bun run lint:agent-context` passes (memory budget, skill frontmatter, safety scan).
2. Tell the person in one line what you saved and where.
