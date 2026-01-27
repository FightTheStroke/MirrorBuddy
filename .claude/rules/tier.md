# Tier Subscription Rules - MirrorBuddy

## Three Tier Levels

| Tier  | Users             | Chat Limit | Voice     | Maestri | Tools | Price    |
| ----- | ----------------- | ---------- | --------- | ------- | ----- | -------- |
| Trial | Anonymous         | 10/month   | 5 min     | 3       | 10/mo | Free     |
| Base  | Registered (free) | Unlimited  | Unlimited | 20      | Unl.  | Free     |
| Pro   | Subscribers       | Unlimited  | Unlimited | 20      | Unl.  | €9.99/mo |

## TierService Usage Patterns

```typescript
import { tierService } from "@/lib/tier/tier-service";

// Get user's effective tier
const tier = await tierService.getEffectiveTier(userId);

// Check feature access
const canUseVoice = await tierService.checkFeatureAccess(userId, "voice");

// Get consumption limits
const limits = await tierService.getLimitsForUser(userId);

// Get AI model for user's tier (legacy - use getModelForUserFeature)
const model = await tierService.getAIModelForUser(userId, "chat");

// Get AI model for specific feature (ADR 0073 - per-feature selection)
const mindmapModel = await tierService.getModelForUserFeature(
  userId,
  "mindmap",
);
const quizModel = await tierService.getModelForUserFeature(userId, "quiz");

// Invalidate cache after tier updates
tierService.invalidateCache(); // All tiers
tierService.invalidateTierCache("tier-pro"); // Specific tier
```

## Feature Access Checking

```typescript
// Backend (API routes)
import { tierService } from "@/lib/tier/tier-service";

async function protectedFeature(userId: string | null) {
  const canAccess = await tierService.checkFeatureAccess(userId, "mindmap");
  if (!canAccess) {
    return NextResponse.json({ error: "Feature not available in your tier" }, { status: 403 });
  }
}

// Frontend - Use hooks (check useTierFeatures in src/hooks/)
const { hasFeature, tier, isSimulated } = useTierFeatures();

if (!hasFeature("voice")) {
  return <UpgradePrompt feature="Voice Chat" />;
}

// Check if admin is simulating a tier
if (isSimulated) {
  console.log("Currently simulating tier:", tier);
}
```

## Admin Tier Management Routes

| Route                      | Method | Purpose                   |
| -------------------------- | ------ | ------------------------- |
| `/api/admin/tiers`         | GET    | List all tiers            |
| `/api/admin/tiers`         | POST   | Create new tier           |
| `/api/admin/tiers/[id]`    | PUT    | Update tier               |
| `/api/admin/tiers/[id]`    | DELETE | Delete tier               |
| `/api/admin/simulate-tier` | GET    | Check simulation status   |
| `/api/admin/simulate-tier` | POST   | Set simulated tier        |
| `/api/admin/simulate-tier` | DELETE | Clear simulated tier      |
| `/admin/tiers`             | UI     | Tier management dashboard |

## Admin Tier Simulation (Testing)

Admins can simulate different tiers to test feature access and UI:

```typescript
// Set simulated tier (admin only)
await csrfFetch("/api/admin/simulate-tier", {
  method: "POST",
  body: JSON.stringify({ tier: "trial" }), // "trial" | "base" | "pro"
});

// Clear simulation
await csrfFetch("/api/admin/simulate-tier", { method: "DELETE" });

// Check status
const res = await fetch("/api/admin/simulate-tier");
const { isSimulating, simulatedTier } = await res.json();
```

**How it works:**

- Stored in HTTP-only cookie (`mirrorbuddy-simulated-tier`)
- 24-hour expiry
- Only admins can set/clear simulation
- `useTierFeatures()` hook returns `isSimulated: boolean`
- Header shows "(SIM)" badge when simulating

**UI Location:** Admin header → Flask icon dropdown (`TierSimulator` component)

## Tier Flexibility

**All tier limits are stored in the database via TierService, not hardcoded.**

Admins can modify any tier limit at any time through:

- Admin panel: `/admin/tiers`
- Direct database: `TierDefinition` table

Changes take effect immediately after cache invalidation:

```typescript
tierService.invalidateCache();
```

No code deployment required to adjust limits.

## Header Tier Badge

All users see their current tier in the home header:

- **Trial**: Gray badge
- **Base**: Blue badge
- **Pro**: Purple badge with crown icon
- When admin simulates: Shows "(SIM)" indicator

Component: `src/components/tier/TierBadge.tsx`
Location: Right side of header, before calculator widget

## Common Tier Operations

### Tier Fallback Logic

- **Anonymous user** (null userId) → Trial tier
- **Registered user, no subscription** → Base tier (default)
- **Valid subscription** → Subscribed tier
- **Expired/cancelled subscription** → Fallback to Base tier

### Subscription Validation

Subscription is valid if:

- Status is `ACTIVE` or `TRIAL`
- Start date ≤ now
- End date > now (or null for no expiration)

### Feature Keys Available

`chat`, `voice`, `tools`, `documents`, `maestri`, `coaches`, `buddies`, `mindmap`, `quiz`, `flashcards`, `homework`, `formula`, `chart`, `summary`, `pdf`, `webcam`, `parent_dashboard`, `learning_path`, `analytics`

## Tier Limits Configuration

```typescript
interface TierLimits {
  chatMessagesPerMonth: number | null; // null = unlimited
  voiceSecondsPerMonth: number | null;
  toolUsesPerMonth: number | null;
  documentUploadsPerMonth: number | null;
  maestriCount: number | null;
  coachCount: number | null;
  buddyCount: number | null;
  storageQuotaGb: number;
  concurrentSessions: number;
}
```

## Database Tables

- `TierDefinition` - Tier configs, features, AI models (per-feature), limits
- `UserSubscription` - User subscription status, dates, tier reference
- `TierAuditLog` - Admin audit trail of tier changes
- `ModelCatalog` - AI model metadata (costs, capabilities, quality scores)

## Per-Feature Model Selection (ADR 0073)

Each tier can specify different AI models for each feature:

| Feature    | Trial Model       | Base Model   | Pro Model    |
| ---------- | ----------------- | ------------ | ------------ |
| chat       | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| realtime   | gpt-realtime-mini | gpt-realtime | gpt-realtime |
| pdf        | gpt-4o-mini       | gpt-5-mini   | gpt-5.2-chat |
| mindmap    | gpt-4o-mini       | gpt-5-mini   | gpt-5.2-chat |
| quiz       | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| flashcards | gpt-4o-mini       | gpt-5-mini   | gpt-5.2-chat |
| summary    | gpt-4o-mini       | gpt-5-mini   | gpt-5.2-chat |
| formula    | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| chart      | gpt-4o-mini       | gpt-5-mini   | gpt-5.2-chat |
| homework   | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| webcam     | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| demo       | gpt-4o-mini       | gpt-4o-mini  | gpt-4o-mini  |

**Feature types**: `chat`, `realtime`, `pdf`, `mindmap`, `quiz`, `flashcards`, `summary`, `formula`, `chart`, `homework`, `webcam`, `demo`

## Cache Invalidation

After admin updates to tiers, always call:

```typescript
tierService.invalidateCache(); // Full cache clear
// or
tierService.invalidateTierCache(tierId); // Specific tier
```

Prevents stale feature availability checks and AI model selections.

## Error Handling

- TierService catches all errors, logs with context (userId, feature, tier)
- Feature access denied on error (fail-secure)
- Fallback tiers used if database unavailable
- No user-facing error leakage
