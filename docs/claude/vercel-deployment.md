# Vercel Deployment - Full Reference

## Architecture: CI-Controlled via Vercel CLI

```
Push to main -> Vercel SKIPS build (ignoreCommand) -> CI runs 14 checks -> deployment-gate -> CI deploys via Vercel CLI
```

### Why (The proxy.ts Disaster, 2026-01-27)

Push -> Vercel deployed immediately -> CI still running -> Tests would have caught bug -> ALL images broken, ALL API 404.

### CI Jobs (deployment-gate aggregates all)

| Category    | Checks                                         |
| ----------- | ---------------------------------------------- |
| Build       | build                                          |
| Security    | secret-scanning, security, llm-safety-tests    |
| Quality     | debt-check, quality, docs, migrations          |
| Tests       | unit-tests, smoke-tests, e2e-tests, mobile-e2e |
| Performance | docker, performance                            |

### Branch Protection: Deployment Gate + Build & Lint + E2E + Mobile E2E

## Pre-push Validation

`npm run pre-push` (automatic on git push):
Migration naming, Prisma generate, ESLint, TypeScript, npm audit, Build, Vercel env vars, CSRF, critical TODOs, console.log, secrets

## Required Env Vars

DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, CRON_SECRET, SUPABASE_CA_CERT, AZURE_OPENAI_API_KEY, TOKEN_ENCRYPTION_KEY

## SSL Configuration (ADR 0063, 0067)

**NEVER** use `NODE_TLS_REJECT_UNAUTHORIZED=0` (disables TLS globally).

Per-connection only:

```typescript
const pool = new Pool({
  connectionString: cleanConnectionString(connStr),
  ssl: { rejectUnauthorized: false, ca: certificateChain },
});
```

Supabase uses own CA (not in system trust stores). Traffic still encrypted.

### sslmode Conflict

Strip from URL: `cleanConnectionString()` removes `?sslmode=require`.

### Certificate Format

```bash
cat config/supabase-chain.pem | tr '\n' '|'
```

ssl-config.ts converts back: `envCert.split("|").join("\n")`

## Static Assets & proxy.ts (CRITICAL)

Matcher MUST exclude files with extensions:

```typescript
export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|monitoring|.*\\..*).*)"],
};
```

Wrong pattern = images get 307 redirect to /it/\*.png = 404.
E2E test CP-07 verifies. Never use specific extension lists.

## Common Failures

| Error                | Cause            | Fix                       |
| -------------------- | ---------------- | ------------------------- |
| Images broken        | i18n redirect    | Fix proxy.ts matcher      |
| self-signed cert     | Wrong SSL        | rejectUnauthorized: false |
| DB not found         | sslmode conflict | Strip sslmode             |
| Prisma stale         | Cached .prisma   | Delete + regenerate       |
| Seed failed          | Missing env      | Add ADMIN_EMAIL, PASSWORD |
| CRON_SECRET mismatch | Whitespace       | Use printf not echo       |

## Build Process

`prisma generate && npm run build && npm run seed:admin || echo 'skip'`

## Health Check

```bash
curl -s https://mirrorbuddy.vercel.app/api/health | jq '.'
```

DB latency: < 1000ms = pass, >= 1000ms = warn

## ADRs: 0063 (SSL), 0067 (DB Performance)
