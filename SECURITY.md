# Security Policy

## Overview

MirrorBuddy is an AI-powered educational platform designed for students with learning differences (dyslexia, ADHD, autism, cerebral palsy). Given our vulnerable user base of minors, security and privacy are paramount concerns.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.15.x  | :white_check_mark: |
| < 0.15  | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously, especially given our commitment to protecting student data.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report vulnerabilities through one of these channels:

1. **GitHub Security Advisories** (Preferred): Use the "Report a vulnerability" button in the Security tab of this repository
2. **Email**: Send details to security@convergio.io

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fixes (optional)

### Response Timeline

| Action                      | Timeline                    |
| --------------------------- | --------------------------- |
| Initial acknowledgment      | Within 48 hours             |
| Preliminary assessment      | Within 5 business days      |
| Status update               | Every 7 days until resolved |
| Fix deployment (critical)   | Within 72 hours             |
| Fix deployment (high)       | Within 14 days              |
| Fix deployment (medium/low) | Within 30 days              |

## Security Measures

### Data Protection

- **Student Data**: All personally identifiable information (PII) is encrypted at rest and in transit
- **GDPR Compliance**: Full compliance with GDPR for EU users, including data export and deletion rights
- **Unified Deletion**: Single `executeUserDataDeletion()` for all 20+ tables with audit trail
- **Token Revocation**: Google OAuth tokens revoked before database deletion
- **Data Minimization**: We collect only data necessary for educational functionality
- **No Third-Party Sharing**: Student data is never sold or shared with third parties for advertising
- **COPPA Compliance**: Email verification (6-digit codes) for parental consent of children under 13
- **Data Breach Protocol**: Documented runbook at `docs/security/DATA-BREACH-PROTOCOL.md`

### Authentication & Authorization (ADR 0080)

- Secure session management with httpOnly cookies
- Role-based access control (RBAC)
- **OAuth PKCE** (RFC 7636): code_verifier/code_challenge with SHA-256
- **Signed State**: HMAC-SHA256 signature with 10-minute expiry
- **Token Encryption**: AES-256-GCM encryption at rest for OAuth tokens
- CSRF protection with cookie signing (HMAC-SHA256)

### Rate Limiting

| Endpoint           | Limit        | Purpose                     |
| ------------------ | ------------ | --------------------------- |
| Login              | 5 req/15 min | Brute force prevention      |
| Password Change    | 3 req/15 min | Account takeover prevention |
| OAuth              | 10 req/min   | Token abuse prevention      |
| Invite Requests    | 3 req/hour   | Public endpoint protection  |
| COPPA Verification | 5 req/hour   | Email abuse prevention      |
| General API        | 60 req/min   | DDoS mitigation             |

### Infrastructure

- HTTPS enforced on all endpoints
- Content Security Policy (CSP) headers with nonces for inline scripts
- XSS protection headers
- **SVG Sanitization**: DOMPurify for Mermaid diagram output
- SQL injection prevention through parameterized queries (Prisma ORM)
- **Supabase SSL**: Explicit CA certificate verification in production (ADR 0063)

### AI Safety

- AI tutors (Maestros) have strict guardrails preventing inappropriate content
- All AI interactions are logged for safety review
- Content filtering for harmful or inappropriate requests
- AI responses are monitored for quality and safety

### Accessibility Security

- Screen reader compatible interfaces don't expose sensitive data
- Keyboard navigation doesn't bypass security controls
- Accessibility features maintain same security standards

## Scope

### In Scope

- MirrorBuddy web application (this repository)
- API endpoints under `/api/*`
- Authentication and session management
- Student data handling
- AI tutor interactions
- Voice session security (Azure Realtime API integration)

### Out of Scope

- Third-party services (Azure, Vercel, etc.) - report directly to them
- Social engineering attacks
- Physical security
- Denial of Service (DoS) attacks
- Issues in dependencies - report to the respective maintainers

## Security Best Practices for Contributors

1. **Never commit secrets**: Use environment variables, never hardcode API keys
2. **Validate all input**: Both client and server-side validation required
3. **Use parameterized queries**: Never concatenate user input into SQL
4. **Sanitize output**: Escape user-generated content before rendering
5. **Keep dependencies updated**: Run `npm audit` regularly
6. **Follow OWASP Top 10**: All code must be OWASP compliant

## Vulnerability Disclosure Policy

We follow a coordinated disclosure approach:

1. Reporter submits vulnerability privately
2. We acknowledge and assess the report
3. We develop and test a fix
4. We deploy the fix to production
5. We notify the reporter of resolution
6. After 90 days (or fix deployment, whichever is first), details may be publicly disclosed

## Recognition

We appreciate security researchers who help keep MirrorBuddy safe. With your permission, we will:

- Acknowledge your contribution in our release notes
- Add you to our Security Hall of Fame (coming soon)

## Contact

- Security issues: security@convergio.io
- General inquiries: info@convergio.io
- Privacy concerns: privacy@convergio.io

## Regulatory Compliance

MirrorBuddy complies with multiple regulatory frameworks:

| Regulation                | Scope                      | Documentation                           |
| ------------------------- | -------------------------- | --------------------------------------- |
| **EU AI Act** (2024/1689) | High-risk AI in education  | `docs/compliance/AI-POLICY.md`          |
| **Italian L.132/2025**    | National AI implementation | `docs/compliance/AI-RISK-MANAGEMENT.md` |
| **GDPR**                  | Data protection            | `docs/compliance/DPIA.md`               |
| **COPPA**                 | Children's privacy (US)    | COPPA service in `src/lib/compliance/`  |
| **WCAG 2.1 AA**           | Accessibility              | 7 DSA profiles                          |

See [ADR 0062](docs/adr/0062-ai-compliance-framework.md) for the full compliance framework.

---

_Last updated: 14 Febbraio 2026, 12:00 CET_
