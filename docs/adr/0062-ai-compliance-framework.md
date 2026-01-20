# ADR 0061: AI Compliance Framework

## Status

Accepted

## Date

2026-01-20

## Context

MirrorBuddy is an AI-powered educational platform for students with learning differences (ages 6-19). It processes personal data of minors using large language models for tutoring and learning support.

### Regulatory Landscape

The platform must comply with:

1. **EU AI Act (2024/1689)** - High-risk AI systems for children
2. **Italian Law L.132/2025** - EdTech AI compliance and transparency
3. **GDPR (EU 2016/679)** - Child data protection
4. **Italian Data Protection Code** - Local implementation of GDPR

### The Challenge

The initial implementation lacked formal compliance documentation:

- No data protection impact assessment (DPIA)
- No transparent AI Policy publication
- No bias auditing process
- No risk management documentation
- No human oversight mechanisms
- No model card or AI literacy materials

This creates legal and reputational risk.

### Options Considered

#### Option 1: Minimal Compliance (Ad-Hoc Documentation)

**Pros:**

- Low initial effort
- Reactive approach

**Cons:**

- GDPR/AI Act violations
- No systematic approach
- Hard to audit and maintain
- Regulatory exposure

#### Option 2: Enterprise Compliance Suite

**Pros:**

- Comprehensive coverage
- Audit-ready

**Cons:**

- Significant overhead
- Overkill for beta stage
- High maintenance cost

#### Option 3: Tiered Compliance Framework (Chosen)

**Pros:**

- Proportionate to risk level
- Mandatory core + optional enhancements
- Audit-ready from day 1
- Scales with platform growth

**Cons:**

- Ongoing maintenance required
- Requires legal review

## Decision

Implement a **tiered AI compliance framework** with mandatory core components and scalable enhancements:

### Tier 1: Mandatory (Legal Baseline)

1. **DPIA** - Data Protection Impact Assessment
   - Risk analysis: data handling, retention, sharing
   - Mitigation strategies documented
   - File: `docs/compliance/dpia.md`

2. **AI Policy** - Public transparency document
   - AI systems list and capabilities
   - Data usage and retention
   - User rights explanation
   - Safety measures and limitations
   - File: `public/ai-policy.md` (published as `/ai-policy` route)

3. **Risk Management** - System risk register
   - High-risk scenarios identified
   - Mitigation controls for each
   - Monthly review process
   - File: `docs/compliance/risk-register.md`

4. **Human Oversight** - Escalation procedures
   - Crisis intervention protocols
   - Content moderation workflow
   - Appeal process for users
   - File: `src/lib/compliance/oversight-procedures.ts`

### Tier 2: Enhanced (Audit Readiness)

5. **Model Card** - Transparency documentation
   - Maestro capabilities and limitations
   - Training approach (non-synthetic data)
   - Bias testing results
   - File: `public/model-card.md` (published as `/ai-transparency` route)

6. **Bias Auditing** - Regular testing
   - Protected attribute testing (gender, ethnicity, etc.)
   - Fairness metrics quarterly
   - Issue tracking and remediation
   - File: `src/lib/compliance/bias-audit-service.ts`

7. **AI Literacy** - User guidance materials
   - How AI tutoring works
   - What AI cannot do
   - Privacy safeguards
   - File: `docs/compliance/ai-literacy.md` (published as `/ai-literacy` route)

### Tier 3: Observability (Continuous Compliance)

8. **Compliance Dashboard** - Admin monitoring
   - DPIA status and expirations
   - Bias audit results
   - Risk register review schedule
   - Consent tracking metrics
   - File: `src/app/admin/compliance/page.tsx`

### Implementation Structure

```
docs/compliance/
├── dpia.md                    # Mandatory: GDPR assessment
├── risk-register.md           # Mandatory: Risk management
├── ai-literacy.md             # Enhanced: User education
├── model-card-maestri.md      # Enhanced: Character documentation
└── README.md                  # Compliance index

public/
├── ai-policy.md              # Serves as /ai-policy
├── model-card.md             # Serves as /ai-transparency
└── robots.txt               # Robots exclusion for compliance

src/lib/compliance/
├── dpia-service.ts           # DPIA tracking and reminders
├── oversight-procedures.ts    # Crisis intervention workflow
├── bias-audit-service.ts      # Quarterly bias testing
├── consent-manager.ts         # Dual consent tracking (ADR 0008)
└── compliance-monitor.ts      # Audit log aggregation

src/app/admin/compliance/
├── page.tsx                  # Dashboard overview
├── dpia/                      # DPIA management
├── risk-register/             # Risk tracking UI
└── audit-logs/                # Access and event logs
```

### Compliance Checklist

- [ ] DPIA completed by data protection officer
- [ ] Risk register populated with high-risk scenarios
- [ ] Human oversight procedures implemented
- [ ] AI Policy published publicly
- [ ] Model card created for each Maestro
- [ ] Bias audit process defined and scheduled
- [ ] Admin dashboard deployed
- [ ] Legal review sign-off received

## Consequences

### Positive

- Full legal compliance with AI Act and L.132/2025
- User trust and transparency
- Audit-ready documentation
- Systematic risk management
- Regulatory defense if challenged
- Prerequisite for enterprise sales

### Negative

- Documentation overhead (~80 hours initial)
- Ongoing quarterly bias audits (~20 hours/quarter)
- Compliance monitoring infrastructure
- Potential issues discovered during DPIA
- Export controls if using non-EU LLMs

### Mitigations

- Compliance tasks added to sprint planning
- Use templates to reduce documentation time
- Automate bias audit sampling
- Schedule DPIA review quarterly, not continuously
- Keep risk register updated in real-time

## Key Files

| File                                         | Purpose                            |
| -------------------------------------------- | ---------------------------------- |
| `docs/compliance/dpia.md`                    | Data protection impact assessment  |
| `docs/compliance/risk-register.md`           | Risk management and controls       |
| `public/ai-policy.md`                        | Public AI transparency policy      |
| `public/model-card.md`                       | Model transparency and limitations |
| `src/lib/compliance/oversight-procedures.ts` | Crisis intervention and moderation |
| `src/lib/compliance/bias-audit-service.ts`   | Quarterly fairness testing         |
| `src/app/admin/compliance/page.tsx`          | Compliance monitoring dashboard    |

## Related ADRs

- **ADR 0004** - Safety Guardrails (foundation for compliance)
- **ADR 0008** - Parent Dashboard GDPR (dual consent model)
- **ADR 0031** - Embedded Knowledge Base (character documentation)
- **ADR 0056** - Trial Mode Architecture (compliance for anonymous users)
- **ADR 0057** - Invite System (beta access controls)
- **ADR 0058** - Observability and KPIs (monitoring infrastructure)

## References

- EU AI Act (2024/1689) - Article 6 (prohibited practices), Article 13 (transparency)
- Italian Law L.132/2025 - Articles on AI educational transparency
- GDPR Article 5 (Principles), Article 22 (Automated decision-making)
- GDPR Chapter III (Rights of the data subject)
- ISO/IEC 42001 - AI Management System
- NIST AI Risk Management Framework (preliminary)
