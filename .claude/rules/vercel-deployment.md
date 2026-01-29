# Vercel Deployment Rules - MirrorBuddy

## Architecture: CI-Controlled

Push to main -> Vercel SKIPS build (ignoreCommand) -> CI runs 14 checks -> deployment-gate -> CI deploys via Vercel CLI

## Required Env Vars

DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, CRON_SECRET, SUPABASE_CA_CERT, AZURE_OPENAI_API_KEY, TOKEN_ENCRYPTION_KEY

## SSL - CRITICAL

- **NEVER** use `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Use per-connection `ssl: { rejectUnauthorized: false }` only
- Certificate format: `cat config/supabase-chain.pem | tr '\n' '|'`
- Strip sslmode from connection string (handled by `cleanConnectionString()`)

## Static Assets - CRITICAL

proxy.ts matcher MUST exclude files with extensions: `/((?!api|admin|_next|_vercel|monitoring|.*\\..*).*)`
Wrong pattern = ALL images broken (307 redirect to /it/\*.png = 404).

## Pre-push: `npm run pre-push` (automatic on git push)

## Build: `prisma generate && npm run build && npm run seed:admin`

## Common Failures

| Error            | Fix                                     |
| ---------------- | --------------------------------------- |
| Images broken    | Fix proxy.ts matcher                    |
| self-signed cert | Use rejectUnauthorized: false           |
| sslmode conflict | Strip sslmode from URL                  |
| Prisma stale     | Delete node_modules/.prisma, regenerate |

## Full reference: `@docs/claude/vercel-deployment.md`
