# Architecture Diagrams Checklist

This checklist defines ALL required sections in `ARCHITECTURE-DIAGRAMS.md`.
Validated by `scripts/check-architecture-diagrams.sh` during release.

**Version**: 2.0.0
**Last Updated**: 2026-01-26

---

## Main Sections (25 required)

| Section | Title                 | Must Have Mermaid | Required |
| ------- | --------------------- | ----------------- | -------- |
| 1       | System Overview       | Yes               | YES      |
| 2       | Tech Stack Layers     | Yes               | YES      |
| 3       | Database Schema       | Yes               | YES      |
| 4       | Authentication Flow   | Yes               | YES      |
| 5       | Conversation Engine   | Yes               | YES      |
| 6       | Channel: Chat         | Yes               | YES      |
| 7       | Channel: Voice        | Yes               | YES      |
| 8       | Character System      | Yes               | YES      |
| 9       | Tool Execution        | Yes               | YES      |
| 10      | RAG System            | Yes               | YES      |
| 11      | Tier and Subscription | Yes               | YES      |
| 12      | Trial Mode            | Yes               | YES      |
| 13      | Invite System         | Yes               | YES      |
| 14      | CI/CD Pipeline        | Yes               | YES      |
| 15      | Git Hooks             | Yes               | YES      |
| 16      | Cron Jobs             | Yes               | YES      |
| 17      | API Routes            | Yes               | YES      |
| 18      | Accessibility System  | Yes               | YES      |
| 19      | Compliance and Safety | Yes (21 sub)      | YES      |
| 20      | Observability         | Yes               | YES      |
| 21      | External Integrations | Yes               | YES      |
| 22      | Component Structure   | Yes               | YES      |
| 23      | State Management      | Yes               | YES      |
| 24      | Deployment Flow       | Yes               | YES      |
| 25      | ADR Index             | Yes               | YES      |

---

## Compliance Subsections (21 required in Section 19)

### GDPR Compliance (8 sections)

| Section | Title                | GDPR Article | Required |
| ------- | -------------------- | ------------ | -------- |
| 19.2    | Compliance Framework | Overview     | YES      |
| 19.4    | GDPR Data Lifecycle  | Art. 5,6,17  | YES      |
| 19.5    | User Rights          | Art. 15-22   | YES      |
| 19.6    | Consent Management   | Art. 7       | YES      |
| 19.7    | Consent Categories   | Art. 7       | YES      |
| 19.13   | Audit Trail          | Art. 30      | YES      |
| 19.14   | Breach Notification  | Art. 33-34   | YES      |
| 19.16   | DSAR Response SLA    | Art. 12      | YES      |

### COPPA Compliance (3 sections)

| Section | Title             | Requirement      | Required |
| ------- | ----------------- | ---------------- | -------- |
| 19.3    | COPPA Flow        | Age < 13         | YES      |
| 19.8    | Parent Dashboard  | Parent oversight | YES      |
| 19.9    | Parent-Minor Link | Consent mgmt     | YES      |

### EU AI Act Compliance (4 sections)

| Section | Title             | AI Act Article | Required |
| ------- | ----------------- | -------------- | -------- |
| 19.1    | Five-Layer Safety | Art. 9, 15     | YES      |
| 19.10   | AI Act Compliance | Art. 6-15      | YES      |
| 19.11   | Human Oversight   | Art. 14        | YES      |
| 19.12   | AI Explainability | Art. 13        | YES      |

### Additional Compliance (6 sections)

| Section | Title               | Regulation       | Required |
| ------- | ------------------- | ---------------- | -------- |
| 19.15   | Third-Party Data    | GDPR Art. 28     | YES      |
| 19.17   | Age Gating          | COPPA + L.132    | YES      |
| 19.18   | Incident Response   | GDPR Art. 32     | YES      |
| 19.19   | Severity Matrix     | Best practice    | YES      |
| 19.20   | Compliance Calendar | GDPR Art. 35(11) | YES      |
| 19.21   | Checklist Summary   | Overview         | YES      |

---

## Required ADRs (14 core)

These ADRs MUST be referenced in Section 25 (ADR Index):

| ADR  | Name               | Category   |
| ---- | ------------------ | ---------- |
| 0004 | Safety Guardrails  | Safety     |
| 0008 | Parent Dashboard   | Compliance |
| 0015 | State Management   | Data       |
| 0028 | Database Schema    | Data       |
| 0031 | Embedded Knowledge | AI         |
| 0033 | RAG System         | Data       |
| 0056 | Trial Mode         | Business   |
| 0057 | Invite System      | Business   |
| 0062 | AI Compliance      | Compliance |
| 0063 | Supabase SSL       | Infra      |
| 0064 | Greeting System    | AI         |
| 0071 | Tier Subscription  | Business   |
| 0073 | Model Selection    | AI         |
| 0075 | Cookie Standards   | Security   |

---

## Validation Script

```bash
# Run comprehensive check
./scripts/check-architecture-diagrams.sh

# Output includes:
# - 25 main sections check
# - 21 compliance subsections check
# - Mermaid diagram count (min 40)
# - Required ADR references
# - Unreferenced ADR warnings (non-blocking)
```

---

## Future-Proofing

The script auto-detects:

- New main sections beyond 25 → warns to update EXPECTED_SECTIONS
- New compliance sections beyond 19.21 → warns to update COMPLIANCE_EXPECTED
- New ADRs in docs/adr/ not referenced → warns (non-blocking)

**When adding new sections**:

1. Add the section to ARCHITECTURE-DIAGRAMS.md
2. Update the script constants if needed
3. Run check to verify

---

## Integration

Validated by:

1. `scripts/check-architecture-diagrams.sh` - Standalone check
2. `release-brutal.sh` Phase 7 - Release gate (arch-diagrams check)
3. `/release` command - Full release validation

**Blocking**: YES - Release is blocked if main sections or compliance sections are missing.
