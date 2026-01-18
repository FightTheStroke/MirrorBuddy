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

| File                            | Component                  |
| ------------------------------- | -------------------------- |
| `message-handler.ts`            | Chat message sending       |
| `tool-handler.ts`               | AI tool execution          |
| `streaming-handler.ts`          | Streaming chat responses   |
| `sse-parser.ts`                 | SSE stream fetching        |
| `use-materiali-conversation.ts` | Materials chat             |
| `use-maieutic-chat.ts`          | Homework help chat         |
| `config-chat-tests.ts`          | Diagnostics chat test      |
| `webrtc-connection.ts`          | Voice ephemeral token      |
| `websocket-connection.ts`       | Voice WS fallback          |
| `webrtc-probe.ts`               | Transport probe (CRITICAL) |

**Note**: `webrtc-probe.ts` was particularly insidious - it caused WebRTC to appear
"unavailable" which triggered WebSocket fallback, which doesn't work on Vercel.
The actual error was a 403 CSRF failure, but the symptom was "voice doesn't work".

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

### Module Bundling Constraints (CRITICAL)

Vercel serverless functions run in an isolated environment. Modules must be **bundled**
with the application, NOT loaded at runtime from node_modules.

#### The `serverExternalPackages` Trap

**DO NOT** add packages to `serverExternalPackages` unless you absolutely know what
you're doing. This setting tells Next.js to NOT bundle the package, expecting it to
be available at runtime.

```typescript
// next.config.ts - THIS WILL BREAK ON VERCEL
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"], // ❌ BROKEN ON VERCEL
};
```

**What happens on Vercel**:

1. Package marked as "external" is NOT included in the serverless function bundle
2. At runtime, Node.js tries to `require('pdf-parse')` from node_modules
3. node_modules doesn't exist in Vercel's runtime environment
4. **500 Internal Server Error** with cryptic "MODULE_NOT_FOUND" in logs

**What happened to MirrorBuddy (2026-01-18)**:

| Symptom                             | Root Cause                                          |
| ----------------------------------- | --------------------------------------------------- |
| Chat API returns 500                | pdf-parse in serverExternalPackages                 |
| Error: "MODULE_NOT_FOUND pdf-parse" | Package not bundled, not available at runtime       |
| Import chain breaks entire API      | `/api/chat` → handlers → pdf-handler → pdf-parse 💥 |

**Fix applied**: Removed `pdf-parse` from `serverExternalPackages`. Now bundled.

### Static Module Initialization (CRITICAL)

Some packages initialize at module load time, which can break the entire import chain on
Vercel even if the package itself is bundled correctly.

#### The Problem

```typescript
// ❌ BROKEN - Initializes at module load time
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window; // Executes at module load!
const purify = DOMPurify(window); // Creates instance at module load!

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html);
}
```

**What happens on Vercel**:

1. Module loads during function cold start
2. JSDOM tries to initialize (requires native dependencies)
3. Fails with `ERR_REQUIRE_ESM` or similar
4. **Entire import chain breaks** - not just the function that uses sanitization
5. API route returns 500 on ALL requests (even GET)

#### The Import Chain Problem

```
/api/chat/route.ts
  └─ import '@/lib/tools/handlers'
       └─ handlers/index.ts
            └─ import './demo-handler'
                 └─ demo-handler.ts
                      └─ import { sanitizeHtml } from './demo-validators'
                           └─ demo-validators.ts
                                └─ const window = new JSDOM('').window  💥 FAILS
```

If ANY module in the chain fails to load, the ENTIRE `/api/chat` route fails.

#### The Fix: Lazy Initialization

```typescript
// ✅ CORRECT - Lazy initialization with dynamic imports
let purifyInstance: ReturnType<typeof import("dompurify").default> | null =
  null;

async function getPurify() {
  if (!purifyInstance) {
    // Dynamic imports - only loads when function is called
    const { JSDOM } = await import("jsdom");
    const DOMPurify = (await import("dompurify")).default;
    const window = new JSDOM("").window;
    purifyInstance = DOMPurify(window as any);
  }
  return purifyInstance;
}

export async function sanitizeHtml(html: string): Promise<string> {
  if (!html) return "";
  const purify = await getPurify();
  return purify.sanitize(html);
}
```

