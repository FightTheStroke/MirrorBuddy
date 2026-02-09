# Plan 141: Sentry Fix All Runtimes — Running Notes

## W1: Sentry Enable Fix

- **Decision**: Use `NODE_ENV === 'production'` instead of `VERCEL_ENV`/`NEXT_PUBLIC_VERCEL_ENV` for Sentry enable gate
- **Root cause**: `NEXT_PUBLIC_VERCEL_ENV` is never auto-set by Vercel (only `VERCEL_ENV` is). Client-side Sentry requires `NEXT_PUBLIC_` prefix for env vars to be inlined in the browser bundle. Result: client Sentry was 100% disabled.
- **Anti-pattern removed**: Triple-blocking (enabled flag + beforeSend null-return + console.log) across all 3 configs. Single gate (`enabled` flag) is now the only check.
- **Pattern**: `beforeSend` should only do enrichment (tagging, context), never gating. Use `enabled` flag for production gating.
- **Escape hatch**: `SENTRY_FORCE_ENABLE=true` (server) / `NEXT_PUBLIC_SENTRY_FORCE_ENABLE=true` (client) preserved for debug scenarios.
- **Error boundaries**: Both `global-error.tsx` and `error.tsx` already call `Sentry.captureException` — no changes needed.
- **Self-test**: Updated to use `NODE_ENV` + `Sentry.getClient()` for actual SDK state reporting.
