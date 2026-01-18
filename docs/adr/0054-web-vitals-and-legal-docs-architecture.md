# ADR 0054: Web Vitals Analytics and Legal Documentation Architecture

**Status**: Accepted
**Date**: 2026-01-18
**Deciders**: Roberto (Plan 053)

## Context

MirrorBuddy needed:
1. **Performance monitoring** via Web Vitals (LCP, CLS, INP, TTFB, FCP) with user context for debugging
2. **Legal compliance** with Italian privacy laws and GDPR for a student-facing application
3. **Simple consent flow** appropriate for young users (14+ independently, under 14 with parent)

Previous state: No performance telemetry, no Terms of Service tracking, basic privacy page.

## Decision

### 1. Web Vitals Collection Architecture

**Client-side collection** (`src/lib/analytics/web-vitals-client.ts`):
- Uses `web-vitals@5.1.0` library with `onLCP`, `onCLS`, `onINP`, `onTTFB`, `onFCP`
- Collects metrics only after consent (`useConsentStore`)
- Batches metrics and sends on `visibilitychange` or timeout

**Transport** (`src/lib/analytics/web-vitals-sender.ts`):
- Primary: `navigator.sendBeacon` (fire-and-forget, survives page close)
- Fallback: `fetch` with `keepalive: true`
- Endpoint: `POST /api/analytics/web-vitals`

**Server-side push** (`src/lib/observability/web-vitals-push.ts`):
- Converts to Influx Line Protocol
- Pushes to Grafana Cloud Prometheus endpoint
- Includes `userId` tag for debugging specific user issues

### 2. Legal Documentation Structure

Three coordinated documents with version tracking:

| Document | Version Constant | Path |
|----------|-----------------|------|
| Terms of Service | `TOS_VERSION` | `/terms` |
| Privacy Policy | `PRIVACY_VERSION` | `/privacy` |
| Cookie Policy | `COOKIES_VERSION` | `/cookies` |

Each page follows the same pattern:
- `page.tsx`: TL;DR summary + version display + link to full content
- `content.tsx`: Full legal text (Italian only)
- `layout.tsx`: Metadata

### 3. ToS Acceptance Flow

**Database model** (Prisma):
```prisma
model TosAcceptance {
  id         String   @id @default(cuid())
  userId     String
  version    String
  acceptedAt DateTime @default(now())
  ipAddress  String?  // Last segment only for privacy
  userAgent  String?
  user       User     @relation(...)
  @@unique([userId, version])
}
```

**Client-side gate** (`TosGateProvider`):
- Checks ToS status on mount via `GET /api/tos`
- Caches acceptance in sessionStorage with version
- Shows modal if not accepted or version changed

**Re-consent detection**:
- API returns `previousVersion` if user accepted old version
- Modal shows "Termini Aggiornati" with "What changed" notice
- User must re-accept to continue

### 4. Consent State Management

**Zustand store** (`useConsentStore`):
```typescript
interface ConsentState {
  analyticsConsent: boolean;
  performanceConsent: boolean;
  setAnalyticsConsent: (value: boolean) => void;
  setPerformanceConsent: (value: boolean) => void;
}
```

Web Vitals collection checks `performanceConsent` before initializing.

## Consequences

### Positive
- **User debugging**: Can trace performance issues to specific users
- **Legal compliance**: Clear consent flow, audit trail, version tracking
- **Age-appropriate**: Simple Italian language, guardian mentions for <14
- **Automatic re-consent**: Version changes trigger modal without code changes

### Negative
- **Session-based cache**: User sees modal on new browser/device
- **No email consent**: Modal-only, no email verification for ToS

### Risks Mitigated
- **GDPR compliance**: Explicit consent, audit trail, data minimization (IP last segment only)
- **Performance impact**: Beacon API is non-blocking, batched sends
- **Version drift**: Centralized version constants, single source of truth

## Implementation Files

```
src/lib/analytics/
├── web-vitals-client.ts    # Client collection
├── web-vitals-sender.ts    # Transport layer
└── web-vitals-types.ts     # Type definitions

src/lib/observability/
└── web-vitals-push.ts      # Grafana Cloud push

src/app/api/analytics/
└── web-vitals/route.ts     # API endpoint

src/components/tos/
├── tos-gate-provider.tsx   # Client-side gate
└── tos-acceptance-modal.tsx # Acceptance UI

src/app/
├── terms/                  # ToS pages
├── privacy/                # Privacy Policy
└── cookies/                # Cookie Policy

src/app/api/tos/
└── route.ts                # ToS acceptance API
```

## Related ADRs

- ADR 0047: Grafana Cloud Observability
- ADR 0015: No localStorage for user data (Zustand stores)
