# DPIA - External Services Risk Assessment

**Document Version**: 1.0
**Date**: 21 January 2026
**Parent Document**: DPIA.md (Section 5.1)
**Regulatory Basis**: GDPR Article 35(7) - Assessment of risks to data subjects
**Next Review**: 20 January 2027

---

## Purpose

This document provides detailed risk assessment for third-party data processors used by MirrorBuddy, as required by GDPR Article 35 Data Protection Impact Assessment (DPIA) framework.

**Audit Reference**: Full processor compliance audit at `docs/compliance/SERVICE-COMPLIANCE-AUDIT-2026-01.md` (21 January 2026).

---

## 1. Supabase (Database)

| Criterion | Assessment |
|-----------|------------|
| **Risk Level** | 🟢 **ZERO RISK** |
| **Data Types** | User profiles, conversations, learning preferences, accessibility settings, audit logs |
| **Data Location** | EU (Frankfurt, Germany - AWS eu-central-1) |
| **Transfer Mechanism** | EU-only processing (GDPR Art 45 adequacy) |
| **DPA Status** | ✅ Executed (Module 2, Module 3 SCCs) |
| **Mitigation Measures** | TLS 1.3 in transit, AES-256 at rest, row-level security (RLS), access controls, audit logging, 90-day retention policy |
| **Sub-Processors** | AWS (EU), Fly.io, Stripe, Segment, Sentry, Zendesk, Mailgun (all with DPAs/SCCs) |
| **Residual Risk** | 🟢 **NEGLIGIBLE** - EU-only storage eliminates international transfer risk |

### Assessment

Supabase poses minimal risk to data subjects. All data remains within EU jurisdiction, protected by GDPR adequacy decision under Article 45. No extra-EU transfer occurs. PostgreSQL database implements row-level security (RLS) ensuring users access only their own data. Encryption at rest (AES-256) and in transit (TLS 1.3) provide technical safeguards against unauthorized access.

**GDPR Compliance**: Articles 32 (Security of processing), 44 (General principle for transfers), 45 (Adequacy decision)

**DPA Reference**: `docs/compliance/dpa/SUPABASE-DPA.md`

---

## 2. Azure OpenAI (AI Processing)

| Criterion | Assessment |
|-----------|------------|
| **Risk Level** | 🟢 **ZERO RISK** |
| **Data Types** | Conversation messages, audio streams, maestro knowledge context, transcriptions |
| **Data Location** | EU (West Europe for chat, Sweden Central for voice) |
| **Transfer Mechanism** | EU-only processing (GDPR Art 45 adequacy) |
| **DPA Status** | ✅ Executed (Microsoft DPA, EU Data Boundary commitment) |
| **Mitigation Measures** | TLS 1.3 encryption, no data retention (zero-day policy), Azure Private Link, Microsoft Entra ID auth, EU-resident model deployment |
| **Sub-Processors** | Microsoft Azure infrastructure (EU regions only) |
| **Residual Risk** | 🟢 **NEGLIGIBLE** - EU-only processing, no data retention, enterprise-grade security |

### Assessment

Azure OpenAI configured for EU-only deployment eliminates international transfer risk. Data processed entirely within GDPR jurisdiction (West Europe for chat, Sweden Central for voice). Zero-day retention policy means no conversation data persisted by Microsoft. All AI processing occurs in real-time without storage. Enterprise-grade security includes TLS 1.3 encryption, Azure Private Link isolation, and Microsoft Entra ID authentication.

**GDPR Compliance**: Articles 32 (Security), 44-45 (Adequacy), EU AI Act Article 9 (Risk management)

**DPA Reference**: `docs/compliance/dpa/AZURE-DPA.md`

---

## 3. Vercel (Hosting)

