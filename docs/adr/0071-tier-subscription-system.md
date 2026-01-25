# ADR 0071: Tier Subscription System

## Status

Accepted (Extended by ADR 0073)

## Date

2026-01-24

## Note

Per-feature model selection (pdfModel, mindmapModel, quizModel, etc.) is documented in **ADR 0073: Per-Feature Model Selection System**.

## Context

MirrorBuddy requires a monetization strategy to sustain development while maintaining free trial access for market validation. Users must be segmented by subscription tier to:

1. Control resource consumption and infrastructure costs
2. Differentiate feature access (maestri, tools, AI models)
3. Enable sustainable business model (Trial/Base/Pro tiers)
4. Maintain audit trail for admin oversight and compliance
5. Support per-user overrides for special cases and admin interventions

Current trial mode (ADR 0056) allows anonymous access with global budget cap. The subscription system extends this to authenticated users with tier-based access control.

## Decision

Implement a tiered subscription system with three models and comprehensive admin override capabilities:

### 1. Data Model

#### TierDefinition

Central configuration for each subscription tier:

```prisma
model TierDefinition {
  id                  String   @id @default(cuid())
  code                String   @unique              // "trial", "base", "pro"
  name                String                        // Display name
  description         String?

  // Resource limits (per day)
  chatLimitDaily      Int      @default(10)         // Text chat messages
  voiceMinutesDaily   Int      @default(5)          // Voice minutes
  toolsLimitDaily     Int      @default(10)         // Tool invocations
  docsLimitTotal      Int      @default(1)          // Document uploads

  // AI Model assignments
  chatModel           String   @default("gpt-4o-mini")          // Chat model
  realtimeModel       String   @default("gpt-realtime-mini")    // Voice model

  // Feature access (JSON flags)
  features            Json     @default("{}")       // Feature toggles
  availableMaestri    Json     @default("[]")       // Accessible maestri IDs
  availableCoaches    Json     @default("[]")       // Accessible coaches
  availableBuddies    Json     @default("[]")       // Accessible buddies
  availableTools      Json     @default("[]")       // Available tools

  // Billing
  stripePriceId       String?                       // Stripe integration
  monthlyPriceEur     Decimal?                      // EUR price

  // Admin controls
  sortOrder           Int      @default(0)          // UI display order
  isActive            Boolean  @default(true)       // Soft delete

  subscriptions       UserSubscription[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

#### UserSubscription

User-tier mapping with override capability:

```prisma
model UserSubscription {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tierId               String
  tier                 TierDefinition @relation(fields: [tierId], references: [id])

  // Admin overrides (for special cases)
  overrideLimits       Json?                        // Custom limits per resource
  overrideFeatures     Json?                        // Temporary feature enablement

  // Stripe integration
  stripeSubscriptionId String?
  stripeCustomerId     String?

  // Status tracking
  status               SubscriptionStatus @default(ACTIVE)
  startedAt            DateTime @default(now())
  expiresAt            DateTime?                    // null = unlimited

  @@index([tierId])
  @@index([status])
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum SubscriptionStatus {
  ACTIVE       // Valid subscription
  TRIAL        // Trial period
  EXPIRED      // End date passed
  CANCELLED    // User cancelled
  PAUSED       // Temporarily paused
}
```

#### TierAuditLog

Complete audit trail for compliance:

```prisma
model TierAuditLog {
  id        String          @id @default(cuid())
  tierId    String?                              // Tier being modified (nullable)
  userId    String?                              // User affected (nullable)
  adminId   String                               // Admin performing action
  action    TierAuditAction                      // Action type
  changes   Json                                 // Before/after snapshots
  notes     String?                              // Admin notes
  createdAt DateTime        @default(now())

  @@index([tierId])
  @@index([userId])
  @@index([adminId])
  @@index([createdAt])
}

enum TierAuditAction {
  TIER_CREATE          // Admin created tier
  TIER_UPDATE          // Admin modified tier
  TIER_DELETE          // Admin deleted tier
  SUBSCRIPTION_CREATE  // User subscribed or admin assigned
  SUBSCRIPTION_UPDATE  // Tier changed or limits overridden
  SUBSCRIPTION_DELETE  // Subscription cancelled
  TIER_CHANGE          // User switched tiers
}
```

### 2. Business Rules

#### Tier Assignment

1. **Anonymous users** → Trial tier (from ADR 0056)
2. **Registered user without subscription** → Base tier (default)
3. **Registered user with valid subscription** → Subscribed tier
4. **Expired/cancelled subscription** → Fallback to Base tier

#### Subscription Validity

A subscription is valid if:

- `status` is `ACTIVE` or `TRIAL`
- `startedAt` <= current time
- `expiresAt` is null OR `expiresAt` > current time

#### Feature Access

Features are stored as JSON flags in `TierDefinition.features`:

```json
{
  "chat": true,
  "voice": true,
  "quizzes": true,
  "mindmap": true,
  "summary": true,
  "flashcards": true,
  "homework": true,
  "formula": true,
  "chart": true,
  "pdf": true,
  "webcam": true
}
```

Each maestro/coach/buddy is gated by `availableMaestri`, `availableCoaches`, `availableBuddies` arrays.

### 3. TierService (Singleton)

Core business logic layer (`src/lib/tier/tier-service.ts`):

```typescript
class TierService {
  // Get effective tier for user (null → Trial, no subscription → Base, valid → subscribed)
  async getEffectiveTier(userId: string | null): Promise<TierDefinition>;

  // Check if user can access feature
  async checkFeatureAccess(
    userId: string | null,
    featureKey: string,
  ): Promise<boolean>;

  // Get consumption limits for user
  async getLimitsForUser(userId: string | null): Promise<TierLimits>;

  // Get appropriate AI model based on tier
  async getAIModelForUser(
    userId: string | null,
    type: "chat" | "vision" | "tts",
  ): Promise<string>;

  // Cache invalidation (called after admin tier updates)
  invalidateCache(): void;
  invalidateTierCache(tierId: string): void;
}

export const tierService = new TierService();
```

**Error Handling**: On any error, TierService falls back safely:

- Anonymous user error → Trial tier
- Registered user error → Base tier

**Caching**: Feature configs cached in memory (rarely change). Invalidated on admin updates via `/api/admin/tiers` endpoint.

### 4. Admin Overrides

Per-user overrides stored in `UserSubscription.overrideLimits` and `overrideFeatures`:

**Use cases**:

- Emergency access: Pro user exhausted quota, grant temporary override
- Testing: Temporarily enable feature for staging
- Support: Restore access for customer issue
- Compliance: Adjust limits for regulatory exception

**Flow**:

1. Admin accesses `/admin/tiers` dashboard
2. Views user subscription
3. Sets temporary overrides via modal
4. System logs action to `TierAuditLog` with admin ID
5. TierService checks overrides before applying tier limits
6. Overrides are timestamped for auditing

### 5. API Endpoints

| Endpoint                        | Method | Auth  | Purpose                        |
| ------------------------------- | ------ | ----- | ------------------------------ |
| `/api/admin/tiers`              | GET    | Admin | List all tiers                 |
| `/api/admin/tiers`              | POST   | Admin | Create new tier                |
| `/api/admin/tiers/[id]`         | PUT    | Admin | Update tier                    |
| `/api/admin/tiers/[id]`         | DELETE | Admin | Delete tier (soft)             |
| `/api/user/subscription`        | GET    | Auth  | Get current subscription       |
| `/api/admin/subscriptions`      | GET    | Admin | List user subscriptions        |
| `/api/admin/subscriptions/[id]` | PUT    | Admin | Update subscription (override) |

**Tier Creation** (POST `/api/admin/tiers`):

```json
{
  "code": "pro",
  "name": "Professional",
  "description": "For educators",
  "chatLimitDaily": 100,
  "voiceMinutesDaily": 60,
  "toolsLimitDaily": 100,
  "docsLimitTotal": 50,
  "chatModel": "gpt-4o",
  "realtimeModel": "gpt-realtime",
  "features": { "chat": true, "voice": true, "quizzes": true },
  "availableMaestri": ["leonardo", "galileo", "curie"],
  "availableCoaches": ["melissa", "roberto"],
  "monthlyPriceEur": 29.99,
  "stripePriceId": "price_1234567890"
}
```

All tier mutations trigger `TierAuditLog.create()` with admin ID and before/after snapshots.

### 6. Admin Dashboard (`/admin/tiers`)

UI for tier management:

- **Tier List**: Display all tiers with edit/delete actions
- **Tier Editor**: Form to create/update tier definitions
- **Subscription Search**: Find user by email or ID
- **Subscription Override**: Temporary limits/features with expiration
- **Audit Trail**: Filter by action, admin, tier, user
- **Maestri/Coach/Buddy Selector**: Checkbox UI for feature assignment

**Conversion Funnel** section integrated (ADR 0068).

### 7. Frontend Integration

#### useTierFeatures Hook

Component-level feature checking:

```typescript
const { hasFeature, limits, tier } = useTierFeatures();

if (!hasFeature('voice')) {
  return <UpgradePrompt feature="voice" />;
}
```

#### LockedFeatureOverlay

UI wrapper for tier-gated features (W4):

```typescript
<LockedFeatureOverlay feature="pro_quizzes" tier="pro">
  <QuizBuilder />
</LockedFeatureOverlay>
```

If user doesn't have access:

- Shows blur overlay
- Displays "Upgrade to Pro" prompt
- Links to `/pricing` or payment flow

### 8. Audit & Compliance

**Audit Log Coverage**:

- Tier created/modified/deleted by admin
- User subscription created/changed/deleted
- Override limits applied/removed
- Each entry includes: admin ID, timestamp, before/after JSON, optional notes

**Retention**: Audit logs retained indefinitely for compliance.

**Export**: Admin can export audit trail as CSV for regulatory audits.

## Consequences

### Positive

1. **Monetization**: Clear path to revenue with Trial → Base → Pro upsell
2. **Cost Control**: Resource limits prevent budget overruns
3. **Flexibility**: Admin overrides handle exceptions without schema changes
4. **Auditability**: Complete trail for compliance and dispute resolution
5. **Resilience**: Graceful fallbacks ensure service continuity on errors
6. **Performance**: Feature caching reduces database queries
7. **Scalability**: Simple JSON storage for features/overrides vs. complex enum tables

### Negative

1. **Complexity**: Three tables + service layer + validation logic
2. **Cache Coherency**: Manual invalidation required after tier updates (human error risk)
3. **Override Sprawl**: Difficult to track cumulative impact of multiple overrides
4. **UI Maintenance**: Admin dashboard complexity grows with override options
5. **Data Migration**: Existing users need default subscription assignment

### Mitigations

1. **Cache invalidation**: Automated on all tier mutations via API
2. **Override tracking**: Audit log captures all changes with admin context
3. **Dashboard UX**: Breadcrumb design for manageable complexity
4. **Migration script**: Assign Base tier to all existing users at deployment
5. **Monitoring**: Alert if tier cache invalidation frequency exceeds threshold

## Implementation Notes

### Tier Codes

Pre-defined tier codes (never change):

- `TRIAL`: Anonymous users (5 chats, 5 min voice, 10 tools, 1 doc, 3 maestri)
- `BASE`: Default for registered users (10 chats, 5 min voice, 10 tools, 1 doc, all maestri)
- `PRO`: Premium subscription (100 chats, 60 min voice, 100 tools, 50 docs, all maestri + priority)

### Fallback Tiers

If tier not in database (corruption or misconfiguration), `TierService.getTierByCode()` creates inline fallback:

```typescript
function createFallbackTier(code: TierCode): TierDefinition {
  // Hardcoded defaults to guarantee availability
  // Prevents cascading failures
}
```

### Timestamp Handling

- `UserSubscription.startedAt`: When subscription became active (usually now())
- `UserSubscription.expiresAt`: When subscription ends (null = no expiry)
- `TierAuditLog.createdAt`: When action occurred (indexed for queries)

Subscriptions are checked against wall-clock time; no cron job needed.

### Maestri/Coach/Buddy Selection

Arrays in `TierDefinition` contain character IDs, not names:

```json
{
  "availableMaestri": ["galileo", "euclide", "darwin"],
  "availableCoaches": ["melissa", "roberto"],
  "availableBuddies": ["mario", "sofia"]
}
```

Character names resolved at runtime from `src/data/maestri/` and `src/data/support-teachers/`.

## Related

- ADR 0056: Trial Mode Architecture - Anonymous user segmentation and budget cap
- ADR 0057: Invite System - Beta access and data migration
- ADR 0068: Conversion Funnel Dashboard - User journey tracking integrated into admin UI
- ADR 0062: AI Compliance Framework - Safety guardrails apply to all tiers
- Plan 073: W6-Documentation - ADR creation and system documentation

## Files

### Schema

- `prisma/schema/tier.prisma` - Core models and enums

### Service Layer

- `src/lib/tier/tier-service.ts` - Main business logic (getEffectiveTier, checkFeatureAccess, etc.)
- `src/lib/tier/tier-helpers.ts` - Utility functions (isSubscriptionValid, extractTierLimits, getModelFromTier)
- `src/lib/tier/tier-fallbacks.ts` - Fallback tier creation for errors
- `src/lib/tier/tier-transformer.ts` - JSON transformation and serialization
- `src/lib/tier/types.ts` - TypeScript interfaces (TierDefinition, UserSubscription, TierLimits)
- `src/lib/tier/video-vision-guard.ts` - Video/vision model access control

### API Routes

- `src/app/api/admin/tiers/route.ts` - GET (list), POST (create)
- `src/app/api/admin/tiers/[id]/route.ts` - PUT (update), DELETE (soft delete)
- `src/app/api/admin/subscriptions/route.ts` - GET subscriptions list
- `src/app/api/admin/subscriptions/[id]/route.ts` - PUT (apply overrides)

### Frontend Components

- `src/app/admin/tiers/page.tsx` - Admin tier management page
- `src/app/admin/tiers/tiers-table.tsx` - Tier list table
- `src/app/admin/tiers/conversion-funnel/page.tsx` - Conversion funnel (integrated from ADR 0068)
- `src/components/tier/use-tier-features.tsx` - useTierFeatures hook
- `src/components/tier/locked-feature-overlay.tsx` - LockedFeatureOverlay component

### Tests

- `src/lib/tier/__tests__/tier-service.test.ts` - Unit tests
- `src/app/api/admin/tiers/__tests__/route.test.ts` - API integration tests
- `e2e/admin/tier-management.spec.ts` - Admin UI E2E tests

### Database

- `prisma/seed/tiers.ts` - Seed script to create default tiers (Trial, Base, Pro)

### Documentation

- `docs/adr/0071-tier-subscription-system.md` - This document
- `docs/tier-subscription-system.md` - User-facing documentation
- `docs/operations/tier-admin-runbook.md` - Operational procedures
