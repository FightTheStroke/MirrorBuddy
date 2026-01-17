# ADR 0046: Production Hardening (Plan 46)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2025-01-17 |
| **Deciders** | Roberto D'Angelo |
| **Technical Story** | Production Hardening 10/10 |

## Context and Problem Statement

MirrorBuddy needed production hardening to achieve 10/10 release readiness. This ADR documents the 27 functional requirements (F-01 to F-27) implemented across 3 waves to address security, privacy, observability, and code quality concerns.

## Decision Drivers

- **Child Safety**: Platform serves students with learning differences
- **GDPR/COPPA Compliance**: Italian and EU privacy regulations
- **Production Readiness**: ISE Engineering Fundamentals compliance
- **Maintainability**: Code quality for long-term development

## Decision Outcome

Implemented 27 requirements across 3 priority waves:

### W1: P0 Security & Privacy Blockers (6 requirements)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| F-01 | Content Security Policy | Strict CSP in `middleware.ts` with nonces |
| F-02 | CSRF Protection | HMAC-SHA256 cookie signing in `src/lib/auth/cookie-signing.ts` |
| F-03 | COPPA Compliance | Parent consent flow in `prisma/schema/privacy.prisma` |
| F-04 | PII Blocking | Italian PII detection in `src/lib/privacy/pii-detector.ts` |
| F-05 | pgvector Security | Content sanitization before embedding |
| F-06 | Rate Limiting | Token bucket (60 req/min) in `src/lib/rate-limit.ts` |

### W2: P1 Critical Infrastructure (8 requirements)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| F-07 | Budget Enforcement | Hard stop at Azure spending limit |
| F-08 | Integration Tests | Prisma transaction-based tests |
| F-09 | Error Boundaries | React boundaries with logging in `src/components/error-boundary.tsx` |
| F-10 | Health Endpoints | `/api/health` and `/api/health/detailed` |
| F-11 | Structured Logging | JSON/human logging in `src/lib/logger/` |
| F-12 | SLI/SLO Documentation | `docs/operations/SLI-SLO.md` |
| F-13 | Runbook | `docs/operations/RUNBOOK.md` |
| F-14 | Deferred Items | Documented in ADR 0039 |

### W3: P2 Code Quality (7 requirements)

| ID | Requirement | Implementation |
|----|-------------|----------------|
| F-21 | Request Tracing | Request ID in `src/lib/tracing/` |
| F-22 | Console.log Cleanup | 11 files migrated to structured logger |
| F-23 | localStorage Audit | ADR 0015 compliance verified |
| F-24 | Empty Catch Blocks | 13 blocks fixed in 4 files |
| F-25 | ESLint Warnings | All warnings resolved |
| F-26 | Admin Role | UserRole enum + `requireAdmin()` middleware |
| F-27 | Circular Dependencies | 0 cycles verified (1867 files) |

## Technical Details

### CSP Implementation (F-01)

```typescript
// middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  connect-src 'self' https://*.openai.azure.com wss://*.openai.azure.com;
`;
```

### Cookie Signing (F-02)

```typescript
// src/lib/auth/cookie-signing.ts
export function signCookieValue(value: string): string {
  const signature = createHmac('sha256', COOKIE_SECRET)
    .update(value)
    .digest('base64url');
  return `${value}.${signature}`;
}
```

### Admin Authorization (F-26)

```typescript
// src/lib/auth/require-admin.ts
export async function requireAdmin(userId: string): Promise<AdminCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return { authorized: user?.role === 'ADMIN' };
}
```

### Request Tracing (F-21)

```typescript
// src/lib/tracing/request-id.ts
export function getRequestLogger(request: NextRequest) {
  const requestId = getRequestId(request);
  return logger.child({ requestId, method: request.method, path });
}
```

## Consequences

### Positive

- Production-ready security posture
- GDPR/COPPA compliance infrastructure
- Observable system with structured logging
- Zero circular dependencies
- Clean codebase with no ESLint warnings

### Negative

- Additional middleware overhead for CSP nonces
- Cookie size increase from signatures

### Items Still Deferred (per ADR 0039)

- Full OAuth authentication (Azure AD B2C)
- Redis for distributed rate limiting
- OpenTelemetry distributed tracing
- Infrastructure as Code (Bicep/Terraform)

## Validation

```bash
# All validations passed
npm run lint          # 0 errors, 0 warnings
npm run typecheck     # Clean
npm run build         # Success
npx madge --circular  # No circular dependencies
```

## Related ADRs

- [ADR 0004: Safety Guardrails](./0004-safety-guardrails.md)
- [ADR 0015: Database-First Architecture](./0015-database-first-architecture.md)
- [ADR 0039: Deferred Production Items](./0039-deferred-production-items.md)
- [ADR 0042: Ethical Design Hardening](./0042-ethical-design-hardening.md)

---
*Plan 46 | January 2025*