| Criterion | Assessment |
|-----------|------------|
| **Risk Level** | 🟡 **LOW** |
| **Inherent Risk** | 🟠 MEDIUM (US CLOUD Act exposure) |
| **Data Types** | Application code, deployment logs, analytics, session cookies, user interactions |
| **Data Location** | US (AWS us-east-1) |
| **Transfer Mechanism** | EU → US transfer protected by Standard Contractual Clauses (SCC Module 2) |
| **DPA Status** | ✅ Executed (EU SCCs 2021/914) |
| **Mitigation Measures** | SCCs + TLS 1.3 + AES-256 encryption + access controls + audit logs + Cloudflare DDoS protection + session-only cookies (no persistent PII storage) |
| **Schrems II Compliance** | ✅ Transfer Impact Assessment conducted, supplementary measures implemented |
| **Sub-Processors** | AWS (US), GCP (US), Cloudflare, Stripe, Datadog, Sentry, Zendesk (all with SCCs) |
| **Residual Risk** | 🟡 **LOW** - SCCs + technical safeguards reduce US transfer risk to acceptable level |

### Assessment

Vercel poses low residual risk after mitigation. While hosting occurs in US jurisdiction (subject to CLOUD Act), Standard Contractual Clauses combined with encryption and access controls provide adequate safeguards per Schrems II (CJEU C-311/18). Importantly, sensitive data (conversations, user profiles) stored exclusively in EU (Supabase), not on Vercel infrastructure. Vercel processes only: (1) application code (non-sensitive), (2) session cookies (temporary), (3) deployment logs (no PII).

**Risk Reduction**: Inherent MEDIUM risk reduced to LOW through:
- Standard Contractual Clauses (legal safeguard)
- TLS 1.3 + AES-256 encryption (technical safeguard)
- Session-only cookies, no persistent PII storage (data minimization)
- Audit logging of all access (organizational safeguard)

**GDPR Compliance**: Articles 28 (Processor), 32 (Security), 46 (SCCs), EDPB Recommendations 01/2020 (Supplementary measures)

**DPA Reference**: `docs/compliance/dpa/VERCEL-DPA.md`

---

## 4. Resend (Transactional Email)

| Criterion | Assessment |
|-----------|------------|
| **Risk Level** | 🟡 **LOW** |
| **Inherent Risk** | 🟠 MEDIUM (email metadata exposure, US jurisdiction) |
| **Data Types** | Email addresses, invite notifications, temporary credentials (magic links), password reset tokens |
| **Data Location** | US (AWS us-east-1, us-west-2) |
| **Transfer Mechanism** | EU → US transfer protected by Standard Contractual Clauses (SCC Module 2) |
| **DPA Status** | ✅ Executed (EU SCCs 2021/914) |
| **Mitigation Measures** | SCCs + TLS 1.3 encryption + 24-hour token expiry + 90-day automatic deletion + no tracking pixels + no user names in email body + data minimization (email address only) |
| **Schrems II Compliance** | ✅ Transfer Impact Assessment conducted, data minimization enforced |
| **Sub-Processors** | AWS SES (US), Cloudflare, Stripe, Vercel, PostHog, Sentry, Linear (all with SCCs) |
| **Residual Risk** | 🟡 **LOW** - Short retention periods and data minimization reduce exposure |

### Assessment

Resend poses low residual risk after mitigation. Email processing inherently requires brief US transfer (AWS SES infrastructure), mitigated by:
1. **24-hour credential expiry** - Magic links and tokens invalid after 24h
2. **90-day automatic deletion** - All email records auto-deleted after 90 days
3. **No persistent PII storage** - Only email addresses stored, no names or profiles
4. **No tracking pixels** - User privacy protected, no read receipts or link tracking
5. **Data minimization** - Email body contains only generic text, no personal details

**Risk Reduction**: Inherent MEDIUM risk reduced to LOW through time-limited exposure and data minimization principles.

**GDPR Compliance**: Articles 5(1)(c) (Data minimization), 28 (Processor), 32 (Security), 46 (SCCs), EDPB Recommendations 01/2020

**DPA Reference**: `docs/compliance/dpa/RESEND-DPA.md`

---

## 5. Upstash Redis (Rate Limiting)

