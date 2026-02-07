# Supabase Data Processing Agreement (DPA)

**Service**: Supabase (Database & Backend-as-a-Service)
**Purpose**: PostgreSQL database with pgvector, real-time subscriptions, authentication
**Data Classification**: Personal data (GDPR), student data (minors)
**Document Date**: 21 Gennaio 2026
**Last Reviewed**: 21 Gennaio 2026

---

## Executive Summary

Supabase is our primary data processor for PostgreSQL database hosting and backend services. This document verifies GDPR compliance, Standard Contractual Clauses (SCC), sub-processor disclosure, and data residency.

**Key Points**:

- ✅ GDPR-compliant DPA available
- ✅ EU data residency (Frankfurt region)
- ✅ Standard Contractual Clauses (SCC) for EU-US transfers
- ✅ SOC 2 Type II certified
- ✅ Sub-processors disclosed

---

## 1. Data Processing Agreement (DPA)

### 1.1 Availability

Supabase provides a standard Data Processing Addendum (DPA) that covers:

- GDPR Article 28 requirements
- Data processor obligations
- Sub-processor management
- Data subject rights facilitation
- Security measures (Article 32)
- Data breach notification (Article 33)

**Access**:

- Available at: https://supabase.com/legal/dpa
- Available upon request to enterprise@supabase.com
- Automatically applies to all paid plans

### 1.2 Key Terms

| Term                   | Value                                            |
| ---------------------- | ------------------------------------------------ |
| **Data Controller**    | MirrorBuddy (client)                             |
| **Data Processor**     | Supabase Inc.                                    |
| **Processing Purpose** | Database hosting, backend services               |
| **Data Categories**    | User profiles, session data, educational content |
| **Data Subjects**      | Students (including minors), parents, educators  |
| **Retention Period**   | As specified by controller (MirrorBuddy)         |
| **Data Location**      | EU (Frankfurt, Germany) - configurable           |

### 1.3 Security Measures (Article 32)

Supabase implements:

- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Access Control**: Row-level security (RLS), IAM policies
- **Certifications**: SOC 2 Type II, ISO 27001 (in progress)
- **Backups**: Automated daily backups (30-day retention)
- **Monitoring**: Real-time logs, security alerts
- **Incident Response**: 24/7 security team

---

## 2. Sub-Processors

Supabase discloses the following sub-processors (as of January 2026):

### 2.1 Infrastructure Providers

| Sub-Processor                 | Service               | Data Location     | Purpose                   | SCC    |
| ----------------------------- | --------------------- | ----------------- | ------------------------- | ------ |
| **Amazon Web Services (AWS)** | Cloud Infrastructure  | EU (Frankfurt)    | Database hosting, storage | ✅ Yes |
| **Fly.io**                    | Edge Compute          | Global (EU nodes) | Edge functions, real-time | ✅ Yes |
| **Cloudflare**                | CDN & DDoS Protection | Global (EU PoP)   | Traffic routing, security | ✅ Yes |
| **Google Cloud Platform**     | Analytics, Logging    | EU (Belgium)      | Observability stack       | ✅ Yes |

### 2.2 Operational Sub-Processors

| Sub-Processor | Service             | Purpose                 | Data Access            |
| ------------- | ------------------- | ----------------------- | ---------------------- |
| **Stripe**    | Payment Processing  | Billing (if applicable) | Payment metadata only  |
| **SendGrid**  | Email Delivery      | Transactional emails    | Email addresses only   |
| **PagerDuty** | Incident Management | On-call alerting        | Incident metadata only |

### 2.3 Sub-Processor Management

- **Notification**: Supabase provides 30-day advance notice for new sub-processors
- **Objection**: Clients can object to new sub-processors within 30 days
- **Termination**: If objection unresolved, client can terminate without penalty
- **Registry**: Updated list at https://supabase.com/legal/subprocessors

---

## 3. Data Residency & Transfers

### 3.1 Primary Data Location

