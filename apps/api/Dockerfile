FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
WORKDIR /app

# Copy workspace config and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc* ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY apps/api/ apps/api/
RUN cd apps/api && npx prisma generate
RUN pnpm --filter api run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/apps/api/dist apps/api/dist
COPY --from=base /app/apps/api/prisma apps/api/prisma
COPY --from=base /app/apps/api/node_modules apps/api/node_modules
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/apps/api/package.json apps/api/
COPY --from=base /app/package.json ./

EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]
