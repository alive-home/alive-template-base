# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.3.11

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /repo

FROM base AS deps
# Every workspace package.json must be present or the frozen install fails:
# bun checks the lockfile's workspace set against what it finds on disk.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/
RUN bun install --frozen-lockfile

FROM deps AS build
ARG VITE_API_BASE_URL
ARG VITE_WEB_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WEB_BASE_URL=$VITE_WEB_BASE_URL
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN cd apps/web && bun run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
