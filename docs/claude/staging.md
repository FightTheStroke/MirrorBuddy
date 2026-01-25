# Staging System

Logical staging environment on Vercel preview deployments with zero additional infrastructure cost.

## Overview

MirrorBuddy uses **logical isolation** within the production database for staging:

```
Production (main)     → VERCEL_ENV=production → Normal operations
Preview (PR/branches) → VERCEL_ENV=preview   → is_test_data=true, cron disabled
```

All data created in preview deployments is automatically tagged with `isTestData: true`, allowing:

- Separation of test data from real user data
- Safe testing on production infrastructure
- Zero cost (no separate database needed)

## Environment Detection

### Vercel Environment Variables

Vercel automatically sets these variables:

| Variable                     | Values                                 | Description         |
| ---------------------------- | -------------------------------------- | ------------------- |
| `VERCEL_ENV`                 | `production`, `preview`, `development` | Current environment |
| `VERCEL_GIT_COMMIT_REF`      | Branch name                            | Git reference       |
| `VERCEL_GIT_PULL_REQUEST_ID` | PR number                              | Pull request ID     |

### Detection API

```typescript
import {
  isStaging,
  isStagingMode,
  getEnvironmentName,
} from "@/lib/environment/staging-detector";

// Check if staging (preview) environment
if (isStaging()) {
  // Enable staging-only features
}

// Synchronous constant for build-time checks
if (isStagingMode) {
  // ...
}

// Get environment name: 'production' | 'staging' | 'development'
const env = getEnvironmentName();
```

## Data Isolation

### Automatic Test Data Tagging

All Prisma create operations in staging mode automatically set `isTestData: true`:

```typescript
// In src/lib/db.ts - Prisma extension
const stagingExtension = basePrisma.$extends({
  name: "staging-test-data-tagger",
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (isStagingMode && MODELS_WITH_TEST_DATA_FLAG.includes(model)) {
          args.data = { ...args.data, isTestData: true };
        }
        return query(args);
      },
      async createMany({ model, args, query }) {
        // Similar logic for batch creates
      },
    },
  },
});
```

### Models with isTestData Flag

- User
- Conversation
- Message
- FlashcardProgress
- QuizResult
- Material
- SessionMetrics
- UserActivity
- TelemetryEvent
- StudySession
- FunnelEvent

## Cron Job Protection

All cron endpoints skip execution in non-production environments:

```typescript
// Pattern used in all /api/cron/* routes
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  return NextResponse.json(
    {
      skipped: true,
      reason: "Not production environment",
      environment: process.env.VERCEL_ENV,
    },
    { status: 200 },
  );
}
```

Protected cron jobs:

- `/api/cron/data-retention`
- `/api/cron/metrics-push`
- `/api/cron/business-metrics-daily`
- `/api/cron/trial-nurturing`

## UI Components

### StagingBanner

Yellow warning banner displayed at viewport top in preview environments:

```tsx
import { StagingBanner } from "@/components/ui/staging-banner";

// Add to layout
<StagingBanner />;
```

Features:

- Only shows when `isStaging() === true`
- Dismissible (persists in sessionStorage)
- ARIA-compliant

### StagingDataToggle

Admin toggle to show/hide test data in data views:

```tsx
import { StagingDataToggle } from "@/components/admin/staging-data-toggle";

<StagingDataToggle
  showStagingData={showStagingData}
  onToggle={(show) => setShowStagingData(show)}
  hiddenCount={hiddenRecordCount}
/>;
```

### useStagingDataFilter Hook

Hook for admin views to filter staging data:

```typescript
import { useStagingDataFilter } from "@/hooks/use-staging-data-filter";

const { showStagingData, setShowStagingData, filterClause } =
  useStagingDataFilter();

// Use filterClause in Prisma queries
const users = await prisma.user.findMany({
  where: {
    ...filterClause, // { isTestData: false } when hiding staging data
  },
});
```

### PurgeStagingButton

Admin button to delete all staging (test) data:

```tsx
import { PurgeStagingButton } from "@/components/admin/purge-staging-button";

// Shows confirmation dialog with record counts before deletion
<PurgeStagingButton />;
```

API endpoint: `DELETE /api/admin/purge-staging-data`

## Admin API Endpoints

| Endpoint                        | Method | Description                |
| ------------------------------- | ------ | -------------------------- |
| `/api/admin/purge-staging-data` | GET    | Count staging records      |
| `/api/admin/purge-staging-data` | DELETE | Delete all staging records |

## Workflow

### Development

1. Create feature branch
2. Push to trigger Vercel preview deployment
3. Test on preview URL (data tagged as test)
4. Review PR
5. Merge to main (production deployment)

### Cleanup

1. Navigate to admin panel
2. Use "Show staging data" toggle to view test records
3. Click "Purge Staging Data" to remove all test data
4. Confirm deletion in dialog

## Testing

```bash
# Unit tests
npm run test:unit -- staging

# All staging-related tests
npm run test:unit -- --grep "staging"
```

## Files

| File                                            | Purpose                           |
| ----------------------------------------------- | --------------------------------- |
| `src/lib/environment/staging-detector.ts`       | Environment detection             |
| `src/lib/db.ts`                                 | Prisma extension for auto-tagging |
| `src/components/ui/staging-banner.tsx`          | UI warning banner                 |
| `src/components/admin/staging-data-toggle.tsx`  | Admin filter toggle               |
| `src/components/admin/purge-staging-button.tsx` | Data cleanup button               |
| `src/hooks/use-staging-data-filter.ts`          | Filter state hook                 |
| `src/app/api/admin/purge-staging-data/route.ts` | Purge API                         |

## Plan Reference

- **Plan 75**: Staging System Vercel
- **ADR**: docs/adr/0073-staging-system-vercel.md (pending)
