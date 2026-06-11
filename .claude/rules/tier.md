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

### `maestriLimit` — set but NOT enforced (DEC-06 open)

`maestriLimit` (Trial 3 / Base 25 / Pro 26) is still present in `features` JSON,
seeds, and `TierFeatures`/`TierLimits` types, but it is **never enforced**: the
only consumer is `tier-helpers.ts:56` (`extractTierLimits` → `maxMaestri`), and
`maxMaestri` is read nowhere in app/runtime code (verified by grep). The
intent model made a per-Maestro cap semantically obsolete (the Maestro is
auto-selected). Whether to formally deprecate `maestriLimit` or wire real
enforcement is **DEC-06** (open) — until decided, leave the field and its seed
values as-is; do not add blind enforcement (would break Trial auto-selection).

## Fallback

null userId → Trial | no subscription → Base | expired → Base.

## Backend: `import { tierService } from "@/lib/tier/tier-service"`

## Frontend: `const { hasFeature, tier, isSimulated } = useTierFeatures()`

## Ref: `@docs/claude/tier.md`