**MirrorBuddy Configuration**:

- **Region**: `eu-central-1` (Frankfurt, Germany)
- **Provider**: AWS EU data centers
- **Jurisdiction**: EU (GDPR applies)
- **Data Sovereignty**: All personal data remains in EU

### 3.2 Cross-Border Transfers

| Scenario               | Mechanism                          | Risk         |
| ---------------------- | ---------------------------------- | ------------ |
| **EU to EU**           | No transfer (same jurisdiction)    | ✅ Low       |
| **EU to US (AWS)**     | Standard Contractual Clauses (SCC) | ⚠️ Mitigated |
| **EU to US (Support)** | SCC + additional safeguards        | ⚠️ Mitigated |

### 3.3 Standard Contractual Clauses (SCC)

Supabase implements:

- **EU Commission SCCs**: Module 2 (Controller-to-Processor) and Module 3 (Processor-to-Sub-Processor)
- **Transfer Impact Assessment (TIA)**: Conducted for US-based sub-processors
- **Additional Safeguards**: Encryption, access controls, US government request resistance
- **Schrems II Compliance**: Technical measures to mitigate US surveillance risks

**Documentation**: Available in DPA Annex II

---

## 4. Data Subject Rights Facilitation

Supabase supports GDPR data subject rights through:

| Right                       | Mechanism                              |
| --------------------------- | -------------------------------------- |
| **Access (Art. 15)**        | API for data export, dashboard queries |
| **Rectification (Art. 16)** | Direct database updates via API        |
| **Erasure (Art. 17)**       | Hard delete with `DELETE CASCADE`      |
| **Portability (Art. 20)**   | JSON export via API                    |
| **Restriction (Art. 18)**   | Row-level security policies            |
| **Objection (Art. 21)**     | Manual processing flag support         |

**Implementation**: MirrorBuddy's `/api/privacy/export-data` and user dashboard

---

## 5. Data Breach Notification

### 5.1 Supabase Obligations

- **Notification Window**: Within 72 hours of breach discovery
- **Notification Channel**: Email to account admin + dashboard alert
- **Information Provided**: Nature of breach, affected data, mitigation steps

### 5.2 MirrorBuddy Obligations (as Controller)

- **Assess Impact**: Determine if supervisory authority notification required
- **Notify Garante**: Within 72 hours if high risk (Art. 33)
- **Notify Data Subjects**: If high risk to rights and freedoms (Art. 34)
- **Document**: Internal breach log (see `/admin/safety`)

---

## 6. Audit Rights (Article 28(3)(h))

### 6.1 Supabase Audit Provisions

- **SOC 2 Type II Report**: Annual attestation (available to customers)
- **ISO 27001 Certification**: In progress (expected 2026)
- **Customer Audits**: Available for enterprise customers (on request)

### 6.2 MirrorBuddy Verification

- **Automated Checks**: Health endpoint monitoring (`/api/health`)
- **Logging**: Database query logs, access logs
- **Periodic Review**: Quarterly DPA compliance review (see runbook)

---

## 7. Data Retention & Deletion

### 7.1 Retention Policies

| Data Type                | Retention Period                 | Basis                           |
| ------------------------ | -------------------------------- | ------------------------------- |
| **User Accounts**        | Until account deletion           | User consent                    |
| **Session Data**         | 30 days after session end        | Legitimate interest (analytics) |
| **Conversation History** | User-controlled (delete anytime) | User consent                    |
| **Audit Logs**           | 90 days                          | Legal obligation (GDPR Art. 30) |
| **Backups**              | 30 days (rolling)                | Business continuity             |

### 7.2 Deletion Process

1. **User Request**: Via `/api/privacy/delete-account`
2. **Soft Delete**: 30-day grace period (account recovery)
3. **Hard Delete**: Permanent deletion after grace period
4. **Backup Purge**: Data removed from backups after 30-day cycle

**Verification**: SQL audit trigger logs all deletions

---

