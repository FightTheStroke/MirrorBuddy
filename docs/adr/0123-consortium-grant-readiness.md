# ADR 0123: Consortium & Grant Application Readiness

## Status

Proposed

## Date

2026-02-05

## Context

MirrorBuddy may participate in research consortia and apply to competitive grants (EU Horizon, national funds, public-private partnerships). An analysis of two reference agreements — a **Consortium Agreement** and a **Data Sharing Framework Agreement** drafted by DLA Piper for the CP360 initiative (AI-based cerebral palsy screening) — revealed that while MirrorBuddy has strong technical compliance, several administrative/legal/governance documents are missing or incomplete.

### Reference Documents Analyzed

1. **Consortium Agreement** (DLA Piper, Draft 11 Nov 2025): Multi-party research governance covering IP, governance, publications, confidentiality, liability/insurance, data protection, dispute resolution.
2. **Framework Data Sharing Agreement** (DLA Piper, Draft 7 Nov 2025): GDPR data sharing framework covering Controller/Processor roles, Joint Controller arrangements, DPIA, DPO, data security, breach notification, pseudonymisation, sub-processors, deletion procedures.

### Current Strengths

MirrorBuddy already covers the following areas comprehensively:

- **DPIA** (Art. 35 GDPR): `docs/compliance/DPIA.md` + appendices + risk matrix
- **GDPR compliance**: Full Art. 15/17/20 implementation, multi-country retention
- **AI Act compliance**: Model Card, AI Policy, Risk Management, Conformity Assessment
- **Data breach protocol**: 72-hour notification, escalation matrix (`docs/security/DATA-BREACH-PROTOCOL.md`)
- **Data retention/deletion**: Country-specific policies for 5 jurisdictions
- **Encryption**: AES-256-GCM at rest, TLS 1.3 in transit
- **Sub-processor management**: DPAs with Azure, Supabase, Vercel, Resend
- **Audit trail**: Admin + safety audit logging, 90-day retention
- **Consent mechanisms**: Multi-country cookie consent, COPPA, trial consent
- **IP strategy**: Apache 2.0, LICENSE-STRATEGY.md, IP-MITIGATION-PLAN.md
- **Accessibility**: 7 DSA profiles, WCAG 2.1 AA, VPAT report

## Decision

Create the following documents and processes to close the identified gaps, organized by priority.

### P0 — Blocking for any consortium/grant application

#### 1. Formal DPO Designation

**Requirement**: GDPR Art. 37 mandates formal designation for high-risk processing involving children's data. The Data Sharing Agreement explicitly requires a named DPO.

**Action**: Draft a DPO appointment letter specifying:

- Named individual and qualifications
- Contact details (currently `privacy@mirrorbuddy.it`)
- Communication to the Italian Garante per la Protezione dei Dati Personali
- Published on public privacy page

**Deliverable**: `docs/compliance/DPO-DESIGNATION.md` + Garante notification receipt

**Owner**: Legal / Compliance

#### 2. Professional Liability & Cyber Insurance

**Requirement**: Consortium Agreement clause 8.4 requires each party to maintain adequate insurance and provide annual certificates.

**Action**: Obtain:

- Professional liability (RC professionale) insurance
- Cyber insurance / data breach coverage
- Errors & omissions coverage

**Deliverable**: Insurance certificates stored in `docs/legal/insurance/` (not committed to public repo)

**Owner**: Finance / Legal

#### 3. Ethics Committee / IRB Approval

**Requirement**: Data Sharing Agreement clause 5.5 requires research ethics approvals. Any research involving minors requires formal ethics clearance.

**Action**: Submit the existing pilot research protocol (`docs/compliance/PILOT-RESEARCH-PROTOCOL.md`) to a recognized ethics committee. Obtain and archive formal approval.

**Deliverable**: Ethics approval certificate + `docs/compliance/ETHICS-APPROVAL.md` (reference)

**Owner**: Research Lead

**Lead time**: 4-12 weeks (longest P0 item)

### P1 — Required for consortium participation

#### 4. Joint Controller Arrangement Template

**Requirement**: Data Sharing Agreement clause 8 and GDPR Art. 26 require formal arrangements when two parties co-determine purposes and means of processing.

**Action**: Draft a template covering:

- Respective responsibilities for GDPR compliance
- Data subject contact point
- Privacy notice provisions
- Cooperation on data subject requests

**Deliverable**: `docs/legal/templates/JOINT-CONTROLLER-ARRANGEMENT.md`

**Owner**: Legal

#### 5. Bidirectional DPA Template

**Requirement**: Data Sharing Agreement clause 9 requires Data Processing Agreements. MirrorBuddy has DPAs with its own processors but no template to offer when acting as either Controller or Processor for consortium partners.

**Action**: Draft a DPA template compliant with GDPR Art. 28 covering both directions:

- MirrorBuddy as Controller, partner as Processor
- MirrorBuddy as Processor, partner as Controller

**Deliverable**: `docs/legal/templates/DATA-PROCESSING-AGREEMENT.md`

**Owner**: Legal

#### 6. Governance Structure Documentation

**Requirement**: Consortium Agreement clauses 3.1-3.2 require documented governance with Executive Committee, quorum rules, reporting cadence. Any consortium will ask about the partner's internal governance.

