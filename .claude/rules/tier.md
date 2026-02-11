# Tier Rules - MirrorBuddy

## Three Tiers

| Tier  | Users       | Chat      | Voice      | Maestri | Tools  | Price   |
| ----- | ----------- | --------- | ---------- | ------- | ------ | ------- |
| Trial | Anonymous   | 10/day    | 5 min/day  | 3       | 10/day | Free    |
| Base  | Registered  | 50/day    | 30 min/day | 25      | 30/day | Free    |
| Pro   | Subscribers | Unlimited | Unlimited  | 26      | Unl.   | 9.99/mo |

## Fallback: null userId = Trial | No subscription = Base | Expired = Base

## TierService: `import { tierService } from "@/lib/tier/tier-service"`

## Frontend: `const { hasFeature, tier, isSimulated } = useTierFeatures()`

## Full reference: `@docs/claude/tier.md`
