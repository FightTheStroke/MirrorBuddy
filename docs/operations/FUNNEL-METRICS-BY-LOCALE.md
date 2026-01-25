# Funnel Metrics Segmentation by Locale

**Plan**: T6-04 - Add locale to funnel conversion tracking
**Status**: Implemented
**Date**: 2026-01-25

## Overview

MirrorBuddy's conversion funnel tracking now captures locale information to enable geographic/language-specific analysis of user conversion patterns. This allows us to:

- Track trial signup rates by locale
- Measure onboarding completion by language/region
- Analyze feature adoption across different locales
- Identify locale-specific bottlenecks in the conversion funnel
- Optimize user experience for different language communities

## Data Capture

### Funnel Events with Locale

The `FunnelEvent` model in the database now includes a `locale` field:

```prisma
model FunnelEvent {
  id String @id @default(cuid())
  visitorId String? // Trial users
  userId String? // Authenticated users
  stage String // VISITOR, TRIAL_START, TRIAL_ENGAGED, LIMIT_HIT, etc.
  locale String? // ISO 639-1 locale code (e.g., "it", "en", "fr", "es")
  metadata Json?
  createdAt DateTime @default(now())
  isTestData Boolean @default(false)
}
```

### Automatic Locale Detection

Locale is automatically captured from the client-side environment:

1. **Client tracking**: `src/lib/funnel/client.ts`
   - Auto-detects from `document.documentElement.lang`
   - Falls back to `useLocaleForTelemetry()` hook
   - Defaults to "it" (Italian) if not available
   - Can be explicitly provided as parameter

2. **API endpoint**: `POST /api/funnel/track`
   - Accepts `locale` in request body
   - Stores alongside funnel event data
   - Logs locale for debugging

3. **Database storage**:
   - Indexed on `(locale, createdAt)` for fast queries
   - Supports historical analysis of all funnel stages

## API Endpoints

### Track Funnel Event

**Endpoint**: `POST /api/funnel/track`

**Request body**:
```json
{
  "stage": "TRIAL_START",
  "fromStage": "VISITOR",
  "locale": "it",
  "metadata": {
    "action": "prova_gratis_click",
    "page": "welcome"
  }
}
```

**Response**:
```json
{
  "success": true,
  "stage": "TRIAL_START",
  "locale": "it"
}
```

### Funnel Analytics by Locale

**Endpoint**: `GET /api/admin/funnel/by-locale`

**Query Parameters**:
- `startDate` (YYYY-MM-DD): Start of analysis period (default: 30 days ago)
- `endDate` (YYYY-MM-DD): End of analysis period (default: today)

**Response example**:
```json
{
  "summary": {
    "totalLocales": 4,
    "totalEvents": 1240,
    "periodStart": "2025-12-26",
    "periodEnd": "2026-01-25"
  },
  "byLocale": [
    {
      "locale": "it",
      "stageBreakdown": {
        "VISITOR": 450,
        "TRIAL_START": 180,
        "TRIAL_ENGAGED": 95,
        "LIMIT_HIT": 42,
        "BETA_REQUEST": 28,
        "APPROVED": 18,
        "FIRST_LOGIN": 12,
        "ACTIVE": 8
      },
      "conversionRates": {
        "visitorToTrialStart": 40.00,
        "trialStartToEngaged": 52.78,
        "engagedToLimitHit": 44.21,
        "limitHitToBetaRequest": 66.67,
        "betaRequestToApproved": 64.29,
        "approvedToFirstLogin": 66.67,
        "firstLoginToActive": 66.67
      },
      "totalEvents": 833,
      "uniqueVisitors": 450,
      "uniqueUsers": 25
    },
    {
      "locale": "en",
      "stageBreakdown": {
        "VISITOR": 280,
        "TRIAL_START": 112,
        "TRIAL_ENGAGED": 67
      },
      "conversionRates": {
        "visitorToTrialStart": 40.00,
        "trialStartToEngaged": 59.82
      },
      "totalEvents": 459,
      "uniqueVisitors": 280,
      "uniqueUsers": 15
    }
  ],
  "topLocales": [
    {
      "locale": "it",
      "events": 833,
      "conversionToTrialStart": 40.00
    },
    {
      "locale": "en",
      "events": 459,
      "conversionToTrialStart": 40.00
    }
  ]
}
```

