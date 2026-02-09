---
description: 'CRITICAL proxy architecture rules - only ONE proxy at src/proxy.ts'
applyTo: 'src/proxy.ts,src/components/providers.tsx'
---

# Proxy Architecture (CRITICAL)

## Only ONE proxy — at `src/proxy.ts` (default export required)

**NEVER create**:

- Root `proxy.ts` (FORBIDDEN)
- `middleware.ts` (deprecated in Next.js 16)

Two proxy files = Next.js uses root, ignores src = API 307 redirects = 404 = app failure.

## Path Exclusions

Proxy MUST skip i18n for:
`/api/*`, `/admin/*`, `/_next/*`, `/monitoring`, static files
(`.png`, `.webp`, `.svg`), `/maestri/*`, `/avatars/*`, `/logo*`

## CSP

- CSP header defined in `src/proxy.ts`
- Nonces applied in `src/components/providers.tsx`
- Before modifying: `npm run test:unit -- csp-validation`
- "Caricamento..." forever = CSP blocking a resource

## Pre-push Hook

Hook blocks if root `proxy.ts` exists.

Reference: ADR 0066 Section 9
