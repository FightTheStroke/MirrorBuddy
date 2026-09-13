---
description: 'Tier system rules for Trial/Base/Pro subscription logic'
applyTo: 'apps/web/src/lib/tier/**/*.ts,apps/web/src/lib/tier/**/*.tsx,apps/web/src/lib/seeds/tier-seed.ts,apps/web/prisma/seed-tiers.ts,packages/tier/src/**/*'
---

# Tier System

## Tiers

Trial (anonymous): 10 chat/day, 5 min voice, 3 maestri, 10 tools
Base (registered): 50 chat/day, 30 min voice, 25 maestri, 30 tools
Pro (subscribers): unlimited, 26 maestri, 9.99/mo

Fallback: `null` userId = Trial | no subscription = Base | expired = Base

## Usage

Server: `tierService.getLimits(userId)` | Client: `useTierFeatures()`

## Rules

NEVER hardcode limits | server-validate (client = UX only) | test all 3 tiers

Reference: ADR 0071

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
