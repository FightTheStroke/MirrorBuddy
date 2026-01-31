# Tier Rules - MirrorBuddy

## Three Tiers

| Tier  | Users       | Chat      | Voice     | Maestri | Tools | Price   |
| ----- | ----------- | --------- | --------- | ------- | ----- | ------- |
| Trial | Anonymous   | 10/mo     | 5 min     | 3       | 10/mo | Free    |
| Base  | Registered  | Unlimited | Unlimited | 25      | Unl.  | Free    |
| Pro   | Subscribers | Unlimited | Unlimited | 26      | Unl.  | 9.99/mo |

## Fallback: null userId = Trial | No subscription = Base | Expired = Base

## TierService: `import { tierService } from "@/lib/tier/tier-service"`

## Frontend: `const { hasFeature, tier, isSimulated } = useTierFeatures()`

## Full reference: `@docs/claude/tier.md`
