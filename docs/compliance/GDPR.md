# GDPR Compliance Documentation

MirrorBuddy compliance with EU General Data Protection Regulation (GDPR).

## Overview

MirrorBuddy processes personal data of students (including minors) for educational purposes.
This document outlines our GDPR compliance measures.

## Legal Basis (Article 6)

| Data Category        | Legal Basis         | Justification                         |
| -------------------- | ------------------- | ------------------------------------- |
| User Profile         | Consent             | User creates profile voluntarily      |
| Learning Data        | Contract            | Necessary to provide tutoring service |
| Conversation History | Legitimate Interest | Improves educational experience       |
| Usage Analytics      | Consent             | Opt-in telemetry                      |

## Data Subject Rights Implementation

### Article 15: Right of Access

- **Endpoint**: `GET /api/privacy/delete-my-data`
- **Returns**: Summary of all stored personal data
- **Implementation**: `src/app/api/privacy/delete-my-data/route.ts`

### Article 17: Right to Erasure

- **Endpoint**: `POST /api/privacy/delete-my-data`
- **Body**: `{ confirmDeletion: true, reason?: string }`
- **Effect**: Complete deletion of all user data
- **Implementation**: `src/app/api/privacy/delete-my-data/helpers.ts`

### Article 20: Data Portability

- **Planned**: Export to JSON/CSV
- **Current**: Available via API endpoints

## Data Retention Policy

| Data Type            | Retention Period       | Justification       |
| -------------------- | ---------------------- | ------------------- |
| Active User Data     | Until deletion request | Service provision   |
| Deleted User (grace) | 30 days                | Recovery window     |
| Audit Logs           | 90 days                | Legal compliance    |
| Anonymous Analytics  | 365 days               | Service improvement |

### Automatic Cleanup

Data retention is enforced via scheduled job:

- **Endpoint**: `POST /api/cron/data-retention`
- **Schedule**: Daily at 03:00 UTC
- **Config**: `vercel.json` cron configuration

The job:

1. Marks expired data for deletion (based on retention policy)
2. After 30-day grace period, permanently deletes marked data
3. Logs actions for audit (without PII)

## Data Minimization

### Principle: Collect Only What's Needed

| Collected            | Not Collected              |
| -------------------- | -------------------------- |
| Display name         | Real name                  |
| Age range            | Date of birth              |
| School level         | School name                |
| Learning preferences | Disability diagnosis       |
| Anonymous usage      | IP addresses (except logs) |

### API Design

- All list endpoints support pagination
- User IDs masked in responses (`abc123...`)
- Error messages never include PII
- Logs redact sensitive fields

## Security Measures

### Technical Safeguards

1. **Encryption**
   - TLS 1.3 for transit
   - AES-256 for sensitive data at rest

2. **Access Control**
   - Cookie-based sessions
   - User can only access own data

3. **CSP Headers**
   - Nonce-based script loading
   - No `unsafe-inline` or `unsafe-eval`

4. **Audit Logging**
   - All data access logged
   - Deletion events recorded
   - 90-day retention for compliance

## Children's Data (Minors)

MirrorBuddy serves students including minors (under 16 in Italy).

### Safeguards

1. **Parent Mode**: Parents can view child's activity
2. **Content Filtering**: AI-powered harm detection
3. **No Marketing**: No promotional communications to minors
4. **Limited Data**: Minimal profile information

### Consent

For users under 16:

- Parental consent required (verified via Parent Mode)
- Clear privacy notice in simple language

## Data Processing Agreements

### Third Parties

| Processor    | Purpose       | DPA Status         |
| ------------ | ------------- | ------------------ |
| Vercel       | Hosting       | GDPR-compliant     |
| Azure OpenAI | AI processing | Microsoft DPA      |
| PostgreSQL   | Database      | Self-hosted/Vercel |

## Breach Notification

In case of data breach:

1. **Detection**: Automated monitoring alerts
2. **Assessment**: Within 24 hours
3. **Notification**: DPA within 72 hours (if required)
4. **User Notification**: If high risk to rights

## Contact

**Data Controller**: MirrorBuddy Team
**DPO Contact**: Roberto D'Angelo (Interim) — roberdan@fightthestroke.org

## Compliance Tests

E2E tests verify GDPR compliance:

- `e2e/gdpr-compliance.spec.ts`

Run with: `npm run test -- --grep gdpr`

## References

- [GDPR Full Text](https://gdpr.eu/tag/gdpr/)
- [Italian DPA Guidelines](https://www.garanteprivacy.it/)
- [ADR-0045: Domain Boundaries](../adr/0045-domain-boundaries.md)
- [Privacy Module](../../src/lib/privacy/index.ts)
