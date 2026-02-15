---
description: 'Regulatory compliance: EU AI Act, GDPR, COPPA, WCAG 2.1 AA'
applyTo: 'docs/compliance/**/*,src/lib/safety/**/*,src/lib/privacy/**/*'
---

# Compliance

## Framework

EU AI Act (2024/1689), Italian Law 132/2025, GDPR, COPPA, WCAG 2.1 AA

## Docs

`docs/compliance/`: DPIA, AI-POLICY, MODEL-CARD, AI-RISK-MANAGEMENT, POST-MARKET-MONITORING-PLAN
Public: `/ai-transparency`, `/privacy`, `/terms`, `/accessibility`

## Pre-Commit

No hardcoded secrets | No PII in logs/vector | Input validation | Prisma parameterized | Output sanitization

## Safety

Bias detection (`src/lib/safety/bias-detector.ts`) | content filtering | disclaimers | human fallback

Verify: `npx tsx scripts/compliance-check.ts`

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
