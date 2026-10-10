# AGENTS.md

Instructions for AI agents and people working in this repo. Every agent session loads this file
(Claude Code through `CLAUDE.md`, others read it directly). Keep it under 12,000 characters:
`bun run lint` enforces that, because everything here is paid for on every turn.

Three places carry knowledge from one session to the next:

| File | Holds | Loaded |
|---|---|---|
| `AGENTS.md` (this file) | Rules and conventions for all work here | Every session |
| `MEMORY.md` | Short facts learned while working: gotchas, decisions, the owner's preferences | Every session |
| `.claude/skills/<name>/SKILL.md` | How to do one kind of task in this repo, step by step | Only when that task comes up |

`README.md` is for people and describes the product. When this template becomes a real project the
README is rewritten from scratch; this file and `MEMORY.md` stay and keep growing.

## Commands

```bash
bun run lint         # biome + file-length + agent-context checks (CI runs this)
bun run typecheck    # tsc per workspace via turbo
bun run build        # turbo build
bun run test:e2e     # playwright, boots api + web itself
bun run dev:local    # api :3001 + web :3000 without docker (not on Alive, see below)
```

On Alive the dev servers already run under the workspace supervisor (`alive.toml` → `[dev.services]`).
Restart them with `alive-workspaced restart web|api`; starting them yourself collides on the port.

## Memory (`MEMORY.md`)

A small notebook the agent keeps for the project. Every line costs tokens in every session, so it
holds only what is worth that.

- **Goes in:** a fact useful for almost any task here that the code does not show quickly: a
  non-obvious gotcha and its cause, a decision and its reason, how the owner wants the product or the
  work done, where an outside thing lives (a dashboard, a service; never its credentials).
- **Stays out:** what this file or the README already say; what the code or `git log` shows in
  seconds; progress notes, TODOs and changelogs (commits, issues and the task board hold those);
  one-off debugging details; secrets, tokens and personal data. How to do a kind of task belongs in a
  skill, not in memory.
- **Write facts, not orders.** "Owner wants prices shown including VAT; most buyers are consumers"
  is right. "Always show prices including VAT" is wrong: a bare order gets applied months later to
  requests it was never meant for, while a fact with its reason can be weighed.
- **One bullet per entry**, dense, under the matching heading. One fact lives in one place: a rule
  everyone must follow goes in this file instead.
- **Fix in place.** A wrong or stale entry gets rewritten or deleted, not followed by a correction.
- **Budget: 4,000 characters for the whole file.** `bun run lint` fails above it and prints usage.
  Above 80%, merge related entries and drop stale ones before adding (the `curate` skill). A full
  file is a reason to consolidate, never a reason to skip a save that matters.
- **Save when it happens:** right after the owner corrects you, after a fix that took real digging,
  after a decision. Tell the person in one line what you saved. Saying "I'll remember that" without
  editing the file saves nothing.
- Memory is read at session start, so an edit takes effect in the next session.

## Skills (`.claude/skills/`)

The project's playbooks. An agent sees each skill's name and description up front and reads the
body only when a task matches, so a skill can be long without costing anything until it is needed.

- When you work out a non-trivial procedure for this repo (a new table end to end, a new service in
  `alive.toml` and bake, recovering a failed deploy), save it as a skill or improve the skill you
  used. The `learn` skill has the how; run it after substantial work.
- One skill per kind of work (`add-api-procedure`), never per incident (`fix-login-bug`). Extend an
  existing skill before creating a new one.
- A skill that misled you gets fixed now, in place.
- These skills belong to the repo and everyone working on it. A personal skill that should follow
  the person to other projects does not go here: when someone asks to save a skill for themselves,
  follow the platform's own skill instructions.

## Before changing something that looks wrong

Check intent first: `git log -p -S "<symbol>" -- <path>`. An odd-looking line is often load-bearing
(see `MEMORY.md` for known cases). A fix that cannot point to where the bug shows up has an
unverified premise.

## Conventions (load-bearing: keep them when extending)

### Type safety

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `verbatimModuleSyntax`, `isolatedModules`: see `tsconfig.base.json`.
- All cross-boundary data goes through Zod (`packages/shared/src/index.ts` for shared shapes, plus
  per-procedure inputs in oRPC).
- All env access goes through `@t3-oss/env-core`; never read `process.env` directly. Reading an
  undeclared var throws at boot.
- The web → api contract is automatic: `AppRouter` is exported from `@template/api/router` and
  consumed by the typed oRPC client in `apps/web/src/lib/orpc.ts`.
- No `any`; prefer `unknown` plus a Zod parse at the boundary. Biome also bans `as` assertions
  (`config/biome/no-as.grit`, `as const` allowed): use a parse, a type guard or `satisfies`.

### Docker

1. One Dockerfile per app (`apps/<app>/Dockerfile`).
2. A root `docker-bake.hcl` with `group "default"` listing every image and a top-level `variable`
   block for every knob the hoster needs (registry, tag, public URLs, platforms).
3. `compose.yaml` is for local convenience only; production orchestration belongs to the hoster.

A new app needs: a Dockerfile under `apps/<app>/`, a target in `docker-bake.hcl` appended to
`group "default"`, and any build-affecting variable (e.g. inlined `VITE_*`) declared at the top of
`docker-bake.hcl`.

### Auth

`auth.login` (public, `{ password }`) returns `{ token }`, an HS256 JWT signed with `AUTH_SECRET`,
which doubles as the login password (split into two env vars once there are real users).
`protectedProcedure` in `apps/api/src/orpc.ts` checks `Authorization: Bearer <token>`; the web stores
the token via `apps/web/src/lib/auth.ts` and attaches it to every oRPC call. Add endpoints as more
`protectedProcedure` calls; never bypass the middleware.

### Path imports

Web uses Node subpath imports (`#/...`) declared under `"imports"` in `apps/web/package.json`; TS and
Vite both read them, so no `paths` or alias. Write `#/lib/foo.ts`, not `~/` or `@/`.

### File size

Source files stay under 300 lines, tests under 500 (`scripts/check-file-length.sh`). Over the limit
means more than one responsibility: split along a natural seam.

### Hosting on Alive (`alive.toml`)

1. **Single public ingress.** `[deploy] public_target` names exactly one service; the rest are only
   reachable inside the cluster by service name (`http://api:3001`). That is why `apps/web/nginx.conf`
   proxies `/rpc` to the api.
2. **Service names are DNS labels.** Lowercase, no underscores. They are also the bake target names
   and container hostnames, so renaming one touches several files.
3. **`env_required` is a contract.** Listing a key blocks deploys until the owner sets a value in
   Alive's env store; it does not provide the value.

## Agent context files are code

`AGENTS.md`, `CLAUDE.md`, `MEMORY.md` and skills are read as instructions by every session, with the
session's credentials. `bun run lint:agent-context` checks their budgets and scans them for planted
instructions, hidden Unicode and pasted secrets. Review outside changes to them like code.

## Area rules

When one part of the repo grows rules of its own, put them in `<area>/AGENTS.md` plus a one-line
`<area>/CLAUDE.md` containing `@AGENTS.md`, and add a row here. Agents load those only when they
work in that area.

| Area | Read |
|---|---|
| (none yet) | |
