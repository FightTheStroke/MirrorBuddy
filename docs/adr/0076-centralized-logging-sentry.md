# ADR 0076: Centralized Logging with Sentry Integration

## Status

Accepted

## Date

2026-01-26

## Context

MirrorBuddy needs comprehensive error monitoring to ensure zero tolerance for untracked errors in production. Previously, error handling was inconsistent:

- Some code used `console.error` directly (not captured by Sentry)
- Some code used structured logger (captured)
- No enforcement mechanism to prevent regressions

This created blind spots where production errors went undetected.

## Decision

### 1. Centralized Loggers

**Server-side** (`src/lib/logger/index.ts`):

```typescript
import { logger } from "@/lib/logger";

logger.error("Operation failed", { component: "MyComponent", userId }, error);
logger.warn("Unexpected state", { component: "MyComponent" });
logger.info("Action completed", { component: "MyComponent" });
```

**Client-side** (`src/lib/logger/client.ts`):

```typescript
import { clientLogger } from "@/lib/logger/client";

clientLogger.error("API call failed", { component: "MyComponent" }, error);
clientLogger.warn("Retry attempted", { component: "MyComponent" });
```

### 2. Automatic Sentry Capture

Both loggers automatically send to Sentry in production:

- `error` level → `Sentry.captureException()` with context
- `warn` level → `Sentry.captureMessage()` with "warning" severity
- `info`/`debug` → Console only (no Sentry, avoids quota burn)

### 3. ESLint Enforcement

`no-console` rule bans `console.error`, `console.warn`, `console.log` in `src/`:

```javascript
// eslint.config.mjs
{
  files: ["src/**/*.ts", "src/**/*.tsx"],
  ignores: ["src/lib/logger/**/*.ts", "**/*.test.ts", ...],
  rules: {
    "no-console": ["error", { allow: ["info", "debug", "time", "timeEnd"] }],
  },
}
```

**Effect**: Lint fails if anyone uses raw console methods. Forces use of centralized logger.

### 4. Client Console Capture (Fallback)

`sentry.client.config.ts` includes `captureConsoleIntegration` as defense-in-depth:

```typescript
integrations: [Sentry.captureConsoleIntegration({ levels: ["error", "warn"] })];
```

This catches any `console.error/warn` from third-party libraries.

### 5. Sentry Quota Monitoring

Dashboard card shows events consumed vs 5,000/month free tier limit:

- API: `GET /api/admin/sentry/stats`
- Component: `SentryQuotaCard` in admin dashboard

## Consequences

### Positive

- **Zero blind spots**: All errors/warnings captured in Sentry
- **Enforcement**: ESLint blocks commits with raw console usage
- **Context**: Structured logging includes component, userId, etc.
- **Quota visibility**: Dashboard shows Sentry usage vs limits

### Negative

- **Migration effort**: Existing code required updates (15+ files)
- **Sentry dependency**: Free tier has 5K events/month limit
- **Learning curve**: Developers must use correct logger per context

## Compliance

- **EU AI Act**: Error tracking supports incident documentation
- **GDPR**: Logger sanitizes PII before sending to Sentry

## Files Changed

| File                                    | Purpose                     |
| --------------------------------------- | --------------------------- |
| `src/lib/logger/index.ts`               | Server logger + Sentry      |
| `src/lib/logger/client.ts`              | Client logger + Sentry      |
| `sentry.client.config.ts`               | Console capture integration |
| `eslint.config.mjs`                     | no-console rule             |
| `src/app/api/admin/sentry/stats/`       | Quota API                   |
| `src/components/admin/SentryQuotaCard/` | Quota dashboard card        |

## Usage Examples

### Server API Route

```typescript
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // ... operation
  } catch (error) {
    logger.error(
      "POST /api/resource failed",
      { component: "ResourceAPI" },
      error,
    );
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### Client Component

```typescript
import { clientLogger } from "@/lib/logger/client";

function MyComponent() {
  const handleError = (error: Error) => {
    clientLogger.error("Component error", { component: "MyComponent" }, error);
  };
}
```

### Child Logger (Reusable Context)

```typescript
const log = logger.child({ component: "PaymentService", module: "stripe" });

log.info("Payment initiated", { amount: 100 });
log.error("Payment failed", undefined, error);
```

## References

- Sentry Next.js SDK: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- ESLint no-console: https://eslint.org/docs/rules/no-console
