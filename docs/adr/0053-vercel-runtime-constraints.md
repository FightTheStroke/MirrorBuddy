# ADR 0053: Vercel Runtime Constraints

## Status

Accepted

## Date

2026-01-18

## Context

Vercel serverless deployment has specific runtime constraints that affect MirrorBuddy's
voice and chat features. This ADR documents these constraints and required patterns.

## Decision

### CSRF Protection (CRITICAL)

All API routes in MirrorBuddy are protected with double-submit cookie CSRF tokens.
**Every client-side POST/PUT/DELETE request MUST use `csrfFetch()`**.

#### Why This Matters on Vercel

Plain `fetch()` to protected endpoints returns **403 Forbidden**. This causes:

- Chat API: "Mi dispiace, ho avuto un problema" error
- Voice: Falls back to WebSocket which doesn't exist on Vercel
- Features: Silent failures with cryptic error messages

#### Required Pattern

```typescript
// ❌ WRONG - Will fail with 403 on Vercel production
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// ✅ CORRECT - csrfFetch adds token automatically
import { csrfFetch } from "@/lib/auth/csrf-client";

const response = await csrfFetch("/api/chat", {
  method: "POST",
  body: JSON.stringify(data), // No Content-Type header needed
});
```

**Notes**:

- `csrfFetch` auto-injects `Content-Type: application/json` - don't add manually
- `csrfFetch` handles 403 retry with token refresh
- GET requests don't need CSRF (use plain `fetch`)

#### Files Fixed (2026-01-18)

Core chat files updated to use `csrfFetch`:

| File                            | Component                |
| ------------------------------- | ------------------------ |
| `message-handler.ts`            | Chat message sending     |
| `tool-handler.ts`               | AI tool execution        |
| `streaming-handler.ts`          | Streaming chat responses |
| `sse-parser.ts`                 | SSE stream fetching      |
| `use-materiali-conversation.ts` | Materials chat           |
| `use-maieutic-chat.ts`          | Homework help chat       |
| `config-chat-tests.ts`          | Diagnostics chat test    |
| `webrtc-connection.ts`          | Voice ephemeral token    |
| `websocket-connection.ts`       | Voice WS fallback        |

#### Files Requiring Review

These files use `fetch()` for POST and may need `csrfFetch`:

```
src/lib/hooks/useSessionMetrics.ts (6 POST calls)
src/lib/presence/presence.ts (2 POST calls)
src/components/voice/voice-call-panel.tsx (2 POST calls)
src/components/settings/sections/feature-flags/FeatureFlagsPanel.tsx
src/lib/client-error-logger.ts
src/lib/hooks/use-maestro-session-logic.ts
src/lib/tts/tts-api.ts
src/components/conversation/character-chat-view/conversation-helpers.ts
src/lib/stores/telemetry-store/store-actions.ts
src/lib/stores/character/character-slice.ts
src/components/education/homework-help-view/hooks/use-homework-help.ts
src/components/education/homework-help-view/hooks/use-session-effects.ts
src/components/voice/handlers.ts
src/lib/events/event-broadcaster.ts
src/components/study-kit/StudyKitViewer/handlers.ts
src/lib/voice/voice-tool-commands/executors.ts
src/lib/voice/webrtc-probe.ts
src/lib/integrations/google-drive/use-google-drive.ts
src/lib/safety/monitoring/logging.ts
```

#### Prevention

**Recommended**: Add ESLint rule or pre-commit hook to flag:

```
Pattern: fetch\(['"]\/api\/ + method: ['"]POST
Warning: "Use csrfFetch for POST requests to /api/* endpoints"
```

### Voice Transport Architecture

MirrorBuddy uses Azure OpenAI Realtime API for voice conversations. There are two
transport options with different deployment constraints:

#### WebRTC (Production Transport)

| Aspect                | Details                              |
| --------------------- | ------------------------------------ |
| **How it works**      | Browser → Azure directly via WebRTC  |
| **Vercel compatible** | ✅ Yes (no server-side proxy needed) |
| **Latency**           | Low (direct connection)              |
| **Browser support**   | All modern browsers                  |

