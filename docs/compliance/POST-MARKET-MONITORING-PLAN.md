# Post-Market Monitoring Plan

**Status**: DRAFT
**Version**: 1.0
**Last Updated**: 09 February 2026
**Organization**: Fightthestroke Foundation
**Contact**: roberdan@fightthestroke.org

> **IMPORTANT**: This plan is in DRAFT status. Implementation tracking begins with first production release.

## 1. Scope and Objectives

This Post-Market Monitoring Plan is established in accordance with **EU AI Act Article 72** (Regulation 2024/1689) for the MirrorBuddy educational platform, classified as a **limited-risk AI system** under Article 52.

### 1.1 System Identification

- **System Name**: MirrorBuddy
- **Provider**: Fightthestroke Foundation
- **Classification**: Limited-risk AI system (educational AI for minors with learning differences)
- **Deployment Regions**: Italy, France, Germany, Spain, United Kingdom
- **Target Users**: Students aged 8-18 with learning differences (dyslexia, ADHD, etc.)

### 1.2 Objectives

1. Continuously monitor system performance and safety in real-world conditions
2. Identify and address emerging risks, biases, or unintended consequences
3. Ensure compliance with EU AI Act transparency and accountability requirements
4. Maintain and improve system reliability, fairness, and educational effectiveness
5. Build evidence base for regulatory submissions and public accountability

### 1.3 Legal Framework

- EU AI Act (Regulation 2024/1689) Articles 72, 13, 52
- GDPR (Regulation 2016/679) Articles 5, 25, 35
- Italian Law 132/2025 (education-specific AI provisions)
- National accessibility laws (AGID, RGAA, BITV, RD 1112/2018, Equality Act 2010)

## 2. Monitoring Metrics

### 2.1 Technical Performance Metrics

**Error Rates** (collected via Sentry, Grafana Cloud)

- API error rate (target: <0.1% of requests)
- AI response generation failures (target: <0.5%)
- System uptime (target: >99.5%)
- Latency percentiles (p50, p95, p99)

**AI Model Performance**

- Response relevance scores (human evaluation sample)
- Content safety filter activation rate
- Embedding quality (vector search recall@10)
- FSRS algorithm accuracy (predicted vs. actual recall)

### 2.2 User Experience Metrics

**Engagement and Effectiveness**

- Daily/weekly active users by tier (Trial, Base, Pro)
- Session duration and completion rates
- Learning path progression metrics
- User-reported satisfaction (via in-app feedback)

**Accessibility Metrics**

- DSA profile usage distribution (7 profiles)
- TTS usage rates and error rates
- High-contrast mode adoption
- Keyboard navigation usage

### 2.3 Safety and Fairness Metrics

**Bias Indicators** (monitored per ADR-0004)

- Response quality by user demographic (age, language, disability profile)
- Content appropriateness violations (manual review sample)
- Bias detection alerts (automated screening)
- Representation balance in educational content

**Safety Incidents**

- Content filter bypasses or inappropriate content reports
- User-reported concerns via safety reporting mechanism
- Escalations to human moderators
- Privacy violation reports

### 2.4 User Feedback Metrics

**User Complaints and Reports**

- Volume and categorization (technical, content, safety, accessibility)
- Resolution time (target: <72 hours for critical issues)
- Root cause analysis for recurring issues
- Feedback sentiment analysis

## 3. Data Collection and Retention

### 3.1 Data Sources

1. **Automated telemetry**: Grafana Cloud, Sentry, application logs
2. **User feedback**: In-app reporting, email to roberdan@fightthestroke.org
3. **Manual audits**: Quarterly bias audits, content reviews
4. **External reports**: DPA inquiries, user complaints, academic research

### 3.2 Privacy-Preserving Collection

- All monitoring data collected in accordance with GDPR Article 5
- Aggregated metrics preferred over individual user data
- PII pseudonymized or anonymized before analysis
- Data retention per DATA-RETENTION-POLICY.md (6 months operational, 3 years compliance)

### 3.3 Data Processing Legal Basis

- Legitimate interest (GDPR Article 6(1)(f)) for system improvement and safety
- Legal obligation (GDPR Article 6(1)(c)) for regulatory compliance
- User consent where applicable (e.g., detailed feedback surveys)

## 4. Reporting Schedule

### 4.1 Internal Reporting

**Monthly Review** (internal team)

- Technical performance dashboard review
- Safety incident log review
- User feedback triage

**Quarterly Internal Report** (management + DPO)

- Comprehensive metrics review
- Bias audit results (per BIAS-AUDIT-REPORT.md)
- Incident trend analysis
- Risk register updates (AI-RISK-REGISTER.md)
- Recommended corrective actions

**Annual Governance Review**

- Board-level presentation
- Regulatory compliance status
- Strategic recommendations

### 4.2 Public Reporting

**Annual Public Report** (published via Model Card)

- Aggregate performance metrics (no PII)
- Safety incident summary (anonymized)
- Bias mitigation measures and outcomes
- System limitations and known issues
- Published at: `/ai-transparency` page and MODEL-CARD.md

**Ad-Hoc Public Disclosure**

- Material changes to system capabilities
- Significant incidents requiring public notification
- Major updates to risk classification

### 4.3 Regulatory Reporting

**To Italian Authorities** (if/when designated as competent authority)

