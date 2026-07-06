# Tier — MirrorBuddy

## Tier = intents (current model)

Tiers gate **intents/features**, not a Maestro count. The home is intention-based
(Compiti / Studiare / Mettiti alla prova); the Maestro is auto-selected per
subject. What a tier unlocks is the set of intents, enforced via per-feature
flags in `tier-fallbacks.ts` / seeds.

| Tier  | Users       | Chat   | Voice     | Intents enabled                                               | Tools                                  | Price   |
| ----- | ----------- | ------ | --------- | ------------------------------------------------------------- | -------------------------------------- | ------- |
| Trial | Anonymous   | 10/day | 5min/day  | Compiti (chat+voice); quizzes/mindMaps OFF                    | `pdf`, `webcam`                        | Free    |
| Base  | Registered  | 50/day | 30min/day | Compiti + Studiare + Mettiti alla prova (quizzes+mindMaps ON) | `pdf`, `webcam`, `homework`, `formula` | Free    |
| Pro   | Subscribers | Unl.   | Unl.      | All intents                                                   | Unl.                                   | 9.99/mo |

Source of truth: `apps/web/src/lib/tier/tier-fallbacks.ts` (`features.{chat,voice,flashcards,quizzes,mindMaps,tools}`) + seeds in `apps/web/src/lib/seeds/tier-seed.ts`.

### `maestriLimit` — deprecated and removed (DEC-06 closed, see `docs/adr/0168-maestrilimit-deprecation-dec06.md`)

Removed from `features`/`TierLimits` JSON, seeds, and the `TierFeatures`/
`TierLimits` types (2026-07-06). It was never enforced — the only consumer,
`extractTierLimits` → `maxMaestri`, was never read anywhere in app/runtime
code — and the intent-based model made a per-Maestro cap semantically
obsolete (the Maestro is auto-selected per subject, not chosen from a list).
Do not reintroduce a Maestro count cap without a fresh product decision;
availability is now governed entirely by the per-intent feature flags above.

## Fallback

null userId → Trial | no subscription → Base | expired → Base.

## Backend: `import { tierService } from "@/lib/tier/tier-service"`

## Frontend: `const { hasFeature, tier, isSimulated } = useTierFeatures()`

## Ref: `@docs/claude/tier.md`
