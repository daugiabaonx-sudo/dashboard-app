# Multi-stage Dockerfile for the Next.js 16 dashboard.
# Builds the standalone output (`output: "standalone"` in next.config.ts)
# and ships only the trimmed server, plus the public + static assets, in
# a slim runtime image. The local docker-compose Postgres + PostgREST
# stack is unaffected — see docker-compose.yml.

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /repo
# Copy manifests first so this layer caches when only source changes.
COPY package.json package-lock.json* ./
# `--include=dev` is required because Next, ESLint, and Playwright live
# under devDependencies for this repo. The standalone output drops them
# later; the build image still needs them.
RUN npm ci --no-audit --no-fund --include=dev

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /repo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user; standalone server keeps a writable scratch area.
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /repo/public ./public
COPY --from=build --chown=app:app /repo/.next/standalone ./
COPY --from=build --chown=app:app /repo/.next/static ./.next/static

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/api/session',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
