---
description: 'Tier system rules for Trial/Base/Pro subscription logic'
applyTo: 'src/lib/tier/**/*.ts,src/lib/tier/**/*.tsx,src/lib/seeds/tier-seed.ts'
---

# Tier System Rules

## Three Tiers

| Tier  | Users       | Chat      | Voice     | Maestri | Tools | Price   |
| ----- | ----------- | --------- | --------- | ------- | ----- | ------- |
| Trial | Anonymous   | 10/mo     | 5 min     | 3       | 10/mo | Free    |
| Base  | Registered  | Unlimited | Unlimited | 25      | Unl.  | Free    |
| Pro   | Subscribers | Unlimited | Unlimited | 26      | Unl.  | 9.99/mo |

## Fallback Logic

- `null` userId = Trial
- No subscription = Base
- Expired subscription = Base

## Service Usage

```typescript
// Server-side
import { tierService } from '@/lib/tier/tier-service';
const limits = await tierService.getLimits(userId);

// Client-side
const { hasFeature, tier, isSimulated } = useTierFeatures();
```

## Rules

- NEVER hardcode tier limits — always use `tierService` or `useTierFeatures()`
- Tier checks must be server-validated (client checks are UX only)
- Test all 3 tiers in unit tests for tier-dependent features
- Reference: ADR 0065
