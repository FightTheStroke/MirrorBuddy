---
description: 'CRITICAL proxy architecture rules - only ONE proxy at apps/web/src/proxy.ts'
applyTo: 'apps/web/src/proxy.ts,apps/web/src/components/providers.tsx'
---

# Proxy (CRITICAL)

## Only ONE

`apps/web/src/proxy.ts` (default export) — FORBIDDEN: `proxy.ts` or `middleware.ts`
at the repository root or at `apps/web/`
Two proxies = Next.js uses root = API 307 = 404

## Exclusions

Skip i18n: `/api/*`, `/admin/*`, `/_next/*`, `/monitoring`, static files, `/maestri/*`, `/avatars/*`, `/logo*`

## CSP

Header: `apps/web/src/proxy.ts` | Nonces: `apps/web/src/components/providers.tsx` |
Verify from worktree root: `npm run test:unit -- csp-validation`

Pre-push hook blocks root `proxy.ts`. Reference: ADR 0066 §9 (proxy exclusion paths defined in i18n architecture)

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
