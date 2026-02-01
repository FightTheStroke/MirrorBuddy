# ADR 0113: Composable API Handler Pattern (pipe middleware)

## Status

Accepted

## Date

2026-02-01

## Context

MirrorBuddy's 210+ API routes had accumulated significant issues:

1. **Inconsistent error handling**: Each route implemented its own try/catch with varying Sentry integration
2. **Boilerplate overhead**: 15-30 lines of repetitive code per route (auth checks, CSRF validation, error wrapping)
3. **No composition**: Auth, CSRF, rate limiting, and logging couldn't be combined declaratively
4. **Maintenance burden**: Security fixes required updating every route individually

## Decision

Adopt a composable `pipe()` middleware pattern that wraps route handlers with reusable middleware functions.

### Usage Pattern

```typescript
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";

export const POST = pipe(
  withSentry("/api/resource"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // Handler body contains only business logic
  return NextResponse.json({ userId: ctx.userId });
});
```

### Available Middleware

| Middleware           | Purpose                      | Adds to ctx         |
| -------------------- | ---------------------------- | ------------------- |
| `withSentry(path)`   | Error capture + request logs | —                   |
| `withAuth`           | Session auth (cookie-based)  | `userId`            |
| `withAdmin`          | Admin auth (email allowlist) | `userId`, `isAdmin` |
| `withCSRF`           | CSRF token validation        | —                   |
| `withRateLimit(cfg)` | Rate limiting                | —                   |
| `withCron`           | Cron job auth (CRON_SECRET)  | —                   |

### MiddlewareContext Type

```typescript
interface MiddlewareContext {
  req: NextRequest;
  params: Promise<Record<string, string>>;
  userId?: string;
  isAdmin?: boolean;
}
```

### Key Files

- `src/lib/api/pipe.ts` — Core pipe function
- `src/lib/api/middlewares/` — Individual middleware modules
- `src/lib/api/middlewares/index.ts` — Re-exports all middleware

### Standard Compositions

```typescript
// Read-only authenticated endpoint
export const GET = pipe(withSentry("/api/resource"), withAuth)(handler);

// Mutating authenticated endpoint
export const POST = pipe(
  withSentry("/api/resource"),
  withCSRF,
  withAuth,
)(handler);

// Admin endpoint
export const DELETE = pipe(
  withSentry("/api/admin/resource"),
  withCSRF,
  withAdmin,
)(handler);

// Cron job
export const POST = pipe(withSentry("/api/cron/task"), withCron)(handler);
```

## ESLint Enforcement

Two custom rules prevent regression:

1. **`require-pipe-handler`** — Warns on legacy `export async function GET/POST` patterns in API routes
2. **`require-csrf-mutating-routes`** — Warns when `withCSRF` is missing from POST/PUT/PATCH/DELETE handlers

## Consequences

### Positive

- **-30% boilerplate** per route (15-30 lines → 3-5 lines of middleware declaration)
- **Consistent error handling** — All routes report to Sentry identically
- **Composable auth** — Stack middleware as needed without repetition
- **ESLint enforcement** — CI prevents legacy patterns from being introduced

### Negative

- **Learning curve** — Developers must understand the `pipe()` pattern and `ctx` object
- **SSE exception** — Server-Sent Events endpoints still use legacy pattern (require direct `ReadableStream` access)

## Migration

Routes should be migrated incrementally. The legacy pattern (validated by `validateAuth()` inline) continues to work but triggers ESLint warnings.

## Related

- ADR 0075: Cookie Handling Standards (auth validation approach)
- `src/lib/api/middlewares/` — Implementation
