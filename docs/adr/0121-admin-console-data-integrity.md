# ADR 0121: Admin Console Data Integrity

**Status**: Accepted
**Date**: 05 February 2026
**Context**: Plan 123 - Admin Console Overhaul v2

## Context

The admin console displayed misleading information that undermined operator trust and made debugging difficult:

1. **Mock data generation**: Stripe, Grafana, and Business KPI services returned fake metrics when unconfigured or when real data was insufficient
2. **False health status**: Unconfigured optional services (Sentry, Grafana, Stripe) reported as "unhealthy" even when intentionally not set up
3. **Misleading service validation**: Azure OpenAI used wrong endpoint (`/deployments` instead of `/models`), Sentry only checked configuration without testing actual connectivity
4. **Operator confusion**: No clear distinction between "service failing" vs "service not configured" vs "insufficient data for metric"

Operators reported difficulty trusting admin dashboard data and wasted time investigating "errors" that were actually intentional non-configuration.

## Decision

### 1. ServiceHealth Interface Enhancement

Added `configured: boolean` field to distinguish service states:

```typescript
interface ServiceHealth {
  healthy: boolean; // Service is working correctly
  configured: boolean; // Service is set up (env vars present)
  message: string;
  details?: object;
}
```

**Pattern**: `configured: false` means service is intentionally not set up. `configured: true, healthy: false` means actual error requiring operator attention.

### 2. Zero Mock Data Policy

**Rule**: NEVER generate fake data. When data is unavailable, return explicit `null` with structured error response.

**Changes**:

- **Stripe Service** (`stripe-admin-service.ts`): Returns empty metrics when `configured: false` instead of mock subscription counts
- **Business KPI Service** (`business-kpi-service.ts`): Fields return `null` when insufficient data:
  - `growthRate`: Requires 2+ months of data
  - `churnRate`: Requires active subscription data
  - `totalRevenue`: Requires Stripe configuration
  - `avgDuration`: Requires session completion data
- **Deleted**: `business-kpi-mock-data.ts` (entire file removed)

### 3. Infrastructure Panel Null Returns

Infrastructure panels return `null` when unconfigured instead of mock fallbacks:

- **Stripe panel**: `null` when API keys not set
- **Grafana panel**: `null` when unreachable or credentials missing
- **Key Vault panel**: `null` on configuration error

UI displays "N/A" with tooltips explaining why data is unavailable ("Stripe not configured", "Insufficient data (requires 2+ months)").

### 4. Health Check Improvements

**Azure OpenAI Endpoint Correction**: Changed from `/deployments` to `/models` for proper service validation (`src/lib/admin/health-service.ts`).

**Sentry Validation Enhancement**: Changed from configuration-only check to actual API validation. Makes real API call to verify Sentry connectivity.

**Overall Status Logic**: Modified to ignore services with `configured: false`. Only configured services counted when calculating overall system health. Prevents "unhealthy" status when optional services intentionally not configured.

### 5. Health Page UI Split

Separated display into two sections (`src/app/admin/mission-control/health/page.tsx`):

- **Configured Services**: Show health status (healthy/unhealthy)
- **Unconfigured Services**: Listed separately, not counted as errors

### 6. Error Message Enhancement

**Key Vault**: Added explicit error messages identifying missing env vars ("AZURE_KEY_VAULT_URL not configured", "AZURE_TENANT_ID missing").

**Grafana**: Fixed HTTPS certificate validation for production Grafana Cloud connectivity.

## Consequences

### Positive

- **Transparency**: Operators immediately see which services are not configured vs actually failing
- **Trust**: No confusion between real metrics and placeholder data
- **Faster debugging**: Clear error messages reduce troubleshooting time from minutes to seconds
- **Data quality**: Clear distinction between "no data" and "real zero"
- **Honest reporting**: Admin dashboard now accurately reflects actual system state

### Negative

- **Less visual polish**: Empty states with "N/A" less aesthetically pleasing than mock charts
- **Configuration burden**: Operators must configure all desired services to see full dashboard
- **Null handling**: All consuming UI components must handle `null` gracefully

### Migration

No database changes required. Services gracefully degrade when environment variables missing.

## Rationale

**Why `configured` field?**: Many services (Stripe, Grafana, Sentry) are optional and may not be set up in all environments (dev, staging, prod). The health check should not report these as "failing" when they're simply not configured.

**Why actual API validation for Sentry?**: Configuration check only verified DSN exists, not that Sentry is actually reachable. Real API call provides true health status.

**Why null over mock data?**: Mock data misleads operators about actual system state. Better to show explicit "not configured" or "insufficient data" state than fake data that looks real.

## Files Modified

- `src/lib/admin/health-service.ts` - Service health checks with `configured` field
- `src/lib/admin/stripe-admin-service.ts` - Removed mock data generation
- `src/lib/admin/business-kpi-service.ts` - Null returns for insufficient data
- `src/lib/admin/grafana-admin-service.ts` - Certificate validation fix
- `src/lib/admin/key-vault-service.ts` - Explicit error messages
- `src/app/admin/mission-control/health/page.tsx` - UI split (configured/unconfigured)
- `src/app/admin/mission-control/stripe/page.tsx` - Null handling UI
- `src/app/admin/mission-control/grafana/page.tsx` - Null handling UI
- `src/app/admin/mission-control/key-vault/page.tsx` - Null handling UI

**Deleted**: `src/lib/admin/business-kpi-mock-data.ts`

## Related

- ADR 0106: Admin Panel Redesign
- ADR 0058: Observability and KPIs for Beta Launch
