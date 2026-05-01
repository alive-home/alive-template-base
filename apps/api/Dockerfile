# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN cd apps/api && bun build ./src/index.ts \
    --target=bun \
    --outdir=dist \
    --minify

FROM oven/bun:1.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=deps  /repo/node_modules ./node_modules
COPY --from=deps  /repo/apps/api/package.json ./package.json
EXPOSE 3001
CMD ["bun", "run", "dist/index.js"]
