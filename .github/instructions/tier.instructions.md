---
description: 'Tier system rules for Trial/Base/Pro subscription logic'
applyTo: 'src/lib/tier/**/*.ts,src/lib/tier/**/*.tsx,src/lib/seeds/tier-seed.ts'
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

Reference: ADR 0065

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
