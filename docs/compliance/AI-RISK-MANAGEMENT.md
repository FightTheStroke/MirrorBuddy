# AI Risk Management

MirrorBuddy risk management framework for AI systems, aligned with EU AI Act Article 9 and ISO 31000.

## Scope and Objectives

This document defines the risk management process for AI systems used in MirrorBuddy, focusing on:

- Educational AI safety (26 Maestros + coaches)
- Student data protection (minors under 16)
- System reliability and performance
- Compliance with EU AI Act and GDPR

**Scope**: All AI-powered features (chat, voice, tools, learning paths, recommendations).

## Risk Management Framework

### Process: Identify → Assess → Mitigate → Monitor → Review

```
┌─────────────┐
│ Identify    │  Risk discovery and taxonomy
└──────┬──────┘
       ↓
┌─────────────┐
│ Assess      │  Likelihood × Impact scoring
└──────┬──────┘
       ↓
┌─────────────┐
│ Mitigate    │  Controls and residual risk
└──────┬──────┘
       ↓
┌─────────────┐
│ Monitor     │  Continuous observation
└──────┬──────┘
       ↓
┌─────────────┐
│ Review      │  Annual + incident-driven
└─────────────┘
```

## AI System Classification

### Annex III Analysis (Educational AI)

MirrorBuddy is an **educational tutoring system** with:

| Criterion         | Assessment                                                 | Classification          |
| ----------------- | ---------------------------------------------------------- | ----------------------- |
| **Purpose**       | Educational support for students with learning differences | Limited-Risk            |
| **Training Data** | Curated knowledge bases (not web-scale)                    | Limited-Risk            |
| **Output**        | Educational content (subject tutoring)                     | Limited-Risk            |
| **Autonomy**      | Human-supervised (human makes final decisions)             | Limited-Risk            |
| **User Age**      | Minors (under 16)                                          | **HIGH-RISK MITIGATOR** |
| **Criticality**   | Educational (not safety-critical)                          | Limited-Risk            |

**Determination**: Primarily **Limited-Risk with HIGH-RISK elements** for child protection.

## Risk Categories

### 1. Technical Risks

**Hallucination / Factual Errors**

- AI generates incorrect educational content
- Risk: Teaches false information to students
- Mitigation: Embedded knowledge bases, RAG verification, teacher review

**Bias in Adaptive Learning**

- System biases recommendations toward certain subjects/profiles
- Risk: Reduced opportunity for diverse learning
- Mitigation: Bias testing, fairness audits, explicit profile diversity checks

**Jailbreak / Prompt Injection**

- Adversarial input attempts to bypass safety guidelines
- Risk: Generates inappropriate content despite safeguards
- Mitigation: Input validation, prompt engineering, content filters

**Model Drift / Degradation**

- Model performance decays over time or with new data
- Risk: Quality drops without detection
- Mitigation: Continuous performance monitoring, version control

**Data Poisoning**

- Training data contaminated with malicious examples
- Risk: Model learns harmful patterns
- Mitigation: Data validation, source control, audit trails

### 2. Operational Risks

**Availability / Service Interruption**

- AI system unavailable during learning sessions
- Risk: Students cannot access tutoring
- Mitigation: Redundant deployments, fallback to Ollama, SLA monitoring

**Performance Degradation**

- Slow response times during peak usage
- Risk: Poor user experience, abandonment
- Mitigation: Load testing, caching, auto-scaling

**Integration Failure**

- AI fails to integrate with voice, tools, or other systems
- Risk: Feature breakage
- Mitigation: Integration testing, staged rollouts

### 3. Compliance Risks

**GDPR Data Processing**

- Student data processed by Azure OpenAI (3rd party)
- Risk: Non-compliant data handling
- Mitigation: DPA with Azure, data minimization, encryption

**COPPA Compliance** (US users)

- Children under 13 require parental consent
- Risk: Parental consent not verified
- Mitigation: Age verification, Parent Mode, consent flow

**AI Act Transparency**

- Users not informed AI is used
- Risk: Non-compliance with transparency requirements
- Mitigation: Disclosure banners, AI disclosure in settings

