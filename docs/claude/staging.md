# Staging System

> Push to `main` deploys to staging (Vercel preview). Promote to production manually when ready.

## Quick Reference

| Key              | Value                                            |
| ---------------- | ------------------------------------------------ |
| Detection        | `src/lib/environment/staging-detector.ts`        |
| DB layer         | `src/lib/db.ts` (Prisma extension, auto-tagging) |
| Banner           | `src/components/ui/staging-banner.tsx`           |
| Admin            | `src/components/admin/staging-data-toggle.tsx`   |
| Purge API        | `DELETE /api/admin/purge-staging-data`           |
| CI deploy job    | `.github/workflows/ci.yml` → `deploy-to-staging` |
| Promote workflow | `.github/workflows/promote-to-production.yml`    |

## Deployment Flow

```
Push to main → CI (18 gate checks) → Deploy to Staging (Vercel Preview)
                                           ↓
                                    🎫 Auto-creates GitHub issue reminder
                                           ↓
                                    Test on staging URL (full app, same DB)
                                           ↓
                              Manual: "Promote to Production" workflow
                                           ↓
                              vercel promote → Production (mirrorbuddy.vercel.app)
                                           ↓
                                    🎫 Issue auto-closed
```

### How to Promote

1. Go to **Actions** → **Promote to Production** → **Run workflow**
2. Optionally paste a specific staging URL (defaults to latest)
3. Workflow runs `vercel promote`, health check, and updates GitHub deployment status
4. The `staging-pending-promotion` reminder issue closes automatically

### Rollback

To rollback production, promote any previous staging deployment URL.

### Reminder Issues

- Each staging deploy creates a GitHub issue with label `staging-pending-promotion`
- Contains staging URL and direct link to the promote workflow
- New staging deploys close previous reminder (superseded)
- Promote workflow closes issue with "completed" reason

## Architecture

```
Push to main      -> VERCEL_ENV=preview   -> Staging (auto URL)
Promote workflow   -> VERCEL_ENV=production -> Production (mirrorbuddy.vercel.app)
PR/branches        -> VERCEL_ENV=preview   -> Preview (auto URL)
```

## Vercel Configuration

### Environment Variables

All env vars must be configured for **both** Production and Preview environments in Vercel Dashboard.
When adding a new env var, always select both environments.

To sync all production env vars to preview (one-time setup or after adding many vars):

```bash
vercel env pull .env.prod.tmp --environment=production
# For each production-only var, copy to preview:
vercel env add VAR_NAME preview  # pipe value via stdin
rm .env.prod.tmp  # clean up sensitive file
```

### Deployment Protection

Vercel Authentication is **disabled** for Preview deployments so staging URLs are accessible for testing.
The staging URLs are random and not indexed — security by obscurity is acceptable for this use case.

### Build Configuration

The CI staging deploy uses:

- `vercel pull --environment=production` → gets all env vars including DATABASE_URL
- Copies `.env.production.local` → `.env.preview.local` so preview build has production secrets
- `vercel build` (preview target) → builds for preview environment
- `vercel deploy --prebuilt` (no `--prod`) → deploys as preview (staging URL)

All data created in preview deployments is tagged with `isTestData: true`, enabling separation without a separate database.

## Detection API

```typescript
import { isStaging, isStagingMode, getEnvironmentName } from '@/lib/environment/staging-detector';

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
