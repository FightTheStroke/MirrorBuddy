# Data Retention Policy - MirrorBuddy

**Status**: Active | Last Updated: January 2026 | Next Review: April 2026

---

## Executive Summary

MirrorBuddy implements **country-specific data retention schedules** compliant with GDPR and national data protection laws across 5 jurisdictions (Italy, UK, Germany, Spain, France). This document defines:

1. Legal retention period requirements per country
2. Data categories and their retention rules
3. Deletion procedures and compliance verification
4. Technical implementation and audit trails

**Key Principle**: "Keep data only as long as necessary" (GDPR Art. 5(1)(e) - Storage Limitation)

---

## 1. Retention Schedules by Jurisdiction

### ITALY (GDPR + D.Lgs 196/2003 + L.132/2025)

**Authority**: Garante della Privacy (Italian Data Protection Authority)

#### Retention Periods

| Data Category                       | Retention Period                                       | Legal Basis                                    | Notes                                         |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| **Student Profile Data**            | Until graduation + 2 years                             | GDPR Art. 17(3)(a) (contract necessity)        | After 2 years, delete unless legal obligation |
| **Parent/Guardian Contact Info**    | Until student majority (18) or 2 years post-graduation | GDPR Art. 17 exemption                         | Links to consent records                      |
| **Parental Consent Records**        | Until majority (18) + 1 year                           | D.Lgs 196/2003, Art. 7 (proof of lawful basis) | Evidence of parental consent                  |
| **Educational Content/Assessments** | Until graduation + 1 year                              | Educational continuity                         | Student transcript records                    |
| **Learning Interaction Logs**       | Until graduation + 6 months                            | GDPR Art. 5(1)(e)                              | Anonymous after 6 months if possible          |
| **AI Safety/Incident Logs**         | 3 years                                                | Garante guidance (2024)                        | Regulatory compliance records                 |
| **Breach Notification Records**     | 3 years minimum                                        | GDPR Art. 33-34                                | Required by Italian authorities               |
| **Tax/Administrative Records**      | 7 years                                                | Italian tax law (D.P.R. 600/1973)              | Financial transaction records                 |
| **Audit Trails**                    | 1 year (detailed) + 3 years (summary)                  | ADR 0075 (audit requirements)                  | Detailed logs 1 year, then archive            |

**Special Cases - Italy**:

- **COPPA** (US children): If applicable, delete at 13 (US law takes precedence)
- **Health Data** (learning disabilities): Treat as special category; retention limited to service delivery + 6 months
- **Deletion Request Response**: 30 days (stricter than GDPR's "without undue delay")

---

### UK (UK GDPR + Data Protection Act 2018 + Age Appropriate Design Code)

**Authority**: Information Commissioner's Office (ICO)

#### Retention Periods

| Data Category                    | Retention Period                 | Legal Basis                                | Notes                                    |
| -------------------------------- | -------------------------------- | ------------------------------------------ | ---------------------------------------- |
| **Student Profile Data**         | Until graduation + 2 years       | UK GDPR Art. 17(3)(a)                      | Aligned with EU standard                 |
| **Parent/Guardian Contact Info** | Until student age 18 + 1 year    | UK GDPR Art. 6 (legitimate interest)       | Contact for withdrawal of consent        |
| **Parental Consent Records**     | Until age 18 + 3 years           | UK GDPR Art. 13 (information disclosure)   | Evidence of lawful processing            |
| **Educational Content**          | Until graduation + 6 months      | UK GDPR Art. 5(1)(e)                       | Student data portability right           |
| **Learning Interaction Logs**    | 6 months (then anonymize)        | UK GDPR Art. 32 (pseudonymization)         | DPA 2018 encourages anonymization        |
| **Age Appropriate Design Logs**  | 1 year                           | Age Appropriate Design Code (ICO guidance) | Compliance with children's privacy rules |
| **Data Subject Rights Requests** | 3 years                          | UK GDPR Art. 12-22 (audit trail)           | Proof of request handling                |
| **Breach Notification Records**  | 3 years minimum                  | UK GDPR Art. 33-34, DPA 2018 Section 170   | Criminal liability threshold             |
| **Audit Trails**                 | 1 year detailed, 3 years summary | DPA 2018, Schedule 1                       | ICO audit requirements                   |

**Special Cases - UK**:

- **Children Under 13**: Consider parental consent withdrawal expiry (treat as termination date)
- **Right to Access (Art. 15)**: Must provide copy within 1 month; retain request proof 1 year
- **Data Portability (Art. 20)**: Retain request + export for 1 year as evidence
- **School Records**: If MirrorBuddy acts as a school processor, educational records may have longer retention (check school policy)

---

### GERMANY (GDPR + BDSG + TTDSG)

**Authority**: Bundesdatenschutzbeauftragte (BfDI - Federal Data Protection Commissioner)

#### Retention Periods

| Data Category                     | Retention Period                  | Legal Basis                             | Notes                                               |
| --------------------------------- | --------------------------------- | --------------------------------------- | --------------------------------------------------- |
| **Student Profile Data**          | Until graduation + 2 years        | GDPR Art. 17(3)(a), BDSG §3             | German standard: conservative approach              |
| **Parent/Guardian Contact Info**  | Until age 18 + 2 years            | GDPR Art. 6(1)(f) (legitimate interest) | Parental notification rights                        |
| **Parental Consent Records**      | Until age 18 + 5 years            | BDSG §22 (documentation requirement)    | German law stricter on proof retention              |
| **Educational Data**              | Until graduation + 6 months       | GDPR Art. 5(1)(e), BDSG §4              | Schulgesetze (school laws) vary by state            |
| **Processing Activity Records**   | 2 years minimum                   | BDSG §5 (record-keeping)                | Processing documentation (Verarbeitungsverzeichnis) |
| **Data Subject Rights Responses** | 3 years                           | GDPR Art. 12-22, BDSG §5                | Proof of rights handling                            |
| **AI Processing Logs**            | 3 years                           | BDSG §22 (special categories)           | Health/learning disability data                     |
| **Breach Notifications**          | 5 years                           | BDSG §25, GDPR Art. 33-34               | German emphasis on long retention                   |
| **Audit Trails**                  | 2 years detailed, 5 years summary | NIS 2 Directive (transposed 2024)       | Cybersecurity incident response                     |

**Special Cases - Germany**:

- **BDSG §22 (Special Categories)**: Learning disabilities = health data; requires explicit consent + 5-year retention of consent records
- **School/University Data**: If serving educational institutions, institutional records may supersede GDPR (Schulgesetze vary by Bundesland - state)
- **Data Minimization (BDSG §3)**: German DPA stricter on what data can be collected initially

---

### SPAIN (GDPR + LOPDGDD + AEPD Guidance)

**Authority**: Autoridad de Protección de Datos Personales (AEPD - Spanish Data Protection Authority)

#### Retention Periods

| Data Category                    | Retention Period                 | Legal Basis                           | Notes                                    |
| -------------------------------- | -------------------------------- | ------------------------------------- | ---------------------------------------- |
| **Student Profile Data**         | Until graduation + 2 years       | GDPR Art. 17(3)(a), LOPDGDD Art. 5    | Spanish educational standard             |
| **Parent/Guardian Contact Info** | Until age 18                     | GDPR Art. 6, LOPDGDD Art. 6           | Stricter than some EU countries          |
| **Parental Consent Records**     | Until age 18 + 3 years           | LOPDGDD Art. 5 (evidence requirement) | Spanish enforcement emphasis             |
| **Educational Content/Records**  | Until graduation + 6 months      | LOPDGDD Art. 5(e)                     | Spanish student transcript law           |
| **Learning History/Assessments** | 1 year post-graduation           | AEPD guidance (2023)                  | Subject to school record retention rules |
| **Data Subject Requests**        | 1 year                           | GDPR Art. 12-22                       | AEPD requires proof of response          |
| **Breach/Incident Records**      | 3 years                          | GDPR Art. 33-34, LOPDGDD Art. 72      | AEPD scrutiny of incident handling       |
| **Audit Trails**                 | 1 year detailed, 3 years summary | LOPDGDD Art. 5 (accountability)       | Spanish interpretation more detailed     |

**Special Cases - Spain**:

- **LOPDGDD Art. 5**: Spanish GDPR implementation is strict on retention - "minimum necessary"
- **AEPD Guidance**: Recommends quarterly review of retained data
- **Educational Records Law**: Spanish law (Ley 3/1991) may require longer school records; coordinate with schools

---

### FRANCE (GDPR + Loi Informatique + CNIL Guidance)

**Authority**: Commission Nationale de l'Informatique et des Libertés (CNIL - French Data Protection Authority)

#### Retention Periods

| Data Category                    | Retention Period                 | Legal Basis                                        | Notes                                         |
| -------------------------------- | -------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| **Student Profile Data**         | Until graduation + 2 years       | GDPR Art. 17(3)(a), Loi Informatique Art. L. 221-1 | French standard: balanced approach            |
| **Parent/Guardian Contact Info** | Until age 18 or withdrawal       | GDPR Art. 6, Loi Informatique                      | CNIL guidance: flexible on consent withdrawal |
| **Parental Consent Records**     | Until age 18 + 1 year            | Loi Informatique Art. L. 221-3                     | French GDPR implementation                    |
| **Educational Content**          | Until graduation + 1 year        | GDPR Art. 5(1)(e), Loi Informatique                | CNIL: shorter retention than Germany          |
| **AI Processing Records**        | 2 years                          | Loi Informatique Art. L. 221-5 (AI transparency)   | French AI transparency law (2021)             |
| **CNIL Compliance Records**      | 1 year                           | CNIL guidance (2023-2024 updates)                  | Compliance documentation                      |
| **Data Subject Rights Requests** | 1 year                           | GDPR Art. 12-22, Loi Informatique                  | CNIL strict on rights handling proof          |
| **Breach Notifications**         | 3 years                          | GDPR Art. 33-34, Loi Informatique Art. L. 221-8    | CNIL requires detailed incident logs          |
| **Audit Trails**                 | 1 year detailed, 3 years summary | Loi Informatique Art. L. 221-1 (accountability)    | French emphasis on transparency               |

**Special Cases - France**:

- **CNIL Guidance (2024)**: Recommends 18-month retention for educational platforms (flexible interpretation)
- **Loi Informatique Art. L. 221-5**: AI systems must log all decisions; retain 2 years minimum
- **GDPR+ Amendment (France)**: French law slightly more lenient than stricter EU interpretations; balance with EU standards

---

## 2. Data Categories & Retention Matrix

### Quick Reference Table (All Countries)

| Data Type               | IT   | UK   | DE     | ES     | FR     | Notes                         |
| ----------------------- | ---- | ---- | ------ | ------ | ------ | ----------------------------- |
| Student Profile         | 2y+  | 2y+  | 2y+    | 2y+    | 2y+    | Post-graduation               |
| Parent Contact          | 18y+ | 18y  | 18y+   | 18y    | 18y    | Until majority + grace period |
| Consent Records         | 18y+ | 18y+ | 18y+5y | 18y+3y | 18y+1y | Proof of lawful basis         |
| Educational Content     | 1y   | 6m   | 6m     | 6m     | 1y     | Student transcript            |
| Interaction Logs        | 6m   | 6m   | varies | varies | varies | Anonymize after period        |
| AI/Safety Logs          | 3y   | 3y   | 3y     | 3y     | 2y     | Regulatory requirement        |
| Breach Records          | 3y   | 3y   | 5y     | 3y     | 3y     | Authority audit trail         |
| Audit Trails (detailed) | 1y   | 1y   | 2y     | 1y     | 1y     | Then archive                  |
| Audit Trails (summary)  | 3y   | 3y   | 5y     | 3y     | 3y     | Long-term compliance          |

**Legend**: `y` = years; `y+` = year(s) after event; `m` = months

---

## 3. Deletion Procedures

### General Process

1. **Identify Expiration**: Check country-specific retention schedule (Section 1)
2. **Generate Deletion List**: Query database for records with expiration date < today
3. **Verify Non-Essential**: Confirm data is not subject to exemptions (legal obligation, dispute, etc.)
4. **Execute Deletion**: Remove from primary database + backups (if feasible)
5. **Log & Audit**: Record deletion in audit trail with timestamp, reason, and count
6. **Notify (if applicable)**: Inform data subject if deletion was requested

### Timeline Compliance

| Action                             | Timeframe              | Requirement                                                    |
| ---------------------------------- | ---------------------- | -------------------------------------------------------------- |
| **Data Subject Requests Deletion** | Immediate (next batch) | Process within timeframe (30 days IT, 1 month others)          |
| **Automatic Expiration**           | Quarterly review       | Run deletion jobs every 3 months                               |
| **Ad-Hoc Deletions**               | As requested           | Handle parent/student deletion requests within legal timeframe |
| **Breach/Incident Records**        | Per legal retention    | Delete after country-specific period (3-5 years)               |

### Technical Implementation

**Deletion API Endpoint**: `DELETE /api/privacy/delete-data`

```typescript
// Request
POST /api/privacy/delete-data
{
  "userId": "student-123",
  "country": "IT",  // 2-letter country code
  "reason": "user_request" | "expiration" | "account_closure",
  "deleteAllData": true,
  "verifyDeletion": true
}

// Response
{
  "status": "deleted",
  "recordsDeleted": 245,
  "deletionId": "del-2026-01-27-12345",
  "completedAt": "2026-01-27T12:34:56Z",
  "auditTrailEntry": {
    "timestamp": "2026-01-27T12:34:56Z",
    "reason": "user_request",
    "country": "IT",
    "recordsAffected": 245,
    "dataCategories": ["profile", "logs", "consent"]
  }
}
```

**Retention Audit Job**: Runs quarterly (cron: `0 3 1 */3 *`)

```bash
npm run retention:audit          # Verify all records comply
npm run retention:delete         # Execute deletions
npm run retention:report         # Generate compliance report
```

---

## 4. Special Cases & Exemptions

### Legal Obligations That Override Deletion

| Obligation                   | Retention Period            | Jurisdiction            | Example                    |
| ---------------------------- | --------------------------- | ----------------------- | -------------------------- |
| **Tax Records**              | 7 years                     | Italy (D.P.R. 600/1973) | If processing payments     |
| **Accounting Records**       | 7 years                     | All (EU standard)       | Financial transaction logs |
| **Legal Disputes**           | Until resolution + 1 year   | All                     | Retain if lawsuit pending  |
| **Regulatory Investigation** | Until closure               | All                     | GDPR breach investigation  |
| **Criminal Evidence**        | Per law enforcement request | All                     | Court order override       |

### Data Subject Rights Requests

When a user/parent requests deletion:

1. **Timeline**: Process within country-specific timeframe (30 days IT, 1 month others)
2. **Verification**: Confirm identity (email + password or parental proof)
3. **Exceptions Notification**: Inform if some data cannot be deleted due to legal obligation
4. **Confirmation**: Send deletion confirmation with audit trail ID
5. **Verification**: After deletion, confirm record actually removed + sent to data subject

---

## 5. Compliance Verification & Audit

### Quarterly Audit Checklist

**Every 3 months**, verify:

```bash
# 1. Run retention audit
sqlite3 mirrorbuddy.db \
  "SELECT COUNT(*) FROM users WHERE DATEDIFF(NOW(), updated_at) > CASE country WHEN 'IT' THEN 730 ELSE 730 END AND status != 'active';"

# 2. Check deletion logs
SELECT COUNT(*) FROM deletion_audit_log WHERE deleted_at > DATE_SUB(NOW(), INTERVAL 3 MONTH);

# 3. Verify backup retention aligns with deletion
# (Check with infrastructure team)

# 4. Generate compliance report
npm run retention:report --format=csv --country=IT,UK,DE,ES,FR
```

### Annual Compliance Certification

**Each January**, document:

- [x] Retention schedules reviewed and updated
- [x] All country-specific rules checked against latest guidance
- [x] Audit logs show quarterly deletion runs
- [x] Zero data older than legal max (with documented exemptions)
- [x] Data Subject Rights requests processed within timeframe
- [x] Deletion request logs maintained for 3 years
- [x] Backup/recovery procedures align with retention policy

---

## 6. Country-Specific Implementation Details

### Italy (D.Lgs 196/2003, L.132/2025)

**Key References**:

- Garante della Privacy 2024 Guidelines: https://www.garanteprivacy.it
- School Data Protection (2024): Retention 1-2 years post-graduation
- AI Transparency: `docs/compliance/countries/italy/data-protection.md`

**Implementation**:

- Parental consent withdrawal: Automatic deletion within 30 days
- Educational records: Archive (anonymized) after 2 years
- Breach logs: Mandatory 3-year retention per Garante guidance

---

### UK (Age Appropriate Design Code)

**Key References**:

- ICO Age Appropriate Design Code: https://ico.org.uk/for-organisations/children
- Information Commissioner's Office: https://ico.org.uk
- UK GDPR: https://ico.org.uk/for-organisations/guide-to-data-protection

**Implementation**:

- Children <13: Enhanced deletion protections
- Parental consent: Store & verify for 3 years
- Data portability: Retain export logs 1 year for audit

---

### Germany (BDSG § Sections 22, 25)

**Key References**:

- BfDI Guidance on Children: https://www.bfdi.bund.de
- BDSG (Bundesdatenschutzgesetz): Section 22 (special categories)
- NIS 2 Directive (transposed 2024): 2-year audit trail

**Implementation**:

- Learning disability data: Treat as health data; 5-year consent record retention
- Processing records: 2-year detailed logs, then 5-year summary
- School data: Coordinate with Schulgesetze (state education laws)

---

### Spain (LOPDGDD, AEPD Guidance)

**Key References**:

- AEPD: https://www.aepd.es
- LOPDGDD (Ley Orgánica de Protección de Datos): https://www.aepd.es/normativa
- AEPD Guidance on Educational Platforms (2023): https://www.aepd.es/

**Implementation**:

- Quarterly data review recommended by AEPD
- Parental consent: Store 3 years minimum
- Student records: Coordinate with school retention laws

---

### France (Loi Informatique, CNIL Guidance)

**Key References**:

- CNIL: https://www.cnil.fr
- Loi Informatique et Libertés: https://www.cnil.fr/en/topic/legislation
- CNIL 2024 Educational Platform Guidance: https://www.cnil.fr/

**Implementation**:

- CNIL-compliant AI logging: 2 years minimum for AI decision trails
- Flexibility: CNIL allows 18-month retention for educational data (vs. 2 years elsewhere)
- Consent withdrawal: Automatic deletion within 30 days per CNIL guidance

---

## 7. Configuration & Automation

### TypeScript Configuration

See: `src/lib/compliance/data-retention-config.ts` for programmatic retention periods and automation.

### API Endpoints

- **POST /api/privacy/delete-data** - User/parent-initiated deletion
- **GET /api/privacy/deletion-status/{deletionId}** - Check deletion progress
- **GET /api/admin/compliance/retention-audit** - Generate compliance report
- **POST /api/cron/retention-cleanup** - Automated quarterly cleanup (secured with CRON_SECRET)

---

## 8. References & Legal Compliance

### Primary Legal Sources

- **GDPR** (Regulation EU 2016/679): Article 5(1)(e) (Storage Limitation), Articles 17, 33-34
- **Italy**: D.Lgs 196/2003, D.Lgs 101/2018, L.132/2025
- **UK**: UK GDPR (retained EU law), Data Protection Act 2018, Age Appropriate Design Code
- **Germany**: BDSG (Bundesdatenschutzgesetz), TTDSG, NIS 2 Directive (2024)
- **Spain**: LOPDGDD (Ley Orgánica 3/2018), AEPD guidance
- **France**: Loi Informatique et Libertés (updated 2024), CNIL guidance

### MirrorBuddy Documentation

- `docs/compliance/DPIA.md` - Data Protection Impact Assessment
- `docs/compliance/countries/italy/data-protection.md` - Italian legal framework
- `docs/compliance/countries/uk/data-protection.md` - UK legal framework
- `docs/compliance/countries/germany/data-protection.md` - German legal framework
- `docs/compliance/countries/spain/data-protection.md` - Spanish legal framework
- `docs/compliance/countries/france/data-protection.md` - French legal framework

---

**Document Version**: 1.0 | **Created**: January 2026 | **Next Review**: April 2026

**Owner**: Compliance & Legal Team | **Status**: Active