- Serious incident reports within 15 days (EU AI Act Article 73)
- Annual compliance declaration

**To Data Protection Authorities**

- GDPR breach notifications within 72 hours (Article 33)
- DPIA updates for material system changes

**To Accessibility Authorities**

- National accessibility compliance reports (per country requirements)

## 5. Incident Response and Escalation

### 5.1 Incident Severity Levels

**Level 1: Critical**

- Significant user harm (e.g., dangerous advice, safety bypass)
- Data breach affecting PII
- System unavailability >4 hours
- **Response time**: Immediate (within 1 hour)
- **Notification**: DPO, management, legal counsel

**Level 2: High**

- Moderate user harm (e.g., inappropriate content displayed)
- Bias pattern affecting user subgroup
- System degradation affecting >10% users
- **Response time**: Within 4 hours
- **Notification**: DPO, technical lead

**Level 3: Medium**

- Minor content appropriateness issues
- Performance degradation <10% users
- Non-critical accessibility issues
- **Response time**: Within 24 hours
- **Notification**: Product team

**Level 4: Low**

- Individual user complaints (non-safety)
- Minor UX issues
- Feature requests
- **Response time**: Within 72 hours
- **Notification**: Support team

### 5.2 Escalation Paths

1. **Technical issues**: Support → Engineering → CTO
2. **Safety/content issues**: Support → Safety Team → DPO → Management
3. **Privacy/data issues**: Support → DPO → Legal → Management
4. **Regulatory issues**: DPO → Legal → Management → Board

### 5.3 External Notification Timelines

**User Notification**

- Critical incidents affecting user data: Within 24 hours
- Service interruptions: Real-time status page updates
- System changes affecting safety: 30 days advance notice

**Regulatory Notification**

- Serious AI incidents (EU AI Act Art. 73): Within 15 days
- GDPR breaches: Within 72 hours to DPA, without undue delay to users
- Accessibility non-compliance: Per national timelines (typically 30 days)

**Public Disclosure**

- Transparency log updated monthly
- Major incidents disclosed in annual public report
- Proactive disclosure for systemic issues affecting trust

## 6. Corrective and Preventive Actions

### 6.1 Continuous Improvement Process

1. **Issue identification**: Automated monitoring + user reports
2. **Root cause analysis**: Technical investigation + user impact assessment
3. **Action planning**: Prioritize by severity and user impact
4. **Implementation**: Engineering + content team execution
5. **Verification**: Testing + monitoring metrics post-deployment
6. **Documentation**: Update risk register and compliance docs

### 6.2 Trigger Thresholds for Action

- Error rate >0.5% sustained for 24 hours → immediate investigation
- Bias detection score >threshold → manual audit within 7 days
- User safety reports >5/month same category → systemic review
- Accessibility compliance <95% → remediation plan within 30 days

### 6.3 System Updates and Retraining

- AI model retraining triggered by drift detection or bias findings
- Content updates reviewed by educational advisory board quarterly
- System architecture changes undergo DPIA screening
- All updates logged in VERSION_HISTORY.md with rationale

## 7. Roles and Responsibilities

**Technical Lead**

- System performance monitoring
- Incident response coordination
- Implementation of corrective actions

**Data Protection Officer (DPO)**

- Privacy compliance monitoring
- Regulatory notification decisions
- DPIA oversight

**Safety Team**

- Content appropriateness monitoring
- Bias audit execution
- User safety report triage

**Product Manager**

- User feedback analysis
- Feature effectiveness monitoring
- Public transparency reporting

**Management**

- Governance oversight
- Strategic decisions on system changes
- Regulatory relationship management

## 8. Contact Information

**Primary Contact for Post-Market Monitoring Reports**
roberdan@fightthestroke.org
Fightthestroke Foundation
Subject line: [MirrorBuddy PMM Report]

**User Safety Reports**
Via in-app "Segnala un problema" / "Report an issue" button
Or email: roberdan@fightthestroke.org with subject [Safety Report]

**Data Protection Inquiries**
privacy@fightthestroke.org (when designated)
Current: roberdan@fightthestroke.org

**Regulatory Inquiries**
compliance@fightthestroke.org (when designated)
Current: roberdan@fightthestroke.org

## 9. Implementation Timeline

**Phase 1: Pre-Launch (Current)**

- Monitoring infrastructure setup (Sentry, Grafana Cloud)
- Incident response procedures documented
- Internal reporting templates created
- Training for support team

**Phase 2: Pilot Launch**

- Activate automated monitoring
- Weekly internal reviews
- Rapid iteration based on early feedback

**Phase 3: Public Launch**

- Full monitoring plan activation
- Quarterly public reporting initiated
- External audit engagement (annual)

**Phase 4: Continuous Operation**

- Annual plan review and updates
- Integration of regulatory guidance as it emerges
- Participation in industry best practice sharing

## 10. Plan Review and Updates

This plan will be reviewed and updated:

- Annually as part of governance cycle
- Upon significant system changes
- In response to regulatory guidance
- Following serious incidents

**Next Review Date**: January 2027

---

**Document Control**
**Version History**

- v1.0 (2026-02-09): Initial draft for pre-launch preparation

**Approval Status**: Awaiting management sign-off
**Classification**: Internal / Public (redacted version for transparency page)
