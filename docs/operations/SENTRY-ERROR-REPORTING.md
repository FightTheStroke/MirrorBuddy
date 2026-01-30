# Sentry Error Reporting - MirrorBuddy

## Problem Statement

Prior to 2026-01-29, most API routes had try/catch blocks that logged errors locally but **did not report them to Sentry**. This meant:

- No error alerts were triggered
- No notifications were sent to the team
- Errors were silently swallowed, making debugging difficult
- Production issues went unnoticed

**Impact**: 144+ API routes had this issue, affecting critical paths like chat, authentication, and data operations.

## Solution

Added `Sentry.captureException()` calls to all API route error handlers to ensure errors are properly reported and monitored.

## Error Reporting Patterns

### Pattern 1: API Handler Wrapper (Recommended for New Routes)

```typescript
import { apiHandler, errors } from "@/lib/api/error-handler";

export const POST = apiHandler(async (request) => {
  // Your logic here
  // Throws are automatically caught and reported to Sentry
  if (!data) {
    throw errors.badRequest("Missing required field");
  }

  return NextResponse.json({ success: true });
});
```

**Benefits**:

- Automatic error capture
- Consistent error responses
- Minimal boilerplate
- Proper status codes

### Pattern 2: Manual Error Reporting (Existing Routes)

```typescript
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/my-route" },
    });

    logger.error("Operation failed", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**When to use**:

- Existing routes with complex error handling
- When you need custom error logic
- Gradual migration to Pattern 1

## Sentry Configuration

### Client (sentry.client.config.ts)

- 100% trace sampling (beta phase)
- Session replay on errors
- Console error/warn capture
- Browser tracing
- Feedback widget
- **Only enabled in Vercel production** (use `SENTRY_FORCE_ENABLE=true` for testing)

### Server (sentry.server.config.ts)

- 100% trace sampling
- Unhandled rejection/exception capture
- HTTP request tracing
- Prisma/Database tracing
- **Only enabled in Vercel production**

### Edge (sentry.edge.config.ts)

- 100% trace sampling
- Edge runtime error capture

## Alert Configuration

Alert rules are configured in the **Sentry Dashboard UI**, not in code:

1. Go to https://sentry.io/organizations/mirrorbuddy/alerts/
2. Create alert rules for:
   - Error frequency (e.g., > 10 errors in 5 minutes)
   - New error types
   - Regression (errors that were marked resolved)
   - Performance degradation

**Recommended alerts**:

- **High Priority**: Any error in `/api/chat`, `/api/auth`, `/api/trial`
- **Medium Priority**: Any 500 error (5+ occurrences in 10 min)
- **Low Priority**: Client-side errors (informational)

## Testing Error Reporting

### Local Testing

```bash
# Set force enable flag
export SENTRY_FORCE_ENABLE=true

# Start app
npm run dev

# Trigger test error
curl http://localhost:3000/api/admin/sentry/self-test
```

### Production Testing

Use the self-test endpoint (admin only):

```bash
curl https://mirrorbuddy.org/api/admin/sentry/self-test
```

## Migration Status

✅ **Fixed (15 routes)**:

- `/api/chat`
- `/api/homework/analyze`
- `/api/session`
- `/api/typing`
- `/api/concepts`
- `/api/tts`
- `/api/tags`
- `/api/parent-notes`
- `/api/collections`
- `/api/conversations`
- `/api/invites/request`
- `/api/auth/login`
- `/api/search`
- `/api/health/assets`
- `/api/tos`

🔄 **Remaining**: ~129 routes still need migration

## Best Practices

1. **Always report 5xx errors to Sentry** (server errors, not client validation errors)
2. **Add route tags** for easy filtering: `tags: { api: "/api/route-name" }`
3. **Include context** for debugging: `extra: { userId, requestId }`
4. **Use error boundaries** for React component errors
5. **Test error reporting** in preview environments with `SENTRY_FORCE_ENABLE=true`

## Error Boundary Coverage

| Component                           | Sentry Reporting | Status |
| ----------------------------------- | ---------------- | ------ |
| `src/app/error.tsx`                 | ✅ Yes           | Active |
| `src/app/global-error.tsx`          | ✅ Yes           | Active |
| `src/components/error-boundary.tsx` | ✅ Yes           | Active |

## Monitoring

- **Sentry Dashboard**: https://sentry.io/organizations/mirrorbuddy/
- **Error frequency**: Check daily for spikes
- **New issues**: Review and triage within 24h
- **Performance**: Monitor transaction performance for slowdowns

## References

- ADR: (to be created) - API Error Reporting Standards
- Script: `scripts/add-sentry-to-api-errors.ts`
- Utility: `src/lib/api/error-handler.ts`
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
