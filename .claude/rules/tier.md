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

// Get AI model for user's tier
const model = await tierService.getAIModelForUser(userId, "chat"); // "gpt-4o" or "gpt-4o-mini"

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
const { canUseVoice, canUseTools } = useTierFeatures(userId);

if (!canUseVoice) {
  return <UpgradePrompt feature="Voice Chat" />;
}
```

## Admin Tier Management Routes

| Route                   | Method | Purpose                   |
| ----------------------- | ------ | ------------------------- |
| `/api/admin/tiers`      | GET    | List all tiers            |
| `/api/admin/tiers`      | POST   | Create new tier           |
| `/api/admin/tiers/[id]` | PUT    | Update tier               |
| `/api/admin/tiers/[id]` | DELETE | Delete tier               |
| `/admin/tiers`          | UI     | Tier management dashboard |

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

- `TierDefinition` - Tier configs, features, AI models, limits
- `UserSubscription` - User subscription status, dates, tier reference
- `TierAuditLog` - Admin audit trail of tier changes

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
