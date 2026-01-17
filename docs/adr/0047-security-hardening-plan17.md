# ADR-0047: Security Hardening (Plan 17)

**Status:** Accepted
**Date:** 2026-01-17
**Decision Makers:** Roberto

## Context

A comprehensive security audit identified several areas requiring hardening:

1. CSRF helper existed but was not enforced on mutating endpoints
2. Client-side sessionStorage was used for userId (bypassable)
3. Admin analytics routes lacked role-based access control
4. Rate limiting had weak identifier validation
5. Observability lacked trace ID correlation

## Decision

Implement security hardening across 4 waves:

### Wave 1: CSRF Foundation

- **New endpoint**: `GET /api/session` issues CSRF tokens via double-submit cookie pattern
- **Enforcement**: `requireCSRF()` applied to ALL POST/PUT/PATCH/DELETE API routes
- **Pattern**:
  ```typescript
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  ```

### Wave 2: Auth Hardening

- **Server**: All routes use `validateAuth()` instead of direct cookie reads
- **Client**: Replaced 14 files using `sessionStorage.getItem('mirrorbuddy-user-id')` with cookie-based `getUserIdFromCookie()` helper
- **New helper**: `src/lib/auth/client-auth.ts`
  ```typescript
  export function getUserIdFromCookie(): string | null {
    const match = document.cookie.match(/mirrorbuddy-user-id=([^;]+)/);
    if (match?.[1]) {
      const value = decodeURIComponent(match[1]);
      const dotIndex = value.indexOf(".");
      return dotIndex > 0 ? value.substring(0, dotIndex) : value;
    }
    return null;
  }
  ```

### Wave 3: Access Control

- **RBAC**: New `validateAdminAuth()` helper checks user role
- **Admin routes**: 5 dashboard routes now require ADMIN role
- **Rate limiting**:
  - Fail-fast in production without Redis (503)
  - Reject "anonymous" identifier in production (401)
  - Prefer userId over IP for rate limit keys

### Wave 4: Observability & CI

- **Trace ID**: Logger now includes OpenTelemetry trace ID in all logs
- **CI**: Added `dependency-review.yml` workflow for vulnerability scanning
- **Note**: CodeQL workflow removed - repository uses default setup

## Files Changed

### New Files

- `src/app/api/session/route.ts` - CSRF token endpoint
- `src/lib/auth/client-auth.ts` - Cookie-based userId helper
- `src/lib/auth/__tests__/client-auth.test.ts` - Unit tests
- `.github/workflows/dependency-review.yml` - Security workflow
- `docs/operations/REDIS-FAILURE.md` - Runbook

### Modified Files (26 total)

- All mutating API routes - CSRF enforcement
- 14 client files - sessionStorage removal
- `src/lib/rate-limit.ts` - Hardening
- `src/lib/auth/session-auth.ts` - validateAdminAuth
- `src/lib/logger/index.ts` - Trace ID
- `src/lib/telemetry/otel.ts` - Business metrics

## Consequences

### Positive

- CSRF attacks blocked on all state-changing operations
- Server-side auth cannot be bypassed via sessionStorage
- Admin routes protected by role check
- Rate limiting more reliable in production
- Better observability with correlated traces

### Negative

- Client must fetch CSRF token before POST requests
- Slight latency increase for first mutation
- Redis required in production (503 if unavailable)

## Testing

- Unit tests for `getUserIdFromCookie()` helper
- E2E verification of auth flow without sessionStorage
- Manual testing of CSRF token flow

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double-Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
