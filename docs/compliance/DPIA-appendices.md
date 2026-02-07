# DPIA Appendices

## MirrorBuddy Data Protection Impact Assessment

**Date**: 20 January 2026 | **Assessment ID**: DPIA-MB-2026-001-APPENDICES

---

## APPENDIX A: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MIRRORBUDDY DATA FLOW                      │
└─────────────────────────────────────────────────────────────────┘

STEP 1: REGISTRATION
─────────────────────
  User (age) → Privacy Notice → Consent Check
         ↓
    Age < 16 (Italy) or < 13 (COPPA)?
         ↓
    YES: Request parent email
         ↓
    Send verification email with code (48-hour expiry)
         ↓
    Parent verifies → CoppaConsent record created
         ↓
    NO: User registered directly
         ↓
    Profile stored: {userId, name, age, school level, accessibility}


STEP 2: CONVERSATION INITIATION
────────────────────────────────
  Student input → Session validation (`src/lib/auth/`)
         ↓
    Jailbreak detector (`src/lib/safety/jailbreak-detector.ts`)
         ↓
    Content filter check (`src/lib/safety/content-filter.ts`)
         ↓
    Accessibility profile applied (`src/lib/accessibility/`)
         ↓
    → Azure OpenAI API (with system prompt + knowledge base)


STEP 3: RESPONSE PROCESSING
────────────────────────────
  AI Response received from Azure
         ↓
    Output sanitizer (`src/lib/safety/output-sanitizer.ts`)
         ↓
    Age-gating check (`src/lib/safety/age-gating.ts`)
         ↓
    Content filter check (response)
         ↓
    Safety indicator applied (`src/lib/safety/ui/`)
         ↓
    → Send to student display


STEP 4: LOGGING & AUDIT
────────────────────────
  All access logged (PII-redacted):
    - Timestamp
    - User ID (masked)
    - Operation (conversation, profile access)
    - Safety flags (jailbreak detected, age-gated, etc.)
         ↓
    Stored in audit trail: `src/lib/safety/audit/audit-trail-service.ts`
         ↓
    Retention: 90 days
         ↓
    Monitoring for violations: `src/lib/safety/monitoring/`


STEP 5: DATA SUBJECT ACCESS
──────────────────────────────
  User request: GET /api/privacy/delete-my-data
         ↓
    Returns: Profile + conversations + accessibility settings + audit summary
         ↓
  User request: POST /api/privacy/delete-my-data (with confirmation)
         ↓
    Cascade delete: Profile → Conversations → Preferences
         ↓
    Grace period: 30 days before permanent deletion
         ↓
    Audit: Deletion event logged (no PII)
