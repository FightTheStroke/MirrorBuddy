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

## W3: Multi-Provider AI (Claude Fallback)

- Decision: Class-based AIProviderInterface over extending existing function pattern for cleaner abstraction
- Decision: AzureOpenAIProvider wraps existing azure.ts functions (no breaking changes)
- Decision: Claude does NOT support voice/realtime — voice stays Azure-only
- Pattern: Router with failover order (Azure -> Claude -> Ollama) and per-provider circuit breaker
- Pattern: Message/tool call mapping from OpenAI format to Claude Messages API format
- Pattern: Health status tracked in-memory with configurable check interval
- Insight: Anthropic SDK @anthropic-ai/sdk ^0.73.0 was already a dependency in package.json
- Insight: Claude tool_use blocks map cleanly to OpenAI function calling format

## W4: Load Testing & Performance Optimization

- Decision: Upstash Redis (existing dependency) for cache layer, no new infra needed
- Pattern: cacheGetOrFetch() with prefix system (maestro, tier, school) and configurable TTL
- Pattern: Cache is transparent — falls through silently if Redis unavailable
- Insight: k6 test execution requires running server; templates prepared for manual execution
- Insight: Supabase connection pool max_connections adjustable via dashboard (not code)
