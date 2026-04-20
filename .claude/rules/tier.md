# Tier — MirrorBuddy

## Tiers

| Tier | Users | Chat | Voice | Maestri | Tools | Price |
|---|---|---|---|---|---|---|
| Trial | Anonymous | 10/day | 5min/day | 3 | 10/day | Free |
| Base | Registered | 50/day | 30min/day | 25 | 30/day | Free |
| Pro | Subscribers | Unl. | Unl. | 26 | Unl. | 9.99/mo |

## Fallback

null userId → Trial | no subscription → Base | expired → Base.

## Backend: `import { tierService } from "@/lib/tier/tier-service"`

## Frontend: `const { hasFeature, tier, isSimulated } = useTierFeatures()`

## Ref: `@docs/claude/tier.md`