**Flow**:

1. Client requests ephemeral token from `/api/realtime/ephemeral-token`
2. Client establishes WebRTC connection directly to Azure endpoint
3. Audio streams peer-to-peer between browser and Azure

**Critical**: The ephemeral token request MUST include CSRF token via `csrfFetch()`.
Without it, the request fails with 403, triggering WebSocket fallback which doesn't
work on Vercel.

#### WebSocket Proxy (Local Development Only)

| Aspect                | Details                                   |
| --------------------- | ----------------------------------------- |
| **How it works**      | Browser → Local proxy (port 3001) → Azure |
| **Vercel compatible** | ❌ NO (no persistent server process)      |
| **Use case**          | Local development without WebRTC          |

**Why WebSocket doesn't work on Vercel**:

1. **Serverless Functions**: Stateless, max 60s timeout, can't maintain connections
2. **Edge Runtime**: Does NOT support WebSocket upgrade requests
3. **Fluid Compute**: Still serverless, no WebSocket support
4. **No port binding**: Can't run a proxy on port 3001

**Vercel's official position** (from docs):

> "Serverless Functions do not support WebSockets. Instead of pushing data,
> you can intelligently fetch data on-demand. If you need persistent connections,
> use third party pub/sub services."

#### Production Fallback Options (If WebRTC Fails)

| Option                 | Effort | Cost    | Description                           |
| ---------------------- | ------ | ------- | ------------------------------------- |
| **Text-only mode**     | Low    | Free    | Disable voice, use chat API only      |
| **External WebSocket** | High   | ~$5/mo  | Deploy proxy on Railway/Render/Fly.io |
| **Rivet integration**  | Medium | ~$10/mo | WebSocket tunneling for Vercel        |
| **Ably/Pusher**        | High   | Varies  | Pub/sub service with voice relay      |

**Current implementation** (2026-01-18): WebRTC only in production. If WebRTC fails,
user sees clear error message instead of cryptic "The operation is insecure".

#### WebRTC Failure Scenarios

| Cause                          | Frequency             | Mitigation                 |
| ------------------------------ | --------------------- | -------------------------- |
| CSRF token missing             | Fixed (use csrfFetch) | Code fixed 2026-01-18      |
| Corporate firewall blocks UDP  | ~5% corporate users   | TURN servers in ICE config |
| Browser doesn't support WebRTC | <1%                   | Show clear error message   |
| Azure endpoint unavailable     | Rare                  | Retry logic                |

### Health Check Considerations on Vercel

#### Memory Reporting

The `/api/health` endpoint reports memory as `heapUsed / heapTotal`. On Vercel:

| Metric         | Typical Value | Notes                          |
| -------------- | ------------- | ------------------------------ |
| heapUsed       | 20-30 MB      | Actual memory in use           |
| heapTotal      | 25-50 MB      | Node's current heap allocation |
| **Percentage** | 70-95%        | **Misleading!**                |

**Why it looks critical but isn't**:

- `heapTotal` is NOT the function's memory limit (1024 MB default on Vercel)
- Node.js dynamically expands heap as needed
- 93% of 27 MB = 25 MB, which is very low for a Next.js app

**Recommendation**: Monitor `heapUsed` absolute value, not percentage.
Consider switching to RSS-based metrics for serverless.

#### Database Latency

First request after cold start may show high latency (500+ ms) due to:

1. Connection pool initialization
2. SSL handshake with Supabase
3. Network round-trip to database region

**Mitigations**:

- Use Supabase pooler (port 6543) for connection reuse
- Deploy Vercel function in same region as Supabase (eu-west-1)
- Configure `SUPABASE_CA_CERT` to avoid SSL negotiation issues

## Consequences

### Positive

- Clear documentation of runtime constraints
- Prevents future CSRF-related deployment issues
- Voice architecture documented for maintenance

### Negative

- Developers must learn `csrfFetch` pattern
- WebSocket-based features need alternative solutions

## Related

- ADR 0052: Vercel Deployment Configuration
- ADR 0038: WebRTC migration for voice
