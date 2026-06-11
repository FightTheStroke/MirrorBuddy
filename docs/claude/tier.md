# Tier Subscription System

> Three-tier model (Trial/Base/Pro) with per-feature AI model selection and admin overrides

## Quick Reference

| Key     | Value                                        |
| ------- | -------------------------------------------- |
| Path    | `src/lib/tier/`                              |
| Service | `tier-service.ts` (singleton: `tierService`) |
| Hook    | `src/hooks/useTierFeatures.ts`               |
| Types   | `src/lib/tier/types.ts`                      |
| ADR     | 0065, 0071, 0073                             |

## Tier Matrix (tier = intents)

Tiers gate **intents/features**, not a count of Maestri. The home is
intention-based (Compiti / Studiare / Mettiti alla prova) and the Maestro is
auto-selected per subject. The matrix below reflects what each tier _enables_.

| Limit / feature   | Trial                               | Base                            | Pro       |
| ----------------- | ----------------------------------- | ------------------------------- | --------- |
| Chat messages/day | 10                                  | Unlimited                       | Unlimited |
| Voice minutes/day | 5                                   | Unlimited                       | Unlimited |
| Tools/day         | 10                                  | Unlimited                       | Unlimited |
| Intents enabled   | Compiti only (quizzes/mindMaps OFF) | + Studiare + Mettiti alla prova | All       |
| Price             | Free                                | Free                            | 9.99/mo   |

### `maestriLimit` (3 / 25 / 26) — set but NOT enforced (DEC-06 open)

`maestriLimit` still exists in `features` JSON, seeds (`tier-seed.ts`) and the
`TierFeatures`/`TierLimits` types, but is **never enforced**: the only consumer
is `tier-helpers.ts` (`extractTierLimits` → `maxMaestri`), and `maxMaestri` is
read nowhere in runtime code (grep-verified). The intent model made a
per-Maestro cap semantically obsolete. Formal deprecation vs. real enforcement
is **DEC-06** (open) — until decided, the field and its seed values stay as-is;
do not add blind enforcement.

## TierService API

```typescript
import { tierService } from '@/lib/tier/tier-service';

// Core methods
const tier = await tierService.getEffectiveTier(userId); // null = Trial
const can = await tierService.checkFeatureAccess(userId, 'voice');
const limits = await tierService.getLimitsForUser(userId);
const model = await tierService.getModelForUserFeature(userId, 'mindmap');
const config = await tierService.getFeatureAIConfigForUser(userId, 'chat');
const memory = await tierService.getTierMemoryConfig(userId);
tierService.invalidateCache(); // After admin updates
```

## Feature Types (FeatureType)

`chat` | `realtime` | `pdf` | `mindmap` | `quiz` | `flashcards` | `summary` | `formula` | `chart` | `homework` | `webcam` | `demo`

## TierFeatures Interface Keys

`chat`, `voice`, `flashcards`, `quizzes`, `mindMaps`, `tools`, `maestriLimit`, `coachesAvailable`, `buddiesAvailable`, `parentDashboard`, `prioritySupport`, `advancedAnalytics`, `unlimitedStorage`

## DB Schema

| Table             | Purpose                                      |
| ----------------- | -------------------------------------------- |
| TierDefinition    | Tier config: limits, models, features, price |
| UserSubscription  | User-tier binding with override fields       |
| TierAuditLog      | Admin action history                         |
| ModelCatalog      | AI model registry with cost/quality scores   |
| UserFeatureConfig | Per-user per-feature AI config overrides     |

## Override Priority (ADR 0073)

1. UserFeatureConfig (per-user per-feature, set by admin)
2. Tier featureConfigs JSON (per-tier per-feature)
3. DEFAULT_FEATURE_CONFIGS (hardcoded defaults in types.ts)

## Frontend Hook

```typescript
const { hasFeature, tier, features, isLoading, isSimulated } = useTierFeatures();
// Fetches from /api/user/tier-features, cached 5 minutes
if (hasFeature('voice')) {
  /* show voice UI */
}
```

## Fallback Rules

- `null` userId -> Trial (anonymous)
- No subscription -> Base (registered default)
- Expired/cancelled -> Base
- DB error -> Trial (anonymous) or Base (registered)

## See Also

- `src/lib/tier/tier-fallbacks.ts` - Inline fallback tiers
- `src/lib/tier/tier-helpers.ts` - Validation and model selection
- `src/lib/conversation/tier-memory-config.ts` - Memory limits per tier
- ADR 0065 (tier system), ADR 0071 (subscriptions), ADR 0073 (per-feature models)
