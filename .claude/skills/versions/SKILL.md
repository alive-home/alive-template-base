---
name: versions
description: Keep the project's versions for the people working on it, who never deal with git or GitHub. Use at the start of every session, after finishing any request that changed files, and whenever someone asks whether their work is saved, what changed, who changed it, to undo something or go back to an earlier version, or when a teammate's changes collide with yours.
---

# Versions

The people working here should never need to know that git or GitHub exist. GitHub is only how
their work gets combined; keeping it in order is your job, done without being asked.
`scripts/versions.sh` does the mechanics; this skill says when and how to use it.

## Their words, not git's

| They hear | Not |
|---|---|
| "Saved" | committed, pushed |
| "Added to the main version" | merged, pull request |
| "Caught up with Anna's changes" | pulled, fetched, rebased |
| "Went back to Tuesday's version" | reverted, reset, checked out |
| "Live" (only after a publish) | deployed, released |

Use git words only when they use them first. Never send them to GitHub, never ask them to approve,
merge or resolve anything, never paste a pull request link unless they ask for it.

## Every session

1. **Start:** `scripts/versions.sh sync`. It catches up with everyone's latest work, and moves off
   work that already joined the main version. Say nothing unless it brought in something that
   matters for the request ("Bob changed the pricing page since; I built on his version").
2. **Work** as usual.
3. **Finish** every request that changed files: run `bun run lint` and `bun run typecheck`, fix what
   fails, then
   `scripts/versions.sh ship "<what changed, in the person's words>" "<why, one or two lines>"`.
   Give the command a timeout of up to 10 minutes. Then tell them in one line: "Saved and added to
   the main version."

Ship once per finished request, not after every file edit. Alive already backs up the session
after every reply (the `alive/*` branches). Those backups belong to the platform: never push to,
delete or mention them.

**Hold back** from shipping only when the person is still trying things out ("try", "what if",
"show me a few options"), or when the change would replace someone else's recent work on purpose.
Then ship when they say they are happy, or ask in one line: "Keep this version?"

## What ship's exit code means

| Code | Meaning | Do |
|---|---|---|
| 0 | Done | One line to the person |
| 2 | Two people changed the same lines | Resolve (below), then ship again |
| 3 | Checks failed | Read the failing check's log (link is printed), fix, ship again. Never hand this to the person |
| 4 | Checks still running | Ship again with the same description; nothing is lost |
| 5 | The main version needs a teammate's approval | Tell the person: "This needs a teammate's OK before it joins the main version." |
| 1 | Anything else | Read the message; retry once after a minute for network trouble |

## Collisions

When `sync` or `ship` stops on a collision, open each listed file and keep both intents. Usually
the changes do not really compete (one person changed the colour, the other the text): combine them
yourself, `git add` the files, `git commit --no-edit`, run the command again.

Ask only when two people wanted different things in the same place. Ask in their terms, with both
options: "Bob changed the headline to 'Fresh bread daily' this morning; you asked for 'Open every
day'. Which one should stay?" Then finish with their choice.

## History, undo, going back

- **What changed / who / when:** `scripts/versions.sh history 20`, then answer in plain words
  ("Tuesday 14:02, Bob: new pricing page").
- **Take back one change, keep everything after it:** `scripts/versions.sh undo <version>`, then
  ship as "Undo: <what>".
- **Go back to how everything was:** `scripts/versions.sh restore <version>`, then ship as "Back to
  <day>'s version". AGENTS.md, MEMORY.md and skills are kept as they are, so going back never makes
  the agent forget.
- Pick the version from `history` and confirm in one line when the request is vague ("the version
  from Tuesday 14:02, before the new header?").
- Both add a new version on top, so going back can itself be undone. Never `reset --hard`,
  `push --force`, `rebase` or delete branches holding unsaved work.

The workbench's Versions panel (Save, Restore, Undo) does the same for this one session's files.
The person may use it; you never need to send them there.

## Saved is not live

Adding to the main version does not change the live site. Publishing is a separate step: ask
before publishing, and never say a change is live because it was saved.

## Pitfalls

- `sync` refuses to move off finished work while there are unsaved changes that would be
  overwritten: ship them first.
- A shipped description is what the person and teammates read in the history. Write what changed
  for them ("Add a pricing page with three plans"), not how ("refactor PricingCard props").
- Without a connected shared copy, `ship` saves in this workspace only and says so; that is not an
  error.