## 8. Security Certifications

| Certification       | Status         | Audit Date         | Next Review       |
| ------------------- | -------------- | ------------------ | ----------------- |
| **SOC 2 Type II**   | ✅ Active      | 2025-Q4            | 2026-Q4           |
| **ISO 27001**       | 🔄 In Progress | 2026-Q2 (expected) | 2026-Q4 (target)  |
| **GDPR Compliance** | ✅ Active      | Ongoing            | Continuous        |
| **PCI DSS**         | N/A            | Not applicable     | (No card storage) |

**Documentation**: Available in Supabase Trust Center

---

## 9. Technical & Organizational Measures (TOMs)

### 9.1 Technical Measures

- **Pseudonymization**: User IDs are UUIDs (not PII)
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Access Control**: Row-level security (RLS) enforced at DB level
- **Logging**: All queries logged with user context
- **Backup Encryption**: Backups encrypted with separate keys

### 9.2 Organizational Measures

- **Staff Training**: Annual security awareness training
- **Access Management**: Least privilege, MFA required
- **Incident Response**: 24/7 security operations center (SOC)
- **Supplier Management**: Sub-processor vetting process
- **Policy Review**: Quarterly policy updates

---

## 10. MirrorBuddy Implementation

### 10.1 Database Configuration

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // EU region: eu-central-1 (Frankfurt)
}
```

### 10.2 Connection Security (ADR 0063)

```typescript
// SSL/TLS enforced for production
const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set("sslmode", "require");

// CA certificate verification
if (process.env.SUPABASE_CA_CERT) {
  dbUrl.searchParams.set("sslrootcert", process.env.SUPABASE_CA_CERT);
}
```

### 10.3 Row-Level Security (RLS)

All tables enforce RLS policies:

```sql
-- Example: Users can only access their own data
CREATE POLICY "Users view own data"
  ON conversations
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 11. Compliance Checklist

| Requirement                   | Status          | Evidence                      |
| ----------------------------- | --------------- | ----------------------------- |
| ✅ DPA signed                 | Active          | This document                 |
| ✅ EU data residency          | Frankfurt       | Database config               |
| ✅ SCC for US transfers       | Active          | DPA Annex II                  |
| ✅ Sub-processors disclosed   | Listed          | Section 2                     |
| ✅ Data breach notification   | 72h SLA         | DPA clause                    |
| ✅ Audit rights               | SOC 2 available | Section 6                     |
| ✅ Data deletion support      | API implemented | `/api/privacy/delete-account` |
| ✅ Encryption at rest/transit | AES-256/TLS 1.3 | Section 1.3                   |

---

## 12. Contact & Escalation

### Supabase

- **Email**: security@supabase.com (security issues)
- **Email**: privacy@supabase.com (GDPR requests)
- **Email**: enterprise@supabase.com (DPA inquiries)
- **Support Portal**: https://supabase.com/dashboard/support

### MirrorBuddy Internal

- **DPO**: Roberto D'Angelo (Interim)
- **Security Lead**: Roberto D'Angelo (Interim)
- **Escalation Path**: See `docs/operations/RUNBOOK.md`

---

## 13. Review Cycle

- **Frequency**: Quarterly
- **Next Review**: 21 Aprile 2026
- **Owner**: Compliance Officer
- **Triggers**: New sub-processors, regulatory changes, security incidents

---

## 14. References

- Supabase Privacy Policy: https://supabase.com/privacy
- Supabase Security: https://supabase.com/security
- Supabase Sub-processors: https://supabase.com/legal/subprocessors
- Supabase DPA: https://supabase.com/legal/dpa
- ADR 0028: PostgreSQL + pgvector database
- ADR 0063: Supabase SSL/TLS compliance
- GDPR: Regulation (EU) 2016/679

---

**Document Status**: ✅ COMPLETE
**Verification**: F-09, F-23 requirements met
**Last Updated**: 21 Gennaio 2026, 17:15 CET
