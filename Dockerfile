# Production Multi-Stage Dockerfile for Promptjoo Unified Deployment
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install system build dependencies for native Node addons (better-sqlite3, argon2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Activate pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Copy workspace dependency configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps
COPY scripts ./scripts

# Install dependencies deterministically
RUN pnpm install --frozen-lockfile

# Build all packages, services and Next.js web application
RUN pnpm run build

# Stage 2: Minimal Production Runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV INTERNAL_API_PORT=4000
ENV HOST=0.0.0.0

# Install runtime utilities (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Copy built workspace from builder
COPY --from=builder /app /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["node", "scripts/start-all.js"]
