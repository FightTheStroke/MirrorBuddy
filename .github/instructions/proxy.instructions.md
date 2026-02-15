---
description: 'CRITICAL proxy architecture rules - only ONE proxy at src/proxy.ts'
applyTo: 'src/proxy.ts,src/components/providers.tsx'
---

# Proxy (CRITICAL)

## Only ONE

`src/proxy.ts` (default export) — FORBIDDEN: root `proxy.ts`, `middleware.ts`
Two proxies = Next.js uses root = API 307 = 404

## Exclusions

Skip i18n: `/api/*`, `/admin/*`, `/_next/*`, `/monitoring`, static files, `/maestri/*`, `/avatars/*`, `/logo*`

## CSP

Header: `src/proxy.ts` | Nonces: `src/components/providers.tsx` | Verify: `npm run test:unit -- csp-validation`

Pre-push hook blocks root `proxy.ts`. Reference: ADR 0066 §9 (proxy exclusion paths defined in i18n architecture)

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
