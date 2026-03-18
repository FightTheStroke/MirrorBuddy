# MirrorBuddy — Cross-Agent Instructions

AI education platform: 26 Maestri, voice, FSRS, mind maps, quizzes, gamification. Students with learning differences.

## Language

Code/comments/docs: English | UI: next-intl (it/en/fr/de/es)

## Rules

1. Minimum complexity 2. Max 250 lines/file 3. TDD (RED→GREEN→REFACTOR) 4. No TODO/FIXME/@ts-ignore/`any` 5. Conventional commits

## Stack

Next.js 16 App Router | PostgreSQL+Prisma+pgvector | Azure OpenAI→Claude→Ollama | Zustand+REST (NO localStorage) | Session auth (ADR 0075) | Trial/Base/Pro tiers

## Critical Paths

Proxy: `src/proxy.ts` ONLY | CSP: proxy.ts + providers.tsx nonces | Safety: `src/lib/safety/` | A11y: 7 DSA profiles, WCAG 2.1 AA

## Validation

`./scripts/ci-summary.sh` (lint+types+build) | `./scripts/health-check.sh` (full triage)

## Workflow (3+ tasks)

`@planner` → `@execute {id}` → `plan-db-safe.sh update-task {id} done` → `@validate` → merge after all validated. Single fixes: direct edit OK.

## NightMaintenance

Runbook: `.github/agents/night-maintenance.agent.md`. Closure: `npm run test:smoke:prod` + `npm run production:status` + health endpoint + sentry-cli. Heartbeat every 5min during CI waits.

## Refs

`.github/copilot-instructions.md` | `.github/instructions/` (domain rules) | `.github/agents/` (personas)
