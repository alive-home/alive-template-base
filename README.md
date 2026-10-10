# alive-template-base

> **This is a scaffold, not a finished product.**
> When initializing a new project from this template, the AI builder should rewrite this README from scratch to describe the *actual* product being built. Everything below describes the template itself. The conventions agents must keep live in [`AGENTS.md`](AGENTS.md), which stays when this README is rewritten.

## What's in the box

| Layer       | Choice                                                              |
|-------------|---------------------------------------------------------------------|
| Runtime     | Bun                                                                 |
| API         | Hono + oRPC v1                                                      |
| Auth        | JWT (HS256) via `hono/jwt` — single password from `AUTH_SECRET`     |
| Web         | Vite + React 19 + TanStack Router/Query/Form/Table + Tailwind v4    |
| Validation  | Zod 4 + `@t3-oss/env-core`                                          |
| Lint/format | Biome 2 (+ syncpack for cross-workspace dep alignment)              |
| Tasks       | Turborepo (`dev`, `build`, `typecheck`)                             |
| E2E         | Playwright (auto-boots api + web)                                   |
| Build/ship  | Docker + `docker-bake.hcl` (one image per app)                      |

```
apps/
  api/        Hono + oRPC + JWT auth                → bun runtime image
  web/        Vite SPA + TanStack stack             → static nginx image
packages/
  shared/     Zod schemas + cross-app env helpers
  ui/         Shared React components
e2e/          Playwright suite (uses real oRPC client over HTTP)
.claude/skills/  Project skills: issue, learn, curate (see "Agent memory and skills")
AGENTS.md     Rules and conventions every agent session loads
CLAUDE.md     Imports AGENTS.md + MEMORY.md for Claude Code
MEMORY.md     Project memory the agent maintains (4,000-char budget)
alive.toml    Deploy contract for hosting on Alive (see "Deploying on Alive")
docker-bake.hcl
compose.yaml
```

## Quickstart

```bash
bun run dev:local    # creates .env (generated AUTH_SECRET), bun install, boots api: 3001 + web: 3000
```

Or by hand:

```bash
cp .env.example .env
bun install
bun run dev          # turbo run dev — api: 3001, web: 3000
```

## Scripts

```bash
bun run dev:local         # one-command local stack (scripts/runtime/local.sh), no docker
bun run dev               # turbo: api + web dev servers in parallel
bun run build             # turbo: build all apps
bun run lint              # biome + file-length + agent-context checks (fails on issues)
bun run format            # biome format --write
bun run typecheck         # tsc --noEmit via turbo, parallel across workspaces
bun run test:e2e          # playwright (auto-boots api + web)
bun run docker:build      # build both images via bake (group "default")
bun run docker:push       # build + push to $REGISTRY
bunx syncpack lint        # check cross-workspace dep alignment
bunx syncpack fix         # fix mismatches
```

## CI/CD

Two workflows in [`.github/workflows`](.github/workflows):

- **`ci.yml`** — on every PR and push to main: biome + syncpack, typecheck, turbo build (asserts `VITE_*` got inlined), Playwright e2e (boots api + web itself), docker image builds from a clean context, and actionlint on the workflows themselves. The `ci` aggregator job is the only check branch protection needs — new jobs become required automatically.
- **`cd.yml`** — on push to main / `v*` tags: builds and pushes both images (amd64 + arm64) to GHCR via `docker buildx bake`, then sanity-boots the pushed images and curls them. Set repository variables `API_BASE_URL` / `WEB_BASE_URL` for real public origins; otherwise localhost defaults are baked into the web bundle.

Shared plumbing: [`.github/actions/setup`](.github/actions/setup/action.yml) installs bun (version from `packageManager` in package.json) and does a frozen install; caches restore on every branch but only main writes them. Dependabot keeps the actions pinned.

## Agent memory and skills

Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent)'s learning loop: the agent working on this repo writes down what it learns, so the next session starts where the last one left off instead of rediscovering it.

| File | Holds | Loaded |
|------|-------|--------|
| [`AGENTS.md`](AGENTS.md) | Rules and load-bearing conventions (type safety, Docker, auth, imports, hosting) | Every session |
| [`MEMORY.md`](MEMORY.md) | Short facts: gotchas, decisions and their reasons, the owner's preferences | Every session |
| [`.claude/skills/`](.claude/skills) | How to do one kind of task here, step by step | When that task comes up |

- **Memory is bounded.** 4,000 characters, enforced by `bun run lint:agent-context`. Entries are facts with their reason, not orders; when it fills up, the agent consolidates instead of skipping saves.
- **Procedures go into skills, not memory.** After substantial work the `learn` skill decides where each lesson belongs and how to write it; `curate` merges overlapping skills and prunes stale memory.
- **Context files are treated as code.** The same lint scans them for planted instructions, hidden Unicode and pasted secrets, since every session reads them with its own credentials.
- `CLAUDE.md` only imports `AGENTS.md` and `MEMORY.md`, so Claude Code, Codex, Cursor and other agents share one copy.

## Environment

| Var                  | Side       | Used by             |
|----------------------|------------|---------------------|
| `API_BASE_URL`       | server     | api (self), e2e     |
| `WEB_BASE_URL`       | server     | api (CORS), e2e     |
| `VITE_API_BASE_URL`  | client     | web (build-time)    |
| `VITE_WEB_BASE_URL`  | client     | web (build-time)    |
| `AUTH_SECRET`        | server     | api (login + JWT)   |
| `PORT`               | server     | api (default 3001)  |

`VITE_*` values are inlined at *build* time, not runtime — they have to be present when `vite build` runs, which means they're also build args in `docker-bake.hcl`'s `web` target.

## Deploying

Hosting platforms that consume Dockerfiles (Fly, Railway, Render, ECS, k8s, …) point at `apps/api/Dockerfile` and `apps/web/Dockerfile` directly with the repo root as build context. Bake exists for local + CI multi-target builds and is the canonical way the AI builder ships images:

```bash
REGISTRY=ghcr.io/yourorg/myapp TAG=v1 docker buildx bake -f docker-bake.hcl --push
```

`group "default"` builds every app; pass a target name to build a single image.

### Deploying on Alive

[Alive](https://alive.site) hosts projects from this template natively. The contract between the project and the host is [`alive.toml`](alive.toml) — a single file that declares which service receives external traffic, what port each service listens on, and which env vars must be set at deploy time:

```toml
[deploy]
public_target = "web"

[deploy.services.api]
port = 3001
env_required = ["AUTH_SECRET"]

[deploy.services.web]
port = 80
depends_on = ["api"]
```

The three rules to keep when extending it (single public ingress, service names are DNS labels, `env_required` is a contract) are in [`AGENTS.md`](AGENTS.md) § Hosting on Alive. In short: only `web` is public, and its nginx proxies `/rpc` to the private `api` container.

The Alive deploy flow:

1. **Build.** A short-lived builder sandbox runs `docker buildx bake --push` with `REGISTRY` and `TAG` set to the project's namespace on Alive's registry. Each pushed image is recorded with its sha256 digest.
2. **Deploy.** A long-lived runner sandbox per project pulls images **by digest** (tags are mutable, digests are not), synthesizes a runtime compose file from `alive.toml`, runs `nerdctl compose up -d`, and reports the public URL.
3. **Route.** Alive's edge resolves your project hostname to the runner sandbox's exposed port via a routing map refreshed on every deploy.

You don't run any commands yourself — Alive's chat UI triggers the build + deploy on demand. This README section exists so the AI builder editing your project knows the conventions to preserve.
