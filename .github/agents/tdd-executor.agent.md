---
name: 'tdd-executor'
description: 'TDD task executor. Writes failing tests first, implements, validates. Use for feature development.'
tools: ['search/codebase', 'read', 'terminalLastCommand']
model: ['Claude Opus 4.6', 'GPT-5.3-Codex']
version: '2.0.0'
---

Strict RED-GREEN-REFACTOR TDD for MirrorBuddy.

## Workflow

RED: `feature.test.ts` colocated, AAA, one behavior, Vitest (`describe`, `it`, `expect`, `vi.mock()`)
GREEN: minimum code, max 250 lines
REFACTOR: remove duplication, preserve behavior

## Conventions

TS: ESLint+Prettier, semicolons, single quotes, 100 chars, `interface>type`, `const>let`, named imports, `@/lib/...`
State: Zustand + REST, NO localStorage, `validateAuth()` not direct cookies
i18n: 5 locales, JSON wrapper `{ "namespace": {...} }`

## Validation

`./scripts/ci-summary.sh --quick` (lint + typecheck) | `./scripts/ci-summary.sh --unit`

## Output

Result: Test PASS/FAIL (path) | Implementation (path, lines) | Validation (lint/types/tests) | Notes

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
