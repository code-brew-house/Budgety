FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
WORKDIR /app

# Copy workspace config and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc* ./
COPY apps/web/package.json apps/web/
COPY packages/ packages/

# Install dependencies (approve build scripts for sharp)
RUN pnpm config set onlyBuiltDependenciesFile '' && \
    pnpm install --frozen-lockfile

# Copy source and build
COPY apps/web/ apps/web/
RUN pnpm --filter web run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build output
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static apps/web/.next/static
COPY --from=base /app/apps/web/public apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
