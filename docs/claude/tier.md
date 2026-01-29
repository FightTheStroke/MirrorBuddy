# Tier System - Full Reference

## Three Tier Levels

| Tier  | Users             | Chat Limit | Voice     | Maestri | Tools | Price   |
| ----- | ----------------- | ---------- | --------- | ------- | ----- | ------- |
| Trial | Anonymous         | 10/month   | 5 min     | 3       | 10/mo | Free    |
| Base  | Registered (free) | Unlimited  | Unlimited | 20      | Unl.  | Free    |
| Pro   | Subscribers       | Unlimited  | Unlimited | 20      | Unl.  | 9.99/mo |

## Memory Features by Tier

| Feature                | Trial  | Base    | Pro     |
| ---------------------- | ------ | ------- | ------- |
| Basic Memory           | Y      | Y       | Y       |
| Conversation History   | 5 msgs | 20 msgs | 50 msgs |
| Semantic Memory        | N      | N       | Y       |
| Cross-Maestro Learning | N      | N       | Y       |
| Hierarchical Summaries | N      | N       | Y       |

## TierService Usage

```typescript
import { tierService } from "@/lib/tier/tier-service";

const tier = await tierService.getEffectiveTier(userId);
const canUseVoice = await tierService.checkFeatureAccess(userId, "voice");
const limits = await tierService.getLimitsForUser(userId);
const model = await tierService.getModelForUserFeature(userId, "mindmap");
tierService.invalidateCache(); // All tiers
tierService.invalidateTierCache("tier-pro"); // Specific tier
```

## Feature Access (Frontend)

```typescript
const { hasFeature, tier, isSimulated } = useTierFeatures();
if (!hasFeature("voice")) return <UpgradePrompt feature="Voice Chat" />;
```

## Tier Fallback Logic

- null userId -> Trial
- Registered, no subscription -> Base
- Valid subscription -> Subscribed tier
- Expired/cancelled -> Base

## Admin Tier Management Routes

| Route                      | Method          | Purpose         |
| -------------------------- | --------------- | --------------- |
| `/api/admin/tiers`         | GET             | List all tiers  |
| `/api/admin/tiers`         | POST            | Create new tier |
| `/api/admin/tiers/[id]`    | PUT/DELETE      | Update/delete   |
| `/api/admin/simulate-tier` | GET/POST/DELETE | Tier simulation |
| `/admin/tiers`             | UI              | Dashboard       |

## Admin Tier Simulation

Stored in HTTP-only cookie (`mirrorbuddy-simulated-tier`), 24h expiry, admin-only.
`useTierFeatures()` returns `isSimulated: boolean`. Header shows "(SIM)" badge.

## Per-Feature Model Selection (ADR 0073)

| Feature                              | Trial             | Base         | Pro          |
| ------------------------------------ | ----------------- | ------------ | ------------ |
| chat                                 | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| realtime                             | gpt-realtime-mini | gpt-realtime | gpt-realtime |
| pdf/mindmap/summary/chart/flashcards | gpt-4o-mini       | gpt-5-mini   | gpt-5.2-chat |
| quiz/formula/homework/webcam         | gpt-4o-mini       | gpt-5.2-edu  | gpt-5.2-chat |
| demo                                 | gpt-4o-mini       | gpt-4o-mini  | gpt-4o-mini  |

## Feature Keys

`chat`, `voice`, `tools`, `documents`, `maestri`, `coaches`, `buddies`, `mindmap`, `quiz`, `flashcards`, `homework`, `formula`, `chart`, `summary`, `pdf`, `webcam`, `parent_dashboard`, `learning_path`, `analytics`

## TierLimits Interface

```typescript
interface TierLimits {
  chatMessagesPerMonth: number | null;
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

## Memory Service

```typescript
import { memoryService } from "@/lib/memory/memory-service";
const limits = await memoryService.getTierMemoryLimits(userId);
const hasSemanticMemory = await memoryService.checkMemoryFeature(
  userId,
  "semantic",
);
```

## DB Tables

- `TierDefinition` - Tier configs, features, AI models, limits
- `UserSubscription` - User subscription status, dates, tier reference
- `TierAuditLog` - Admin audit trail
- `ModelCatalog` - AI model metadata

## Cache: `tierService.invalidateCache()` after any admin update

## Error Handling: Fail-secure (deny on error), fallback tiers if DB unavailable