```

---

## APPENDIX B: Reference Implementation Files

### Safety Layer (5 Defenses)

- `src/lib/safety/safety-core.ts` - Main orchestrator
- `src/lib/safety/jailbreak-detector.ts` - Prompt injection detection
- `src/lib/safety/jailbreak-patterns.ts` - Known attack patterns
- `src/lib/safety/content-filter.ts` - Harm pattern matching
- `src/lib/safety/content-filter-patterns.ts` - Content classification
- `src/lib/safety/output-sanitizer.ts` - Response sanitization
- `src/lib/safety/output-sanitizer-patterns.ts` - Sanitization rules
- `src/lib/safety/age-gating.ts` - Topic age-restriction
- `src/lib/safety/age-gating-matrix.ts` - Subject→age mapping

### Audit & Monitoring

- `src/lib/safety/audit/audit-trail-service.ts` - Access logging
- `src/lib/safety/audit/knowledge-auditor.ts` - Knowledge base auditing
- `src/lib/safety/monitoring/logging.ts` - Structured logging
- `src/lib/safety/monitoring/violation-tracker.ts` - Violation detection
- `src/lib/safety/monitoring/violation-callback.ts` - Escalation
- `src/lib/safety/versioning/jailbreak-flagging.ts` - Attack patterns

### Compliance Layer

- `src/lib/compliance/coppa-service.ts` - Parental consent workflow
- `src/lib/auth/validateSessionAuth.ts` - Session validation
- `src/app/api/privacy/delete-my-data/route.ts` - GDPR erasure endpoint
- `src/app/api/privacy/delete-my-data/helpers.ts` - Cascade deletion logic

### Accessibility Layer (7 DSA Profiles)

- `src/lib/accessibility/index.ts` - Zustand store + profile management
- `src/lib/accessibility/a11y-cookie-storage.ts` - 90-day persistence
- `src/lib/accessibility/browser-detection.ts` - OS preference detection
- `src/components/accessibility/a11y-floating-button.tsx` - 44×44px trigger
- `src/components/accessibility/a11y-quick-panel.tsx` - Settings panel

### Database Schema

- `prisma/schema.prisma` - Core models:
  - `Profile` (user demographics)
  - `CoppaConsent` (parental consent record)
  - `Conversation` (chat history)
  - `AuditLog` (access logging)

---

## APPENDIX C: Regulatory Compliance Map

### GDPR 2016/679 (EU)

| Article | Topic                                                                       | MirrorBuddy Implementation                                                                                   |
| ------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 5       | Principles (lawfulness, fairness, transparency, integrity, confidentiality) | Data minimization (only name, age, preferences); transparent privacy notice; TLS + AES-256 encryption        |
| 6       | Legal basis (lawfulness of processing)                                      | Consent (Art 6(1)(a)) + contract (Art 6(1)(b)) + legitimate interest (Art 6(1)(f)) for safety                |
| 8       | Consent of minors                                                           | Parental consent required for under-16 (Italy) + under-13 (COPPA US); documented in CoppaConsent table       |
| 9       | Special categories (health data)                                            | Accessibility profiling is consent-based; no automatic processing; user control via character intensity dial |
| 13      | Information to be provided                                                  | Privacy notice in-app + email + signup form; linked from every page                                          |
| 14      | Information where not provided                                              | N/A (direct collection from user)                                                                            |
| 15      | Right of access                                                             | Endpoint: `GET /api/privacy/delete-my-data` → returns profile + conversations                                |
| 16      | Right to rectification                                                      | Settings UI allows user to edit profile, accessibility, preferences                                          |
| 17      | Right to erasure                                                            | Endpoint: `POST /api/privacy/delete-my-data` → cascade delete + 30-day grace                                 |
| 18      | Right to restrict                                                           | Planned (T1-04) - Restrict AI tutoring while retaining data                                                  |
| 20      | Right to portability                                                        | Planned (T1-04) - Export as JSON/CSV                                                                         |
| 32      | Security of processing                                                      | Encryption (TLS 1.3 + AES-256), access controls, audit logging                                               |
| 35      | DPIA requirement                                                            | This document (Sections 1-11)                                                                                |
| 37      | DPO designation                                                             | Interim DPO designated: Roberto D'Angelo (roberdan@fightthestroke.org)                                       |

### AI Act 2024/1689 (EU)

| Article | Topic                     | MirrorBuddy Implementation                                                              |
| ------- | ------------------------- | --------------------------------------------------------------------------------------- |
| 9       | Risk management system    | 5-layer safety defense (jailbreak, content filter, output sanitizer, age-gating, audit) |
| 11      | Human oversight           | Character intensity dial + monitoring dashboard (planned T1-02)                         |
| 29      | Transparency & disclosure | Safety indicator in UI (`src/lib/safety/ui/safety-indicator-service.ts`)                |
| 32      | Bias monitoring           | Age-gating prevents exposure to age-inappropriate content                               |

### Italian Law L.132/2025 (Data Protection)

| Article   | Topic                         | MirrorBuddy Implementation                                     |
| --------- | ----------------------------- | -------------------------------------------------------------- |
| 3         | Special protection for minors | Dual consent model + parental access + limited data collection |
| (implied) | Accessibility rights          | 7 DSA profiles + WCAG 2.1 AA compliance                        |
| (implied) | Educational data              | Conversation data stored in PostgreSQL + 30-day deletion grace |

### COPPA Rule (16 CFR 312, USA)

| Section  | Requirement                      | MirrorBuddy Implementation                                    |
| -------- | -------------------------------- | ------------------------------------------------------------- |
| 312.2    | Children's online privacy notice | Privacy notice provided before registration                   |
| 312.5(b) | Verifiable parental consent      | Email verification with 6-char code (48-hour expiry)          |
| 312.5(c) | Denial of services               | Cannot access if under-13 without parental consent            |
| 312.7    | Parental request methods         | Email + in-app settings (phone support not currently offered) |

### WCAG 2.1 (Accessibility)

| Level | Requirement          | MirrorBuddy Implementation                                |
| ----- | -------------------- | --------------------------------------------------------- |
| AA    | Contrast (4.5:1 min) | 7 DSA profiles include high contrast option               |
| AA    | Keyboard navigation  | All features accessible via Tab + Enter + Escape          |
| AA    | Focus indicators     | Visible focus on all interactive elements                 |
| AA    | Motion/animation     | Respects `prefers-reduced-motion` (Autism profile)        |
| AA    | Text zoom (200%)     | Responsive design supports 200% without horizontal scroll |
| AA    | Text alternatives    | Maestro avatars have alt text                             |

---

## APPENDIX D: Key Dates & Milestones

| Date        | Event                                     | Status    |
| ----------- | ----------------------------------------- | --------- |
| 20 Jan 2026 | DPIA completed                            | DONE      |
| Q1 2026     | Human escalation pathway (T1-02)          | PLANNED   |
| Q1 2026     | Complete COPPA email verification (T1-03) | PLANNED   |
| Q2 2026     | Data Subject Rights Dashboard (T1-04)     | PLANNED   |
| 20 Jan 2027 | Annual DPIA review                        | SCHEDULED |
| 20 Apr 2026 | Quarterly risk assessment                 | SCHEDULED |

---

## APPENDIX E: Contact Information

| Role               | Contact                                                  | Function                      |
| ------------------ | -------------------------------------------------------- | ----------------------------- |
| Data Controller    | MirrorBuddy Team                                         | Responsible for DPIA accuracy |
| DPO (Interim)      | Roberto D'Angelo (Interim) — roberdan@fightthestroke.org | Oversee GDPR compliance       |
| Privacy Team       | roberdan@fightthestroke.org                              | Data subject requests         |
| Security Team      | roberdan@fightthestroke.org                              | Breach reporting              |
| Accessibility Lead | roberdan@fightthestroke.org                              | DSA profile support           |

---

**Document Status**: FINAL | **Approval**: Data Protection Officer + Legal Team