**Key changes**:

1. Dynamic `import()` instead of static `import`
2. Lazy initialization - only when function is called
3. Singleton pattern - only create instance once
4. Function becomes `async` - callers must await

#### Fixed Files (2026-01-18)

| File                      | Issue                    | Fix                           |
| ------------------------- | ------------------------ | ----------------------------- |
| `demo-validators.ts`      | JSDOM at module load     | Lazy init with dynamic import |
| `demo-handler.ts`         | Called sync sanitizeHtml | Added await                   |
| `demo-plugin.ts`          | Called sync sanitizeHtml | Added await                   |
| `pdf-extraction.ts`       | pdf-parse at module load | Dynamic import in function    |
| `study-kit-extraction.ts` | pdf-parse at module load | Dynamic import in function    |

#### Detecting This Issue

**Symptoms**:

- GET /api/chat returns 500 (even though GET doesn't use sanitization)
- Vercel logs show: `ERR_REQUIRE_ESM: require() of ES Module`
- Error mentions a file you wouldn't expect (indirect import)

**Check for problematic patterns**:

```bash
# Find static imports of known problematic packages
grep -r "^import.*from ['\"]jsdom" src/
grep -r "^import.*from ['\"]dompurify" src/
grep -r "^import.*from ['\"]pdf-parse" src/

# Find module-level initializations
grep -r "new JSDOM\(\)" src/
grep -r "= DOMPurify\(" src/
```

#### When serverExternalPackages IS Needed

Only use it for packages with **native bindings** that:

1. Are available in Vercel's Lambda runtime (e.g., `sharp` - Vercel pre-installs it)
2. Have specific Vercel support documented

**Safe examples** (Vercel provides these):

```typescript
serverExternalPackages: [
  "@prisma/client", // Vercel has special Prisma handling
  "sharp", // Pre-installed on Vercel
];
```

**Dangerous examples** (will break):

```typescript
serverExternalPackages: [
  "pdf-parse", // NOT on Vercel runtime
  "canvas", // Requires native compilation
  "any-native-pkg", // Unless Vercel explicitly supports it
];
```

#### Debugging Module Issues

Check Vercel function logs for:

```
Error: Cannot find module 'package-name'
Error: Module not found: Can't resolve 'package-name'
```

**Fix**: Remove the package from `serverExternalPackages` in `next.config.ts`.

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

## Common Deployment Failures Quick Reference

**Use this table when something breaks on Vercel production.**

| Symptom                        | Check                                   | Root Cause                           | Fix                               |
| ------------------------------ | --------------------------------------- | ------------------------------------ | --------------------------------- |
| Chat API 500                   | Vercel logs: "MODULE_NOT_FOUND"         | Package in serverExternalPackages    | Remove from next.config.ts        |
| Chat API 500 (ERR_REQUIRE_ESM) | Vercel logs: "ERR_REQUIRE_ESM"          | Static import initializes at load    | Use lazy init + dynamic import    |
| Chat API 403                   | Response body: "Invalid CSRF"           | Using `fetch` instead of `csrfFetch` | Import and use csrfFetch          |
| Voice "WebRTC required" error  | Browser console: 403 on ephemeral-token | webrtc-probe.ts using plain fetch    | Change to csrfFetch               |
| Voice SDP exchange 400         | "SDP exchange failed: 400" in logs      | Missing `?model=` in WebRTC URL      | Add model param to token route    |
| Voice "operation insecure"     | CSP violation in console                | Missing wss:// in CSP connect-src    | Update proxy.ts CSP               |
| Database timeout               | Health endpoint shows high latency      | Cold start + wrong region            | Deploy in same region as Supabase |
| SSL certificate error          | Prisma logs SSL errors                  | Missing SUPABASE_CA_CERT             | Add CA cert to env vars           |

**First response to any production failure**:

1. Check Vercel Function Logs: `vercel logs --prod`
2. Look for: 403 (CSRF), 500 (module/crash), MODULE_NOT_FOUND
3. Cross-reference with this table

## Related

- ADR 0052: Vercel Deployment Configuration
- ADR 0038: WebRTC migration for voice
