# ADR 0168: Deprecate `maestriLimit` — no per-Maestro cap (DEC-06)

**Status**: ACCEPTED
**Date**: 2026-07-06
**Deciders**: Roberdan (product owner), delegated to Claude per full-delegation mandate on the technical-debt registry (session 2026-07-05/06)
**Related**: `docs/plans/PLAN-mirrorbuddy-release.md` (D-35), `.claude/rules/tier.md`

---

## Context

`maestriLimit` (Trial 3 / Base 25 / Pro 26) had been present in the tier
`features` JSON, both seed scripts (`apps/web/src/lib/seeds/tier-seed.ts` and
the standalone `apps/web/prisma/seed-tiers.ts`), and the `TierFeatures`/
`TierLimits` TypeScript types since before the home was redesigned around
intents (Compiti / Studiare / Mettiti alla prova) rather than a Maestro
picker.

Verified by grep across the full `apps/web/src` tree: the only consumer was
`tier-helpers.ts`'s `extractTierLimits()`, which mapped it into a
`maxMaestri` field on `TierLimits` — and `maxMaestri` itself was read
nowhere in application or runtime code, only echoed back in a handful of
unit tests asserting the mapping worked. No UI surface, API route, or
business-logic check ever compared a user's Maestro count against this
number.

## Decision

**Deprecate and remove**, not enforce. The intent-based home auto-selects a
Maestro per subject rather than presenting a Maestro picker the user
chooses from — a per-Maestro cap is not a meaningful lever in that model.
Wiring blind enforcement now would risk breaking Trial's auto-selection
path for no product benefit, since there is no user-facing "browse all
Maestri" surface for a cap to gate.

Removed entirely:

- `TierFeatures.maestriLimit` and `TierLimits.maxMaestri` (types.ts)
- `maestriLimit: N` from both seed scripts and `tier-fallbacks.ts`
- The `maxMaestri` mapping in `tier-helpers.ts`'s `extractTierLimits()`
- Corresponding test fixtures/assertions (renamed one generic
  truthy/falsy-check test fixture from `maestriLimit` to
  `testNumericFeature` to avoid it reading as a still-live field)

## Consequences

- If a future product decision reintroduces a per-Maestro browsing/limit
  concept, it needs a fresh design (this ADR does not pre-approve any
  particular re-implementation) — grep for `maestriLimit`/`maxMaestri`
  returns zero results going forward, so reintroduction is a clean addition,
  not an un-revert.
- No Prisma schema migration needed: the field lived inside the JSON
  `features` column, not a dedicated column — `prisma migrate diff` is
  empty for this change.
- `docs/plans/PLAN-mirrorbuddy-release.md` D-35 marked resolved.
