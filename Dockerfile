# MirrorBuddy Production Dockerfile
# Multi-stage build for optimized image size
# ISE Engineering Fundamentals: https://microsoft.github.io/code-with-engineering-playbook/

# ==============================================================================
# Stage 1: Dependencies
# ==============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules (Prisma, sharp)
RUN apk add --no-cache libc6-compat openssl

# Install pnpm matching packageManager field in package.json
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace config + packages/ so pnpm can resolve workspace:* deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages/
COPY prisma.config.ts ./
# W2 app move (#362): prisma/ now under apps/web/prisma/
COPY apps/web/prisma ./apps/web/prisma/

# Install ALL dependencies (devDeps needed for build: Tailwind, TypeScript, PostCSS)
RUN pnpm install --frozen-lockfile

# Generate Prisma client (using prisma.config.ts for multi-file schema)
RUN pnpm exec prisma generate

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm in builder stage too (corepack activation doesn't carry across
# FROM boundaries in multi-stage Dockerfile)
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (needed for build)
RUN pnpm exec prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm run build

# ==============================================================================
# Stage 3: Runner (Production)
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install runtime dependencies
RUN apk add --no-cache openssl

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy necessary files
COPY --from=builder /app/apps/web/public ./apps/web/public
# W2c app move (#362): standalone output is now under apps/web/.next/
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/prisma.config.ts ./
# W2 app move (#362): prisma/ now under apps/web/prisma/
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
# Skip explicit .prisma COPY — Next.js output: 'standalone' already
# bundles the generated Prisma client into .next/standalone. Under pnpm's
# isolated node-modules layout (even with node-linker=hoisted), .prisma
# may not land at the expected top-level path across Docker build layers,
# and the explicit COPY fails buildx's checksum stage. Trust standalone
# output which has been handling this correctly since Next 16.

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application (standalone server.js lives under apps/web/ in workspace tracing root)
CMD ["node", "apps/web/server.js"]