### 4. Safety Risks

**Child Protection**

- Content exposure to inappropriate material (self-harm, CSAM)
- Risk: Psychological harm, legal liability
- Mitigation: Content filters, crisis protocols, mandatory reporting

**Crisis Detection Failure**

- AI fails to recognize student expressing self-harm ideation
- Risk: Missed intervention opportunity
- Mitigation: Crisis keywords, human escalation, mental health resources

**Dependency / Addiction**

- Student becomes dependent on AI instead of human interaction
- Risk: Reduced human connection
- Mitigation: Gamification limits, human coach recommendations

### 5. Reputational Risks

**AI Bias or Discrimination**

- Media discovers system treats certain groups unfairly
- Risk: Trust erosion, negative PR
- Mitigation: Fairness testing, diverse user base testing

**Privacy Breach**

- Student data leaked via AI system
- Risk: Parent lawsuits, regulatory action
- Mitigation: Data encryption, access control, incident response

**Accuracy Failure**

- AI teaches incorrect material
- Risk: Educational harm, parent complaints
- Mitigation: Knowledge base curation, teacher review, feedback loop

## Risk Register

See [AI-RISK-REGISTER.md](AI-RISK-REGISTER.md) for detailed risk assessment (15+ risks with scoring, mitigation status, and owners).

**Quick Stats**:

- **Total Risks Tracked**: 15
- **High Risk (9-16)**: 3
- **Medium Risk (5-8)**: 8
- **Low Risk (1-4)**: 4
- **Mitigated**: 12
- **In Progress**: 3

## Mitigation Strategies

### Technical Controls (5-Layer Defense)

1. **Input Validation**: Schema validation, length limits, character allowlists
2. **Prompt Engineering**: System prompts include safety guidelines, character intensity dial
3. **Content Filtering**: Keyword detection (crisis, inappropriate), DOMPurify for output
4. **Knowledge Base Curation**: Subject experts review all embedded knowledge
5. **Monitoring**: Real-time alerts, usage patterns, error tracking

### Organizational Controls

- **Policy**: Privacy policy, Terms of Service, AI disclosure
- **Training**: Team training on child safety (DSA Article 27)
- **Procedures**: Incident response, data breach protocol, crisis escalation
- **Governance**: Weekly safety reviews, monthly risk assessments

### Monitoring Controls

- **Audit Logging**: All AI interactions logged (anonymized after 90 days)
- **Alerts**: High-risk content triggers human review
- **Metrics**: Dashboard tracking safety KPIs, user feedback
- **Manual Review**: Random sample of conversations reviewed monthly

## Residual Risk Assessment

After applying all mitigations:

| Risk Category | Original Risk | Residual Risk | Acceptable? |
| ------------- | ------------- | ------------- | ----------- |
| Hallucination | High (12)     | Medium (6)    | Yes         |
| Child Safety  | High (15)     | Low (4)       | Yes         |
| Data Breach   | Medium (10)   | Low (3)       | Yes         |
| Availability  | Medium (8)    | Low (2)       | Yes         |
| Bias          | Medium (9)    | Low (4)       | Yes         |

**Conclusion**: All residual risks are at acceptable levels for a limited-risk AI system with child protection measures.

## Review and Update Process

### Triggers for Review

- Quarterly risk assessment (scheduled)
- Incident or near-miss occurs
- New feature deployment
- Model update or AI system change
- Regulatory change (EU AI Act enforcement)
- User feedback indicating risks

### Review Cadence

- **Monthly**: Safety team meeting, incident review
- **Quarterly**: Full risk register reassessment
- **Annually**: Comprehensive framework review, external audit

### Documentation

- Risk register maintained in version control
- Changes tracked with date, owner, justification
- Incident reports linked to risk register
- Annual report to stakeholders

## References

- [AI Act Article 9 Risk Management](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [ISO 31000 Risk Management](https://www.iso.org/iso-31000-risk-management.html)
- [AI-RISK-REGISTER.md](AI-RISK-REGISTER.md) - Detailed risk assessment
- [GDPR.md](GDPR.md) - Data protection
- [DSA.md](DSA.md) - Digital Services Act compliance
