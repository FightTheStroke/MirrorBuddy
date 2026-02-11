# ADR 0080: Security Audit Hardening

## Status

Accepted

## Date

2026-01-19

## Context

A comprehensive security audit identified multiple vulnerabilities requiring remediation to achieve compliance with GDPR, COPPA, and security best practices.

### Vulnerabilities Identified

1. **Authorization bypass**: 14+ API routes accepted userId from request parameters
2. **OAuth security**: Missing PKCE, unsigned state, tokens stored in plaintext
3. **XSS vectors**: Mermaid SVG output not sanitized
4. **Brute force exposure**: No rate limiting on auth endpoints
5. **COPPA gaps**: No email verification for parental consent
6. **Incident response**: No documented breach protocol

## Decision

### 1. Authorization Model

All API routes now use `requireAuthenticatedUser()` helper that:

- Extracts userId exclusively from signed session cookie
- Rejects any userId from request params/body
- Returns standardized 401 response

```typescript
const { userId, errorResponse } = await requireAuthenticatedUser();
if (errorResponse) return errorResponse;
```

### 2. OAuth PKCE Implementation (RFC 7636)

- Generate `code_verifier` (32 random bytes, base64url)
- Derive `code_challenge` via SHA-256
- Include in authorization request with `code_challenge_method=S256`
- Pass `code_verifier` in token exchange

### 3. OAuth State Security

State parameter now includes:

- `userId`, `returnUrl`, `nonce`
- `codeVerifier` for PKCE
- `createdAt` timestamp (10-minute expiry)
- HMAC-SHA256 signature for tamper detection

### 4. Token Encryption at Rest

OAuth tokens encrypted before storage using:

- **Algorithm**: AES-256-GCM
- **Key derivation**: scrypt (N=16384, r=8, p=1)
- **Format**: `enc:v1:{base64(salt:iv:authTag:ciphertext)}`

Requires `TOKEN_ENCRYPTION_KEY` env var (32+ chars).

### 5. Rate Limiting

| Endpoint           | Limit   | Rationale                   |
| ------------------ | ------- | --------------------------- |
| Login              | 5/15min | Brute force prevention      |
| Password change    | 3/15min | Account takeover prevention |
| OAuth              | 10/min  | Abuse prevention            |
| Invite requests    | 3/hour  | Spam prevention (public)    |
| COPPA verification | 5/hour  | Email cost control          |

### 6. SVG Sanitization

All Mermaid-generated SVG sanitized via DOMPurify:

```typescript
const sanitizedSvg = DOMPurify.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
});
```

### 7. GDPR Delete Consolidation

Single `executeUserDataDeletion()` function:

- Revokes Google OAuth tokens first
- Deletes all 20+ user data tables in transaction
- Audit logs deletion event

### 8. COPPA Email Verification

Parents receive 6-digit verification code via RESEND:

- Code expires in 24 hours
- Rate limited to 5/hour
- Audit trail of consent/denial

## Consequences

### Positive

- OWASP Top 10 vulnerabilities addressed
- GDPR Article 17 (erasure) compliance
- GDPR Article 33/34 (breach notification) readiness
- COPPA compliance for children under 13
- Defense in depth with multiple security layers

### Negative

- Requires `TOKEN_ENCRYPTION_KEY` env var in production
- Slightly increased latency for encrypted token operations
- Rate limiting may affect legitimate high-volume users

### Risks

- Key rotation requires re-encryption of all tokens
- Rate limit bypass possible with IP rotation (mitigated by Redis in production)

## Files Changed

- `src/lib/auth/session-auth.ts` - requireAuthenticatedUser helper
- `src/lib/security/encryption.ts` - AES-256-GCM encryption
- `src/lib/google/oauth.ts` - PKCE, signed state, token encryption
- `src/lib/rate-limit.ts` - Auth rate limit configs
- `src/lib/compliance/coppa-service.ts` - Email verification
- `src/components/tools/diagram-renderer.tsx` - DOMPurify
- `src/app/api/privacy/delete-my-data/helpers.ts` - GDPR deletion
- `docs/security/DATA-BREACH-PROTOCOL.md` - Incident response

### 9. XSS Print/Export Hardening (Plan 144)

All `document.write()` flows that interpolate user/AI content now use
`escapeHtml()` from `@/lib/tools/accessible-print/helpers`.

**Vulnerability**: Template literals in print windows interpolated raw
user content (topic, title, section content, key points) into HTML.

**Affected files**:

- `src/components/tools/auto-save-wrappers.tsx` — summary PDF export
- `src/components/tools/tool-result-display/auto-save-wrappers.tsx` — same
- `src/components/tools/markmap/hooks/use-export.ts` — mindmap print/download
- `src/lib/tools/accessible-print/renderers.ts` — already escaped (20 sites)

**Pattern established**: All `document.write` flows must escape every
interpolated content field via `escapeHtml()`. Integration tests in
`accessible-print/__tests__/escaping.test.ts` enforce this.

## References

- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Article 17](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 33](https://gdpr-info.eu/art-33-gdpr/)
- [COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
