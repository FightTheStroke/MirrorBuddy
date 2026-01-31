# Staging System

> Logical staging environment on Vercel preview deployments with zero infrastructure cost

## Quick Reference

| Key       | Value                                            |
| --------- | ------------------------------------------------ |
| Detection | `src/lib/environment/staging-detector.ts`        |
| DB layer  | `src/lib/db.ts` (Prisma extension, auto-tagging) |
| Banner    | `src/components/ui/staging-banner.tsx`           |
| Admin     | `src/components/admin/staging-data-toggle.tsx`   |
| Purge API | `DELETE /api/admin/purge-staging-data`           |
| Plan      | Plan 75 / ADR 0073 (pending)                     |

## Architecture

```
Production (main)     -> VERCEL_ENV=production -> Normal operations
Preview (PR/branches) -> VERCEL_ENV=preview   -> is_test_data=true, cron disabled
```

All data created in preview deployments is tagged with `isTestData: true`, enabling separation without a separate database.

## Detection API

```typescript
import {
  isStaging,
  isStagingMode,
  getEnvironmentName,
} from "@/lib/environment/staging-detector";

if (isStaging()) {
  /* preview-only features */
}
if (isStagingMode) {
  /* build-time constant */
}
const env = getEnvironmentName(); // 'production' | 'staging' | 'development'
```

## Data Isolation

Prisma extension in `src/lib/db.ts` auto-tags all creates in staging mode:

```typescript
// Automatic: args.data = { ...args.data, isTestData: true }
// Applies to: User, Conversation, Message, FlashcardProgress, QuizResult,
// Material, SessionMetrics, UserActivity, TelemetryEvent, StudySession, FunnelEvent
```

## Key Components

| Component              | Purpose                             |
| ---------------------- | ----------------------------------- |
| `StagingBanner`        | Yellow warning banner (dismissible) |
| `StagingDataToggle`    | Admin toggle to show/hide test data |
| `PurgeStagingButton`   | Delete all test data (with confirm) |
| `useStagingDataFilter` | Hook for admin views filter state   |

## Cron Protection

All `/api/cron/*` endpoints skip execution when `VERCEL_ENV !== 'production'`. Protected: data-retention, metrics-push, business-metrics-daily, trial-nurturing.

## Admin API

| Endpoint                        | Method | Description                |
| ------------------------------- | ------ | -------------------------- |
| `/api/admin/purge-staging-data` | GET    | Count staging records      |
| `/api/admin/purge-staging-data` | DELETE | Delete all staging records |

## Key Files

| File                                            | Purpose                           |
| ----------------------------------------------- | --------------------------------- |
| `src/lib/environment/staging-detector.ts`       | Environment detection             |
| `src/lib/db.ts`                                 | Prisma extension for auto-tagging |
| `src/components/ui/staging-banner.tsx`          | UI warning banner                 |
| `src/components/admin/staging-data-toggle.tsx`  | Admin filter toggle               |
| `src/components/admin/purge-staging-button.tsx` | Data cleanup button               |
| `src/hooks/use-staging-data-filter.ts`          | Filter state hook                 |
| `src/app/api/admin/purge-staging-data/route.ts` | Purge API                         |
