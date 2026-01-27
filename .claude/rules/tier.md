# Tier Subscription Rules - MirrorBuddy

## Three Tier Levels

| Tier  | Users             | Chat Limit | Voice     | Maestri | Tools | Price    |
| ----- | ----------------- | ---------- | --------- | ------- | ----- | -------- |
| Trial | Anonymous         | 10/month   | 5 min     | 3       | 10/mo | Free     |
| Base  | Registered (free) | Unlimited  | Unlimited | 20      | Unl.  | Free     |
| Pro   | Subscribers       | Unlimited  | Unlimited | 20      | Unl.  | €9.99/mo |

## Memory Features by Tier

Each tier supports different levels of conversation memory and learning capabilities:

| Feature                    | Trial  | Base    | Pro     |
| -------------------------- | ------ | ------- | ------- |
| **Basic Memory**           | ✓      | ✓       | ✓       |
| **Conversation History**   | 5 msgs | 20 msgs | 50 msgs |
| **Semantic Memory**        | ✗      | ✗       | ✓       |
| **Cross-Maestro Learning** | ✗      | ✗       | ✓       |
| **Hierarchical Summaries** | ✗      | ✗       | ✓       |

### Memory Feature Definitions

- **Basic Memory**: Current conversation context maintained within a single chat session
- **Conversation History**: Previous messages retained and accessible in future sessions (message limits apply)
- **Semantic Memory** (Pro): Vector embeddings of conversation context for advanced relevance matching
- **Cross-Maestro Learning** (Pro): Memory shared across multiple maestri to create cohesive learning paths
- **Hierarchical Summaries** (Pro): Multi-level conversation summaries for long-term retention and recall

### Memory Service Usage

```typescript
import { memoryService } from "@/lib/memory/memory-service";

// Get memory limits for user's tier
const limits = await memoryService.getTierMemoryLimits(userId);
console.log(limits);
// Output:
// {
//   maxConversationHistory: 50,        // Pro: 50 msgs, Base: 20, Trial: 5
//   semanticMemoryEnabled: true,       // Pro only
//   crossMaestroEnabled: true,         // Pro only
//   hierarchicalSummariesEnabled: true // Pro only
// }

// Check if user has semantic memory access
const hasSemanticMemory = await memoryService.checkMemoryFeature(
  userId,
  "semantic",
);

// Get conversation history with pagination
const history = await memoryService.getConversationHistory(userId, maestroId, {
  limit: 20,
  offset: 0,
});

// Store conversation with automatic decay
await memoryService.storeConversation(userId, maestroId, {
  message: userMessage,
  response: assistantResponse,
  timestamp: Date.now(),
});

// Get hierarchical summary (Pro only)
const summary = await memoryService.getHierarchicalSummary(userId, maestroId);

// Get cross-maestro learning context (Pro only)
const crossContext = await memoryService.getCrossMaestroContext(
  userId,
  currentMaestroId,
);
```

### getTierMemoryLimits() Function

```typescript
interface TierMemoryLimits {
  maxConversationHistory: number; // Max messages retained
  semanticMemoryEnabled: boolean;
  crossMaestroEnabled: boolean;
  hierarchicalSummariesEnabled: boolean;
  memoryDecayDays: number; // Days before low-priority memories fade
  priorityMemoryRetentionDays: number; // Always-retain threshold
}

async function getTierMemoryLimits(
  userId: string | null,
): Promise<TierMemoryLimits> {
  const tier = await tierService.getEffectiveTier(userId);

  const limits: Record<TierName, TierMemoryLimits> = {
    trial: {
      maxConversationHistory: 5,
      semanticMemoryEnabled: false,
      crossMaestroEnabled: false,
      hierarchicalSummariesEnabled: false,
      memoryDecayDays: 7,
      priorityMemoryRetentionDays: 30,
    },
    base: {
      maxConversationHistory: 20,
      semanticMemoryEnabled: false,
      crossMaestroEnabled: false,
      hierarchicalSummariesEnabled: false,
      memoryDecayDays: 30,
      priorityMemoryRetentionDays: 90,
    },
    pro: {
      maxConversationHistory: 50,
      semanticMemoryEnabled: true,
      crossMaestroEnabled: true,
      hierarchicalSummariesEnabled: true,
      memoryDecayDays: 90,
      priorityMemoryRetentionDays: 365,
    },
  };

  return limits[tier.name];
}
```

### Admin Settings for Cross-Maestro Learning

The `crossMaestroEnabled` setting can be configured per-tier in the admin dashboard:

- **Trial**: Always disabled (users limited to 3 maestri anyway)
- **Base**: Can be enabled by admin for testing, disabled by default
- **Pro**: Always enabled as part of premium learning experience

Update via admin API:

```typescript
// Enable cross-maestro learning for Base tier (testing)
await csrfFetch("/api/admin/tiers/base", {
  method: "PUT",
  body: JSON.stringify({
    memorySettings: {
      crossMaestroEnabled: true,
    },
  }),
});

// Invalidate tier cache after changes
await tierService.invalidateTierCache("tier-base");
```

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