## Usage in Code

### Client-side Funnel Tracking

```typescript
import { trackFunnelEvent } from "@/lib/funnel/client";

// Automatic locale detection
trackFunnelEvent({
  stage: "TRIAL_START",
  fromStage: "VISITOR",
  metadata: { page: "welcome" }
});

// Explicit locale
trackFunnelEvent({
  stage: "TRIAL_START",
  locale: "en",
  metadata: { page: "welcome" }
});
```

### Server-side Funnel Recording

```typescript
import { recordFunnelEvent, recordStageTransition } from "@/lib/funnel";

// Record specific event
await recordFunnelEvent({
  userId: "user-123",
  stage: "FIRST_LOGIN",
  locale: "it",
  metadata: { source: "email" }
});

// Record transition with automatic fromStage
await recordStageTransition(
  { userId: "user-123" },
  "ACTIVE",
  { reason: "completed_onboarding" },
  "it" // locale parameter
);
```

## Metrics Dashboard

Access locale-segmented funnel metrics at:
- **Admin path**: `/admin/funnel` (main dashboard)
- **Analytics endpoint**: `GET /api/admin/funnel/by-locale`

### Key Metrics by Locale

For each locale, the system tracks:

1. **Stage Breakdown**
   - Total events per funnel stage
   - Unique visitors reaching each stage
   - Unique users (authenticated)

2. **Conversion Rates**
   - Visitor → Trial Start
   - Trial Start → Engaged (1+ chats)
   - Engaged → Limit Hit
   - Limit Hit → Beta Request
   - Beta Request → Approved
   - Approved → First Login
   - First Login → Active

3. **Summary Statistics**
   - Total events by locale
   - Unique visitor count
   - Authenticated user count

## Supported Locales

Currently tracked locales (ISO 639-1):
- **it** - Italian (default)
- **en** - English
- **fr** - French
- **es** - Spanish
- **de** - German
- _Others added dynamically as supported_

## Database Indexes

For optimal query performance:

```sql
-- Locale-based queries
CREATE INDEX idx_funnel_events_locale_created
ON "FunnelEvent"(locale, "createdAt");

-- Combined queries
CREATE INDEX idx_funnel_events_stage_locale_created
ON "FunnelEvent"(stage, locale, "createdAt");
```

These indexes enable fast aggregation of conversion metrics across locales.

## Backward Compatibility

- Existing funnel events without locale are migrated with `locale = NULL`
- Queries gracefully handle `NULL` locales (grouped as "unknown")
- All tracking functions work with or without explicit locale parameter

## Future Enhancements

1. **Geographic segmentation**: Add country code alongside locale
2. **Timezone-aware analysis**: Group events by user timezone
3. **A/B testing by locale**: Test different UI copy per locale
4. **Localized reports**: Generate PDF reports in user's language
5. **Predictive analytics**: Identify at-risk cohorts by locale

## References

- **Funnel tracking module**: `src/lib/funnel/`
- **Client-side tracking**: `src/lib/funnel/client.ts`
- **API endpoint**: `src/app/api/funnel/track/route.ts`
- **Locale-segmented analytics**: `src/app/api/admin/funnel/by-locale/route.ts`
- **Database schema**: `prisma/schema/analytics.prisma`
- **Locale context**: `src/lib/telemetry/locale-context.ts`

## Implementation Timeline

- **Sprint T6-04**: Locale field added to FunnelEvent model
- **Data retention**: 90 days (configurable)
- **Metrics refresh**: Real-time for live dashboard, hourly for reports
