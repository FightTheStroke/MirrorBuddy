# Tier Rules - MirrorBuddy

## Three Tiers

| Tier  | Users       | Chat      | Voice     | Maestri | Tools | Price   |
| ----- | ----------- | --------- | --------- | ------- | ----- | ------- |
| Trial | Anonymous   | 10/mo     | 5 min     | 3       | 10/mo | Free    |
| Base  | Registered  | Unlimited | Unlimited | 20      | Unl.  | Free    |
| Pro   | Subscribers | Unlimited | Unlimited | 20      | Unl.  | 9.99/mo |

## Fallback: null userId = Trial | No subscription = Base | Expired = Base

## TierService

```typescript
import { tierService } from "@/lib/tier/tier-service";
const tier = await tierService.getEffectiveTier(userId);
const canUse = await tierService.checkFeatureAccess(userId, "voice");
const model = await tierService.getModelForUserFeature(userId, "mindmap");
tierService.invalidateCache(); // After admin updates
```

## Feature Keys

`chat`, `voice`, `tools`, `documents`, `maestri`, `coaches`, `buddies`, `mindmap`, `quiz`, `flashcards`, `homework`, `formula`, `chart`, `summary`, `pdf`, `webcam`, `parent_dashboard`, `learning_path`, `analytics`

## Frontend

```typescript
const { hasFeature, tier, isSimulated } = useTierFeatures();
```

## DB Tables: TierDefinition, UserSubscription, TierAuditLog, ModelCatalog

## Full reference: `@docs/claude/tier.md`
