# Plan 125: Technical Perfection — Running Notes

## W1: Mobile (Capacitor Native Shell)

- Decision: Capacitor over Expo/React Native for maximum code reuse (same Next.js codebase)
- Pattern: media-bridge abstraction for native/web camera+mic (single API surface)
- Pattern: capacitor-push.ts detects environment and routes to native or web push
- Insight: Capacitor webDir needs to point to Next.js standalone output (out/)

## W2: Enterprise SSO (Google Workspace + Microsoft 365)

- Decision: Standard OIDC flow (not MSAL.js) for Microsoft to keep dependency footprint small
- Decision: Database-backed SSO sessions instead of encrypted cookies for PKCE state
- Pattern: OIDCProvider interface with shared oidc-utils.ts for PKCE, JWT, state generation
- Pattern: Provider-specific utils (microsoft365-utils.ts) for tenant detection and domain validation
- Pattern: Shared sso-callback-handler.ts for user creation/linking across providers
- Insight: Google edu scopes require separate verification via Google Cloud Console
- Insight: Azure AD "common" endpoint supports both personal and organizational accounts
