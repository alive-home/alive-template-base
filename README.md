# alive-template-base

> **This is a scaffold, not a finished product.**
> When initializing a new project from this template, the AI builder should rewrite this README from scratch to describe the *actual* product being built. Everything below describes the template itself — what's wired up, the conventions to follow, and what to keep when extending it.

## What's in the box

| Layer       | Choice                                                              |
|-------------|---------------------------------------------------------------------|
| Runtime     | Bun                                                                 |
| API         | Hono + tRPC v11                                                     |
| Auth        | JWT (HS256) via `hono/jwt` — single password from `AUTH_SECRET`     |
| Web         | Vite + React 19 + TanStack Router/Query/Form/Table + Tailwind v4    |
| Validation  | Zod 4 + `@t3-oss/env-core`                                          |
| Lint/format | Biome 2 (+ syncpack for cross-workspace dep alignment)              |
| E2E         | Playwright (auto-boots api + web)                                   |
| Build/ship  | Docker + `docker-bake.hcl` (one image per app)                      |

```
apps/
  api/        Hono + tRPC + JWT auth                → bun runtime image
  web/        Vite SPA + TanStack stack             → static nginx image
packages/
  shared/     Zod schemas + cross-app env helpers
e2e/          Playwright suite (uses real tRPC client over HTTP)
docker-bake.hcl
compose.yaml
```

## Quickstart

```bash
cp .env.example .env
bun install
bun run dev          # api: 3001, web: 3000
```

## Scripts

```bash
bun run lint              # biome check (fails on issues)
bun run format            # biome format --write
bun run typecheck         # tsc --noEmit, parallel across workspaces
bun run test:e2e          # playwright (auto-boots api + web)
bun run docker:build      # build both images via bake (group "default")
bun run docker:push       # build + push to $REGISTRY
bunx syncpack lint        # check cross-workspace dep alignment
bunx syncpack fix         # fix mismatches
```

## Conventions for the AI builder

These are load-bearing — preserve them when extending the template.

### Type safety

The repo aims to be as type-safe as practical. Defaults:

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules` — see [`tsconfig.base.json`](tsconfig.base.json).
- All cross-boundary data goes through Zod (`packages/shared/src/index.ts` for shared shapes, plus per-procedure inputs in tRPC).
- All env access goes through [`@t3-oss/env-core`](https://env.t3.gg) — never read `process.env` directly. Accessing an undeclared var throws at boot.
- The web → api type contract is automatic: `AppRouter` is exported from `@template/api/router` and consumed by the typed tRPC client in [`apps/web/src/lib/trpc.ts`](apps/web/src/lib/trpc.ts).
- New code should not introduce `any`. Prefer `unknown` + a Zod parse at the boundary.

### Docker

The repo always ships:

1. **One Dockerfile per app** (`apps/<app>/Dockerfile`).
2. **A root `docker-bake.hcl`** with a `group "default"` listing every image and a top-level `variable` block declaring every knob the hoster needs (registry, tag, public URLs, platforms). The hoster runs `docker buildx bake` against this file — no manual per-image flags.
3. **A `compose.yaml`** for local convenience (consumes the same Dockerfiles). Production orchestration belongs to the hoster, not to compose.

When adding a new app, also add: a Dockerfile under `apps/<app>/`, a target in `docker-bake.hcl`, and append it to `group "default"`. Variables that affect the build (e.g. inlined `VITE_*` values) must be declared at the top of `docker-bake.hcl` so the hoster can override them.

### Auth

Login surface is `auth.login` (public mutation taking `{ password }`) → returns `{ token }`. The token is an HS256 JWT signed with `AUTH_SECRET` (which doubles as the login password — fine for a single-user template, split into two env vars if you ever need real users).

Server side: `protectedProcedure` in [`apps/api/src/trpc.ts`](apps/api/src/trpc.ts) reads `Authorization: Bearer <token>` and rejects with `UNAUTHORIZED` if missing/invalid. Web side: token is stored in `localStorage` via [`apps/web/src/lib/auth.ts`](apps/web/src/lib/auth.ts) and attached to every tRPC request automatically.

Extend by adding more `protectedProcedure` calls — don't bypass the middleware.

### Path imports

Web uses Node subpath imports (`#/...`) wired in [`apps/web/package.json`](apps/web/package.json) under `"imports"`. No `tsconfig` `paths` or vite alias is needed — TS and Vite both pick up `imports` automatically. Use `#/lib/foo.ts`, not `~/lib/foo.ts` or `@/lib/foo.ts`.

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
REGISTRY=ghcr.io/yourorg/myapp TAG=v1 docker buildx bake --push
```

`group "default"` builds every app; pass a target name to build a single image.
