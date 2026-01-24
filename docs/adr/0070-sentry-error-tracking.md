# ADR 0070: Sentry Error Tracking Integration

## Status

Accepted

## Date

2026-01-24

## Context

MirrorBuddy runs on Vercel in production. Testing locally and in CI doesn't catch all runtime errors that occur in production due to:

- Different CSP headers between environments
- Network latency and edge cases
- Browser-specific behaviors
- Third-party script interactions

We discovered CSP-related crashes in production that weren't visible in local testing. We need real-time error tracking to:

1. Detect errors as they happen in production
2. Get stack traces with source maps for debugging
3. Understand error impact (how many users affected)
4. Alert on high-priority issues

## Decision

Integrate **Sentry** for client-side and server-side error tracking.

### Implementation

**SDK**: `@sentry/nextjs` with three config files:

- `sentry.client.config.ts` - Browser errors, replay on error
- `sentry.server.config.ts` - API route errors
- `sentry.edge.config.ts` - Edge runtime errors

**Features enabled**:

- Source maps upload via webpack plugin
- React component annotation for better error context
- Tunnel route (`/monitoring`) to bypass ad-blockers
- `onRequestError` hook in `instrumentation.ts` for API errors

**Features disabled** (privacy):

- Session replay sampling: 0% (only on error)
- All text masked in replays
- All media blocked in replays

### CSP Configuration

Added to `src/proxy.ts`:

```typescript
const sentryDomains = "*.ingest.us.sentry.io *.ingest.de.sentry.io";
```

Supports both US and EU Sentry regions.

### Environment Variables

| Variable                 | Purpose                    | Required |
| ------------------------ | -------------------------- | -------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Client/server error ingest | Yes      |
| `SENTRY_AUTH_TOKEN`      | Source maps upload         | CI only  |
| `SENTRY_ORG`             | Organization ID            | CI only  |
| `SENTRY_PROJECT`         | Project ID                 | CI only  |

### Privacy Compliance

Updated privacy policy v1.4 with Sentry disclosure:

- Only technical errors captured (stack traces, browser info)
- No PII collected (no emails, names, chat content)
- EU datacenter option available
- GDPR compliant

## Consequences

### Positive

- Real-time visibility into production errors
- Source maps enable debugging without exposing source code
- Tunnel route ensures data collection even with ad-blockers
- Low overhead (~20KB gzipped client bundle increase)

### Negative

- Third-party dependency for critical monitoring
- Requires careful CSP configuration
- Source maps must be uploaded on each deploy

### Neutral

- Dashboard at sentry.io (external service)
- Can integrate with Grafana via Sentry datasource plugin

## Alternatives Considered

1. **Vercel Error Tracking**: Limited features, Pro plan only
2. **LogRocket**: Heavier, session replay focus
3. **Custom error boundary + logging**: More work, less features

## Related ADRs

- ADR 0047: Grafana Cloud Observability (metrics push)
- ADR 0058: Observability KPIs (business metrics)
