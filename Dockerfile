# Phase 0 runtime images; no workflow worker is deployed before Phase 1.
FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
COPY . .
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN pnpm build
RUN pnpm exec tsup --config scripts/tsup-migration.config.ts

FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS api
WORKDIR /runtime
ENV NODE_ENV=production PORT=3002
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
COPY --chown=node:node scripts/runtime-secrets.mjs ./runtime-secrets.mjs
USER node
EXPOSE 3002
CMD ["node", "runtime-secrets.mjs", "dist/server.js"]

FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS app
WORKDIR /runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3001
COPY --from=build --chown=node:node /workspace/apps/app/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/app/.next/static ./apps/app/.next/static
COPY --from=build --chown=node:node /workspace/licenses ./licenses
COPY --chown=node:node scripts/runtime-secrets.mjs ./runtime-secrets.mjs
USER node
EXPOSE 3001
CMD ["node", "runtime-secrets.mjs", "apps/app/server.js"]

FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS web
WORKDIR /runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /workspace/licenses ./licenses
COPY --chown=node:node scripts/runtime-secrets.mjs ./runtime-secrets.mjs
USER node
EXPOSE 3000
CMD ["node", "runtime-secrets.mjs", "apps/web/server.js"]

FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS migrate
WORKDIR /runtime
ADD --checksum=sha256:56a0cae044b6cc433971d964347401692a92ea0294e392753a3ebdaee54d8b84 https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem /runtime/rds-ca.pem
COPY --from=build --chown=node:node /workspace/migration-dist ./dist
COPY --from=build --chown=node:node /workspace/packages/db/migrations ./packages/db/migrations
USER node
CMD ["node", "dist/migrate.cjs"]
