# Proxy Architecture — MirrorBuddy

## ONE `proxy.ts` at `src/proxy.ts` only (default export)

NEVER create: root `proxy.ts` (forbidden) | `middleware.ts` (deprecated in Next.js 16). Two proxy files = Next picks root, ignores src → API 307 → 404 → app fails.

## Proxy skips i18n for

`/api/*`, `/admin/*`, `/_next/*`, `/monitoring`, static (`.png`, `.webp`, `.svg`), `/maestri/*`, `/avatars/*`, `/logo*`.

## Pre-push hook blocks if root `proxy.ts` exists.

## Ref: ADR 0066 §9 | `@docs/claude/vercel-deployment.md`
