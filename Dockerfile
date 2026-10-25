# Lean Production Dockerfile with Pre-Built Artifacts
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV INTERNAL_API_PORT=4000
ENV HOST=0.0.0.0

# Install build tools for native node addons (better-sqlite3, argon2) and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Activate pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Copy workspace configs, source, and pre-built artifacts
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json ./
COPY packages ./packages
COPY services ./services
COPY apps/web ./apps/web
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY scripts ./scripts
COPY dist ./dist

# Install production dependencies only (frozen lockfile, skips heavy devDependencies)
RUN pnpm install --prod --frozen-lockfile

# Ensure log and cache directories exist and give ownership to node user
RUN mkdir -p /app/services/core-api/data /app/apps/web/dist-next/cache /app/apps/web/dist-next/server/route-cache \
    && chown -R node:node /app/services/core-api/data /app/apps/web/dist-next

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["node", "scripts/start-all.js"]
