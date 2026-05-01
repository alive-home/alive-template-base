# alive-template-base

Minimal Bun monorepo template — two apps, one shared package, Docker-bake out the door.

## Stack

| Layer       | Choice                                                              |
|-------------|---------------------------------------------------------------------|
| Runtime     | Bun                                                                 |
| API         | Hono + tRPC v11                                                     |
| Auth        | better-auth (email/password, sqlite)                                |
| Web         | Vite 7 + React 19 + TanStack Router/Query/Form/Table + Tailwind v4  |
| Validation  | Zod 4 + @t3-oss/env-core                                            |
| Lint/format | Biome 2                                                             |
| E2E         | Playwright                                                          |
| Build/ship  | Docker + docker-bake (one image per app)                            |

## Layout

```
apps/
  api/        Hono + tRPC + better-auth → bun
  web/        Vite + TanStack stack     → static (nginx)
packages/
  shared/     Zod schemas + shared env
e2e/          Playwright suite
docker-bake.hcl
compose.yaml
```

## Getting started

```bash
cp .env.example .env
bun install
bun run dev          # api: 3001, web: 3000
```

Open http://localhost:3000.

## Scripts

```bash
bun run lint              # biome check
bun run format            # biome format --write
bun run typecheck         # all packages
bun run test:e2e          # playwright (auto-boots api+web)
bun run docker:build      # build both images via bake
bun run docker:push       # build + push to $REGISTRY
```

## Environment

Both `API_BASE_URL` and `WEB_BASE_URL` are required everywhere. The web bundle additionally
reads `VITE_API_BASE_URL` / `VITE_WEB_BASE_URL` (Vite only inlines `VITE_*`-prefixed vars).

| Var                  | Side       | Used by             |
|----------------------|------------|---------------------|
| `API_BASE_URL`       | server     | api (self), e2e     |
| `WEB_BASE_URL`       | server     | api (CORS), e2e     |
| `VITE_API_BASE_URL`  | client     | web                 |
| `VITE_WEB_BASE_URL`  | client     | web                 |
| `BETTER_AUTH_SECRET` | server     | api                 |
| `PORT`               | server     | api (default 3001)  |

All env access goes through [`@t3-oss/env-core`](https://env.t3.gg) — accessing an unknown
or invalid var throws at boot.

## Docker

Each app ships its own Dockerfile; `docker-bake.hcl` is the orchestrator. The web image is a
static nginx serving the prebuilt SPA; the api image is a Bun runtime.

```bash
# Build both for the current platform
docker buildx bake --set "*.platform=linux/amd64"

# Build & push multi-arch
REGISTRY=ghcr.io/yourorg/template TAG=v1 docker buildx bake --push
```

`VITE_*` values must be passed at build time (they're inlined into the bundle):

```bash
docker buildx bake web \
  --set web.args.VITE_API_BASE_URL=https://api.example.com \
  --set web.args.VITE_WEB_BASE_URL=https://app.example.com
```

## Deploying

Hosting platforms that consume Dockerfiles (Fly, Railway, Render, ECS, k8s, …) point at
`apps/api/Dockerfile` and `apps/web/Dockerfile` directly with the repo root as build context.
Bake is for local/CI multi-target builds.
