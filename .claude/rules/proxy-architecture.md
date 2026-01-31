# Proxy Architecture - MirrorBuddy

## CRITICAL: Only ONE `proxy.ts` — at `src/proxy.ts` (default export required)

**NEVER create**: root `proxy.ts` (FORBIDDEN) or `middleware.ts` (deprecated in Next.js 16).
Two proxy files = Next.js uses root, ignores src → API 307 redirects → 404 → complete app failure.

## Path Exclusion

Proxy MUST skip i18n for: `/api/*`, `/admin/*`, `/_next/*`, `/monitoring`, static files (`.png`, `.webp`, `.svg`), `/maestri/*`, `/avatars/*`, `/logo*`

## Pre-push hook blocks if root `proxy.ts` exists.

## Reference: ADR 0066 Section 9 | `@docs/claude/vercel-deployment.md`