| Criterion | Assessment |
|-----------|------------|
| **Risk Level** | 🟢 **VERY LOW** |
| **Inherent Risk** | 🟡 LOW (global multi-region processing) |
| **Data Types** | Hashed user IDs (anonymized), API request counts, timestamps, rate limit metadata |
| **Data Location** | Global multi-region (including US) |
| **Transfer Mechanism** | EU → Global transfer protected by Standard Contractual Clauses (inherited via Vercel Marketplace) |
| **DPA Status** | ✅ Inherited via Vercel integration |
| **Mitigation Measures** | SCCs + TLS encryption + hashed user IDs (SHA-256, irreversible) + short TTL (1-hour auto-expiry) + no reversible PII + no long-term storage |
| **Data Minimization** | Only hashed identifiers and counters stored, no names/emails/conversations |
| **Sub-Processors** | AWS (multi-region), Cloudflare |
| **Residual Risk** | 🟢 **VERY LOW** - Anonymized data with short retention eliminates meaningful risk |

### Assessment

Upstash poses very low risk to data subjects. Rate limiting data is pseudonymized (SHA-256 hashed user IDs) and ephemeral (1-hour TTL auto-expiry). Even if accessed by third parties, data cannot be linked to identifiable individuals. Stored data consists only of:
- Hashed user IDs (irreversible one-way hash)
- API request counters (numeric values)
- Timestamps (date/time only)

No names, emails, conversations, or profile information stored in Redis. 1-hour TTL ensures automatic deletion, preventing long-term accumulation. Compliant with GDPR Article 32(1)(a) pseudonymization requirements and Article 25 data protection by design.

**Risk Reduction**: Inherent LOW risk reduced to VERY LOW through pseudonymization and ephemeral storage.

**GDPR Compliance**: Articles 25 (Data protection by design), 32(1)(a) (Pseudonymization), 46 (SCCs)

**Implementation Reference**: `docs/adr/0054-upstash-redis-rate-limiting.md`

---

## 6. Risk Matrix Summary

| Service | Inherent Risk | Transfer Type | Mitigation Status | Residual Risk |
|---------|---------------|---------------|-------------------|---------------|
| **Supabase** | LOW | EU-only | ✅ Complete | 🟢 NEGLIGIBLE |
| **Azure OpenAI** | LOW | EU-only | ✅ Complete | 🟢 NEGLIGIBLE |
| **Vercel** | MEDIUM | EU → US (SCC) | ✅ Complete | 🟡 LOW |
| **Resend** | MEDIUM | EU → US (SCC) | ✅ Complete | 🟡 LOW |
| **Upstash Redis** | LOW | EU → Global (SCC) | ✅ Complete | 🟢 VERY LOW |

### Overall Assessment

**Overall External Services Risk**: 🟡 **LOW**

All processors compliant with GDPR Chapter V (Articles 44-50). No high-risk or non-compliant transfers identified. Residual risks are low and adequately mitigated through combination of:
- Legal safeguards (SCCs, DPAs)
- Technical measures (encryption, pseudonymization, data minimization)
- Organizational measures (access controls, audit logging, retention limits)

**Supervisory Authority Consultation**: Not required per GDPR Article 36 - residual risks are low and adequately mitigated.

---

## 7. Compliance Verification

### GDPR Article 35(7) Requirements

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **Systematic description of processing** | ✅ Complete | Sections 1-5 document all processors |
| **Purposes of processing** | ✅ Complete | Each service includes purpose (database, AI, hosting, email, rate limiting) |
| **Assessment of necessity** | ✅ Complete | All services necessary for platform functionality |
| **Assessment of proportionality** | ✅ Complete | Data minimization applied (e.g., hashed IDs, no tracking) |
| **Assessment of risks to rights** | ✅ Complete | Inherent and residual risks documented |
| **Measures to address risks** | ✅ Complete | Mitigation measures per service |
| **Safeguards and security** | ✅ Complete | Technical and organizational measures documented |

### GDPR Chapter V Compliance (International Transfers)

