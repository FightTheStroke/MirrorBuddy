# Compliance Rules - MirrorBuddy

## Regulatory Framework

EU AI Act (2024/1689), Italian Law 132/2025, GDPR, COPPA, WCAG 2.1 AA

## Key Docs

| Document        | Path                                    |
| --------------- | --------------------------------------- |
| DPIA            | `docs/compliance/DPIA.md`               |
| AI Policy       | `docs/compliance/AI-POLICY.md`          |
| Model Card      | `docs/compliance/MODEL-CARD.md`         |
| Risk Management | `docs/compliance/AI-RISK-MANAGEMENT.md` |

## Public Pages: `/ai-transparency`, `/privacy`, `/terms`

## Admin Tools: `/admin/safety`, `/admin/risk-register`, `GET /api/compliance/audit-log`

## Developer Checklist (Before Commit)

- No hardcoded secrets
- No PII in console logs
- Input validation on all user-facing APIs
- Prisma parameterized queries only
- Output sanitization for user-generated content

## Safety Guardrails

Bias detection (`src/lib/safety/bias-detector.ts`), content filtering, no PII in vector DB, transparent disclaimers, human fallback escalation.

## Verification: `npx tsx scripts/compliance-check.ts`

## ADRs: 0004 (Safety Guardrails), 0034 (Chat Streaming Architecture), 0047 (Grafana Cloud Enterprise Observability), 0058 (Observability and KPIs)
