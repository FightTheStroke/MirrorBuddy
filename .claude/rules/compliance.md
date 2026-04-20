# Compliance — MirrorBuddy

## Framework

EU AI Act (2024/1689), Italian Law 132/2025, GDPR, COPPA, WCAG 2.1 AA.

## Docs (`docs/compliance/`)

`DPIA.md` | `AI-POLICY.md` | `MODEL-CARD.md` | `AI-RISK-MANAGEMENT.md` | `POST-MARKET-MONITORING-PLAN.md` | `LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md` | `countries/{italy|france|spain}/` (e.g. `italy/accessibility-compliance.md`, `france/cookie-compliance.md`, `spain/cookie-compliance.md`)

## Public pages

`/ai-transparency`, `/privacy`, `/terms`, `/accessibility`.

## Admin tools

`/admin/safety`, `/admin/risk-register`, `GET /api/compliance/audit-log`.

## Pre-commit checklist

- No hardcoded secrets
- No PII in console logs
- Input validation on user-facing APIs
- Prisma parameterized only
- Output sanitization for user-generated content

## Safety guardrails

`src/lib/safety/`: bias-detector, content filter. No PII in vector DB. Transparent disclaimers. Human fallback escalation.

## Verify

`npx tsx scripts/compliance-check.ts`

## ADRs: 0004 Safety | 0034 Chat Streaming | 0047 Grafana Observability | 0058 Observability+KPIs
