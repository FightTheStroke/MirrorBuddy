---
description: 'Unit and integration testing conventions: TDD, AAA pattern, Vitest'
applyTo: '**/*.test.ts,**/*.test.tsx,**/*.spec.ts'
---

# Testing

## TDD

RED: failing test | GREEN: minimum code | REFACTOR: clean up

## Unit (Vitest)

Colocate (`feature.ts` + `feature.test.ts`) | AAA pattern | one behavior/test | no shared state | 80% business, 100% critical

## Mocking

`vi.mock()` modules | `vi.spyOn()` functions | reset in `beforeEach`/`afterEach` | wrap external deps

## Commands

`./scripts/ci-summary.sh --unit` (compact) | `npm run test:unit -- path/file` (specific)

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
