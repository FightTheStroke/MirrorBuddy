---
description: 'Regulatory compliance: EU AI Act, GDPR, COPPA, WCAG 2.1 AA'
applyTo: 'docs/compliance/**/*,src/lib/safety/**/*,src/lib/privacy/**/*'
---

# Compliance Rules

## Regulatory Framework

EU AI Act (2024/1689), Italian Law 132/2025, GDPR, COPPA, WCAG 2.1 AA

## Key Documents

| Document               | Path                                             |
| ---------------------- | ------------------------------------------------ |
| DPIA                   | `docs/compliance/DPIA.md`                        |
| AI Policy              | `docs/compliance/AI-POLICY.md`                   |
| Model Card             | `docs/compliance/MODEL-CARD.md`                  |
| Risk Management        | `docs/compliance/AI-RISK-MANAGEMENT.md`          |
| Post-Market Monitoring | `docs/compliance/POST-MARKET-MONITORING-PLAN.md` |

## Public Pages

`/ai-transparency`, `/privacy`, `/terms`, `/accessibility`

## Developer Checklist (Before Commit)

- No hardcoded secrets
- No PII in console logs
- Input validation on all user-facing APIs
- Prisma parameterized queries only
- Output sanitization for user-generated content
- No PII in vector DB

## Safety Guardrails

Bias detection (`src/lib/safety/bias-detector.ts`), content filtering,
transparent disclaimers, human fallback escalation.

## Verification

`npx tsx scripts/compliance-check.ts`