**Action**: Document:

- Organizational chart (Fondazione FightTheStroke context)
- Decision-making authority and roles
- Project management structure
- Advisory board (if any)

**Deliverable**: `docs/governance/GOVERNANCE-STRUCTURE.md`

**Owner**: Executive

### P2 — Important for due diligence

#### 7. Conflict of Interest Policy

**Requirement**: Consortium Agreement clause 3.3 requires formal CoI declarations from all consortium members and committee participants.

**Action**: Create:

- CoI policy defining what constitutes a conflict
- Declaration form template
- Annual disclosure process

**Deliverable**: `docs/governance/CONFLICT-OF-INTEREST-POLICY.md`

**Owner**: Legal / HR

#### 8. Financial Reporting Framework

**Requirement**: Consortium Agreement clause 4 requires a secretary maintaining expenditure records. Grant applications universally require financial accountability.

**Action**: Establish:

- Cost tracking methodology
- Budget template for grant applications
- Expenditure reporting format
- Service cost baseline (current: ~EUR 30-270/month operational)

**Deliverable**: `docs/governance/FINANCIAL-REPORTING-FRAMEWORK.md`

**Owner**: Finance

#### 9. Background IP Register

**Requirement**: Consortium Agreement clause 5.2 and Schedule 3 require a formal register of all Background IP with Category A/B classification, restrictions, and encumbrances.

**Action**: Create a structured inventory of all pre-existing IP:

- MirrorBuddy codebase (Apache 2.0)
- Character knowledge bases (original content vs. third-party)
- AI models and training data provenance
- Third-party libraries and their licenses
- Character IP status (Alex Pina, Simone Barlaam, etc.)

**Deliverable**: `docs/legal/BACKGROUND-IP-REGISTER.md`

**Owner**: Legal / Tech Lead

### P3 — Nice to have, strengthens application

#### 10. Consolidated Security Standards Policy

**Requirement**: Data Sharing Agreement Schedule 3 asks for a declared "minimum encryption standard." MirrorBuddy implements strong encryption but lacks a single policy document.

**Action**: Consolidate from existing sources (SECURITY-WHITEPAPER.md, ADR 0080) into one policy:

- Encryption standards (AES-256-GCM, TLS 1.3, HMAC-SHA256)
- Access control policies
- Key management procedures
- Incident classification

**Deliverable**: `docs/security/SECURITY-STANDARDS-POLICY.md`

**Owner**: Tech Lead

## Implementation Timeline

```
Week 1-2:   P0.1 DPO Designation
             P1.4 Joint Controller template
             P1.5 DPA template
             P2.7 Conflict of Interest policy
             P3.10 Security Standards Policy

Week 2-4:   P0.2 Insurance procurement
             P1.6 Governance documentation
             P2.8 Financial reporting framework
             P2.9 Background IP Register

Week 4-12:  P0.3 Ethics committee approval (external dependency)
```

## Checklist for Grant Application Readiness

Before submitting any consortium/grant application, verify:

- [ ] DPO formally designated and notified to Garante
- [ ] Insurance certificates current (RC + cyber)
- [ ] Ethics committee approval obtained (if research with minors)
- [ ] Joint Controller Arrangement template reviewed by legal
- [ ] DPA template reviewed by legal
- [ ] Governance structure documented and current
- [ ] CoI declarations collected from all team members
- [ ] Financial reporting system operational
- [ ] Background IP register complete and classified
- [ ] Security standards policy published

## Consequences

### Positive

1. **Consortium ready**: Can respond to consortium invitations without blocking delays
2. **Grant competitive**: Administrative documentation meets funder expectations
3. **Due diligence proof**: Partners can verify governance and compliance maturity
4. **Scalable**: Templates reusable across multiple consortium applications
5. **Regulatory head start**: SOC2/ISO27001 roadmap (already planned for Q4 2026) benefits from these foundational documents

### Negative

1. **Legal cost**: Templates require legal review (estimated EUR 3,000-8,000 for items 4, 5, 7)
2. **Time investment**: Ethics approval has 4-12 week external dependency
3. **Insurance cost**: Annual premium for RC + cyber (market-dependent)
4. **Maintenance**: Documents require periodic review and updates

## Related

- ADR 0062: AI Compliance Framework
- ADR 0075: Cookie Handling Standards
- ADR 0080: Security Audit Hardening
- ADR 0100: Multi-Country Compliance Architecture
- `docs/compliance/DPIA.md` — existing DPIA
- `docs/compliance/GDPR.md` — existing GDPR documentation
- `docs/compliance/PILOT-RESEARCH-PROTOCOL.md` — pilot study protocol
- `docs/legal/IP-MITIGATION-PLAN.md` — IP risk assessment
- `docs/compliance/SOC2-ISO27001-ROADMAP.md` — certification timeline

## References

- GDPR Art. 26 (Joint Controllers)
- GDPR Art. 28 (Processor obligations)
- GDPR Art. 37 (DPO designation)
- EU AI Act 2024/1689
- Italian Law 132/2025 (AI in education)
- DLA Piper CP360 Consortium Agreement (Draft 11 Nov 2025)
- DLA Piper CP360 Data Sharing Framework Agreement (Draft 7 Nov 2025)
