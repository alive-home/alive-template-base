# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

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
