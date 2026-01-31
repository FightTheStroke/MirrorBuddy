# Vercel Deployment

> CI-controlled deployment pipeline with 14-check gate

## Quick Reference

| Key    | Value                                           |
| ------ | ----------------------------------------------- |
| Config | `vercel.json`                                   |
| Proxy  | `src/proxy.ts` (ONLY valid location)            |
| Gate   | CI runs checks -> deployment-gate -> Vercel CLI |
| ADR    | 0052, 0099                                      |

## Pipeline Flow

```
Push to main -> Vercel ignoreCommand (skips auto-build)
  -> CI runs 14 checks (lint, types, build, tests, etc.)
  -> deployment-gate passes
  -> CI deploys via Vercel CLI
```

## Required Environment Variables

| Variable              | Purpose                    | Critical |
| --------------------- | -------------------------- | -------- |
| DATABASE_URL          | PostgreSQL connection      | Yes      |
| ADMIN_EMAIL           | Admin user email           | Yes      |
| ADMIN_PASSWORD        | Admin user password        | Yes      |
| SESSION_SECRET        | Cookie signing (32+ chars) | Yes      |
| CRON_SECRET           | Cron job auth              | Yes      |
| SUPABASE_CA_CERT      | SSL certificate (piped)    | Yes      |
| AZURE_OPENAI_API_KEY  | AI provider                | Yes      |
| TOKEN_ENCRYPTION_KEY  | Token security             | Yes      |
| SENTRY_DSN            | Error tracking             | Prod     |
| GRAFANA_CLOUD_API_KEY | Metrics push               | Prod     |

## SSL Certificate Handling

```bash
# Convert cert to pipe-delimited for env var
cat config/supabase-chain.pem | tr '\n' '|'

# NEVER use NODE_TLS_REJECT_UNAUTHORIZED=0
# Use per-connection: ssl: { rejectUnauthorized: false }
# Strip sslmode from connection string (handled by cleanConnectionString())
```

## Proxy (src/proxy.ts) - Critical Rules

1. **Only ONE proxy.ts** in `src/proxy.ts` - root `proxy.ts` is FORBIDDEN
2. **Default export** required (named export will not work)
3. Must skip i18n for: `/api/*`, `/admin/*`, `/_next/*`, `/monitoring`, static files
4. Pre-push hook verifies single proxy location

## Static Asset Matcher

```typescript
// proxy.ts config.matcher - MUST exclude file extensions
source: "/((?!_next/static|_next/image|favicon.ico).*)";
```

Wrong pattern causes all images to 307 redirect to `/it/*.png` -> 404.

## Cron Jobs (vercel.json)

| Job              | Schedule       | Auth        |
| ---------------- | -------------- | ----------- |
| data-retention   | 0 3 \* \* \*   | CRON_SECRET |
| metrics-push     | _/5 _ \* \* \* | CRON_SECRET |
| business-metrics | 0 3 \* \* \*   | CRON_SECRET |
| trial-nurturing  | 0 9 \* \* \*   | CRON_SECRET |
| rotate-ip-salt   | 0 0 1 \* \*    | CRON_SECRET |

## Build Command

```bash
prisma generate && npm run build && npm run seed:admin
```

## Common Failures

| Error            | Cause                       | Fix                          |
| ---------------- | --------------------------- | ---------------------------- |
| Images broken    | Proxy matcher wrong         | Fix proxy.ts matcher pattern |
| self-signed cert | Missing SUPABASE_CA_CERT    | Add piped cert to env        |
| sslmode conflict | sslmode in DATABASE_URL     | Use cleanConnectionString()  |
| Prisma stale     | Cached .prisma dir          | Delete node_modules/.prisma  |
| CSP blocking     | Missing nonce in script-src | Check buildCSPHeader()       |

## See Also

- `vercel.json` - ignoreCommand and cron configuration
- ADR 0052 (deployment config), ADR 0099 (deployment gate)
- `.claude/rules/proxy-architecture.md` - Proxy rules