| Article | Requirement | Status | Evidence |
|---------|-------------|--------|----------|
| **Art 44** | Lawful transfer mechanism | ✅ Met | SCCs for all extra-EU processors |
| **Art 45** | Adequacy decision (EU-only) | ✅ Met | Supabase (EU), Azure OpenAI (EU) |
| **Art 46** | Appropriate safeguards (SCCs) | ✅ Met | Vercel, Resend, Upstash have SCCs |
| **Art 28** | Processor obligations | ✅ Met | All processors have executed DPAs |

### Schrems II Compliance (CJEU C-311/18)

All US transfers include supplementary measures beyond SCCs:
- ✅ Encryption (TLS 1.3, AES-256)
- ✅ Access controls and authentication
- ✅ Audit logging and monitoring
- ✅ Data minimization (pseudonymization, short retention)

**Assessment**: Compliant with EDPB Recommendations 01/2020 on supplementary measures.

---

## 8. Review Schedule

| Activity | Frequency | Next Due Date | Responsible |
|----------|-----------|---------------|-------------|
| **DPA Review** | Bi-annual | July 2026 | Compliance Officer |
| **Sub-Processor Check** | Quarterly | April 2026 | Data Protection Officer |
| **SCC Validity Check** | Annual | January 2027 | Legal Counsel |
| **Transfer Impact Assessment** | Annual | January 2027 | Compliance Officer |
| **DPIA Update** | Annual | January 2027 | Data Protection Officer |

### Triggers for Immediate Review

- New third-party service added
- Service changes data location (e.g., US → China)
- Sub-processor changes announced
- New CJEU ruling on international transfers
- Data breach at processor
- Supervisory authority inquiry

---

## 9. Related Documentation

| Document | Path | Purpose |
|----------|------|---------|
| **Parent DPIA** | `docs/compliance/DPIA.md` | Main Data Protection Impact Assessment |
| **DPIA Risks** | `docs/compliance/DPIA-risks.md` | Detailed 12-risk matrix |
| **DPIA Appendices** | `docs/compliance/DPIA-appendices.md` | Data flow diagrams, regulatory citations |
| **Service Compliance Audit** | `docs/compliance/SERVICE-COMPLIANCE-AUDIT-2026-01.md` | Full processor audit (21 Jan 2026) |
| **Data Flow Mapping** | `docs/compliance/DATA-FLOW-MAPPING.md` | EU vs extra-EU transfer analysis |
| **Supabase DPA** | `docs/compliance/dpa/SUPABASE-DPA.md` | Supabase processor agreement |
| **Vercel DPA** | `docs/compliance/dpa/VERCEL-DPA.md` | Vercel processor agreement |
| **Resend DPA** | `docs/compliance/dpa/RESEND-DPA.md` | Resend processor agreement |
| **Azure OpenAI DPA** | `docs/compliance/dpa/AZURE-DPA.md` | Azure AI processor agreement |

---

## 10. Regulatory References

- **GDPR**: Regulation (EU) 2016/679, Articles 5 (Principles), 25 (Data protection by design), 28 (Processor), 32 (Security), 35 (DPIA), 36 (Prior consultation), 44-50 (International transfers)
- **EU SCCs**: Commission Implementing Decision (EU) 2021/914 (Standard Contractual Clauses)
- **Schrems II**: CJEU Case C-311/18 (Data Protection Commissioner v Facebook Ireland and Maximillian Schrems)
- **EDPB Recommendations 01/2020**: On measures supplementing transfer tools to ensure compliance with EU level of protection
- **EDPB Guidelines 01/2020**: On Article 46(2)(a) and (3) SCCs
- **EU AI Act**: Regulation (EU) 2024/1689, Article 9 (Risk management system for high-risk AI)
- **Italian Law 132/2025**: National AI Act implementation (Articles 3, 4)

---

**Document Status**: ✅ FINAL
**Assessment Verdict**: LOW RISK - All processors compliant
**Supervisory Authority Consultation**: Not required (GDPR Art 36)
**Next Review**: 20 January 2027
**Last Updated**: 21 January 2026
**Verified By**: Task Executor (Plan 64, T5-05)
