# Compliance Rules - MirrorBuddy

## Regulatory Framework

MirrorBuddy complies with:

- **EU AI Act** (2024/1689) - High-risk AI system in education
- **Italian Law 132/2025** - National AI implementation
- **GDPR** - Data protection (arts. 5, 6, 22, 35)
- **COPPA** - Children's online privacy (US, if applicable)
- **WCAG 2.1 AA** - Accessibility standards

## Key Documentation

| Document        | Path                                    | Purpose                           |
| --------------- | --------------------------------------- | --------------------------------- |
| DPIA            | `docs/compliance/DPIA.md`               | Data Protection Impact Assessment |
| AI Policy       | `docs/compliance/AI-POLICY.md`          | Public AI transparency            |
| Model Card      | `docs/compliance/MODEL-CARD.md`         | AI system documentation           |
| Risk Management | `docs/compliance/AI-RISK-MANAGEMENT.md` | Risk register                     |
| Bias Audit      | `docs/compliance/BIAS-AUDIT-REPORT.md`  | Fairness assessment               |

## Compliance Pages (Public-Facing)

| Page             | Route              | Purpose                      |
| ---------------- | ------------------ | ---------------------------- |
| AI Transparency  | `/ai-transparency` | EU AI Act disclosure         |
| Privacy Policy   | `/privacy`         | GDPR compliance + AI section |
| Terms of Service | `/terms`           | Legal terms + AI usage       |

## Admin Tools (Internal)

| Tool              | Path                            | Purpose                          |
| ----------------- | ------------------------------- | -------------------------------- |
| Safety Dashboard  | `/admin/safety`                 | Safety monitoring + incident log |
| Compliance Export | `GET /api/compliance/audit-log` | Audit trail for inspectors       |
| Data Portability  | `GET /api/privacy/export-data`  | GDPR data export (user request)  |
| Risk Register     | `/admin/risk-register`          | AI risk tracking and mitigation  |

## Developer Checklists

### Before Committing Code

- [ ] No hardcoded secrets (API keys, credentials)
- [ ] No console logging of PII (email, names, session data)
- [ ] Input validation on all user-facing APIs
- [ ] SQL injection prevention (use Prisma parameterized queries)
- [ ] Output sanitization for user-generated content

### Before Deploying Feature

- [ ] WCAG 2.1 AA accessibility verified
- [ ] Privacy impact documented (if collecting data)
- [ ] No new profiling or automated decision-making (unless F-20 approved)
- [ ] AI transparency text updated (if applicable)
- [ ] Safety guardrails tested (bias, harmful content)

### Before Release

- [ ] Verify all compliance docs exist
- [ ] Run compliance checklist script
- [ ] Test all compliance pages load correctly
- [ ] Review safety dashboard for incidents
- [ ] Confirm audit log exports work
- [ ] Legal review: privacy + AI transparency sections

## Verification Commands

```bash
# Run full compliance checklist
npx tsx scripts/compliance-check.ts

# Verify DPIA exists and is current
ls -la docs/compliance/DPIA.md && wc -l docs/compliance/DPIA.md

# Test compliance pages (E2E)
npx playwright test e2e/compliance.spec.ts --headed

# Verify no PII in logs
grep -r "user\|email\|name" src --include="*.ts" --include="*.tsx" | grep -i "console\|log"

# Check for hardcoded secrets
grep -r "sk_live\|api_key\|password" src --include="*.ts" --include="*.tsx"

# Export audit log (local test)
curl http://localhost:3000/api/compliance/audit-log

# Lighthouse accessibility audit
npx lhci autorun
```

## Safety Guardrails

All AI responses include:

1. **Bias Detection** - Embedded checks in `src/lib/safety/bias-detector.ts`
2. **Content Filtering** - Unsafe content blocked before response
3. **User Data Protection** - No storing PII in vector DB
4. **Transparent Disclaimers** - AI limitations disclosed to users
5. **Human Fallback** - Escalation path for unsafe scenarios

## Incident Reporting

Safety incidents are logged in `/admin/safety`:

- **Bias Detected** → Log category + context → Human review
- **Harmful Output** → Block + incident report → Immediate escalation
- **Data Breach** → Trigger GDPR breach notification workflow
- **System Error** → Alert admin + disable feature

## Reference Documents

- **ADR 0034**: AI Safety Framework
- **ADR 0037**: Deferred Compliance Items (auth, Redis, IaC)
- **ADR 0047**: Grafana Cloud Observability
- **ADR 0058**: Observability KPIs (compliance metrics)

## Compliance Contacts

- **Compliance Officer**: [To be assigned in CLAUDE.md]
- **Data Protection Officer**: [To be assigned in CLAUDE.md]
- **AI Risk Lead**: [To be assigned in CLAUDE.md]
