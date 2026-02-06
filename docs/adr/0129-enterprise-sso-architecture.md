# ADR-0129: Enterprise SSO Architecture

**Status:** Accepted
**Date:** 2026-02-06
**Context:** Plan 125 W2-SSO

## Decision

Implement standard OIDC flow with PKCE (RFC 7636) for both Google Workspace and Microsoft 365 SSO.

## Rationale

- OIDC is universal: works with Google, Microsoft, and future IdPs
- PKCE prevents authorization code interception (required for public clients)
- Database-backed state instead of encrypted cookies for PKCE session management
- Standard OIDC (not MSAL.js) for Microsoft to minimize dependency footprint

## Architecture

```
Browser --> /api/auth/sso/{provider} --> Generate PKCE + state --> Redirect to IdP
                                                |
                                         SSOSession (DB)
                                                |
IdP callback --> /api/auth/sso/{provider}/callback --> Verify state + PKCE
                                                        |
                                                  sso-callback-handler.ts
                                                  (create/link user)
```

## Key Models

- `SchoolSSOConfig`: Per-school provider config (clientId, secret, domain, scopes)
- `SSOSession`: PKCE state + codeVerifier + nonce with TTL

## Key Patterns

- `OIDCProvider` interface: Shared abstraction for all providers
- `oidc-utils.ts`: PKCE generation, JWT verification, state management
- `sso-callback-handler.ts`: User creation/linking across providers
- Provider-specific utils for tenant detection and domain validation

## Trade-offs

- DB sessions add a database round-trip vs cookie-based state
- Accepted because: DB sessions are auditable (SOC 2) and don't have cookie size limits

## References

- Plan 125 W2 tasks T2-01 through T2-06
- RFC 7636: PKCE for OAuth 2.0
