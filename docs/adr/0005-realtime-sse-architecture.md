# ADR 0005: Real-time Tool Canvas with Server-Sent Events

## Status

Accepted

## Date

2025-12-29

## Durable mindmap foundation (2026-09-18, #939)

The process-local event registry below is not an authoritative record and cannot
replay changes missed during an outage. `apps/web/src/lib/mindmap/service.ts`
introduces an owned, versioned snapshot in `Material`, or dedicated JSON in
`TrialSession` for visitors. Content, revision and the last 128 operation receipts
are written atomically with an expected-version condition. Source session identity
is separate from `Material.sessionId`, which remains a `StudySession` foreign key.

`/api/tools/mindmap` initializes (POST), reads (GET) and commits commands (PATCH).
`/api/tools/stream?sessionId=...&toolId=...` emits an immediate `mindmap:snapshot`,
then serial database reads every two seconds: newer snapshots or heartbeats.
Each read revalidates the persisted user session or trial ownership/expiry.
Access loss or storage failure emits `mindmap:error` and ends the stream.
`/api/tools/sse` shares this implementation for map mode but remains auth-only.
Generic streams without `toolId` retain the behavior documented below.

The fetch-SSE client in `lib/mindmap/snapshot-client.ts` validates exact map/source
identity and increasing revisions, with no edit-command replay. An equal revision
can confirm recovery but cannot reapply content. Only a valid snapshot restores
mutation readiness: a handshake or heartbeat is insufficient. Recovery allows five
retries (1/2/4/8/8 seconds), a five-second request/idle timeout, and a hard 30-second
budget. HTTP or streamed 401/403 is terminal; online events cannot reset exhaustion.
Manual retry is explicit and preserves the revision watermark.

`useMindmapModifications` selects this mode when supplied `toolId`, returning
`snapshot`, `recovery` and `reconnect`; snapshots use `onSnapshot`, never legacy edit
callbacks. The enabled active view owns its subscription. Without `toolId`, the
temporary legacy path now deduplicates event IDs, filters source identity and caps
automatic retries, but cannot provide durable recovery.

`LiveMindmap` now uses `useMindmapEditor` across conversation wrappers, tool panels
and library reopen. Only the selected visible view subscribes; browser `offline`
immediately cancels even an established socket and pauses mutations. Authoritative
nodes replace renderer props without triggering autosave or undo history. The
consolidated mindmap wrapper no longer starts a competing legacy material writer.
`mindmap-rendered-recovery.spec.ts` exercises a real ten-second browser outage,
independent accepted write, reload, durable undo and ten open/outage/close cycles.
`mindmap-conversation.spec.ts` covers authenticated/trial conversation creation
and reopen with only the paid AI response substituted. Browser fault cases cover
accepted-response loss, exact-envelope retry, conflict, and terminal 401/403.
An isolated app-only PostgreSQL protocol counter observed 10 executions in
10.504 seconds with one reader and 40 in 10.503 seconds with four, with zero
executions in idle/post-close windows. These are bounded local observations,
not a capacity benchmark. The counter/config live only in session artifacts;
production has no added instrumentation. Paid live voice remains C6 coverage.

## Context

MirrorBuddy's Maestri (AI tutors) can create educational tools for students:

- Mind maps
- Flashcards
- Quizzes
- Summaries
- Study schedules

The original implementation waited for the AI to complete the entire tool before displaying it. This created problems:

| Issue                  | Impact                                 |
| ---------------------- | -------------------------------------- |
| Long wait times        | Students thought the app was frozen    |
| No progress feedback   | Anxiety, especially for ADHD students  |
| All-or-nothing display | No incremental benefit during creation |
| Memory pressure        | Large tools accumulated in memory      |

### ManifestoEdu Requirement

The ManifestoEdu.md specifies a "Tool Canvas" experience:

- **80% canvas**: Show the tool being built
- **20% Maestro PiP**: Small picture-in-picture of the Maestro
- Real-time streaming of content as it's generated

### Options Considered

#### Option 1: WebSocket

Full-duplex communication for real-time updates.

**Pros:**

- Bi-directional communication
- Low latency
- Wide support

**Cons:**

- More complex server setup
- Stateful connections harder to scale
- Overkill for unidirectional updates

#### Option 2: Polling

Client periodically requests updates.

**Pros:**

- Simple implementation
- No persistent connections

**Cons:**

- High latency (polling interval)
- Wasted requests when no updates
- Server load from repeated requests

#### Option 3: Server-Sent Events (Chosen)

Server-push over HTTP for unidirectional updates.

**Pros:**

- Native browser support (EventSource API)
- Simple server implementation
- Automatic reconnection
- Works with standard HTTP infrastructure
- Lower overhead than WebSocket for one-way data

**Cons:**

- Unidirectional only (client → server needs separate requests)
- Limited browser connection count (6 per domain)
- No binary data support (text only)

## Decision

Implement **Server-Sent Events (SSE)** for real-time tool updates.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT BROWSER                           │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │   Tool Canvas    │    │      Chat Interface           │  │
│  │   Component      │◄───│      (POST /api/chat)         │  │
│  │   (EventSource)  │    │                               │  │
│  └────────┬─────────┘    └──────────────────────────────┘  │
│           │                                                 │
└───────────│─────────────────────────────────────────────────┘
            │ SSE Connection
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   GET /api/tools/stream?sessionId=xxx                 │  │
│  │   - Returns ReadableStream                            │  │
│  │   - Sends SSE events                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Tool Event Manager (tool-events.ts)                 │  │
│  │   - Client registry (Map<clientId, controller>)       │  │
│  │   - Session grouping (Map<sessionId, Set<clientId>>) │  │
│  │   - Broadcast to session                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Event Types

| Event           | Payload                         | Purpose                        |
| --------------- | ------------------------------- | ------------------------------ |
| `connected`     | `{ clientId, sessionId }`       | Initial handshake confirmation |
| `tool:created`  | `{ toolId, type, title }`       | New tool started               |
| `tool:update`   | `{ toolId, content, progress }` | Incremental content            |
| `tool:complete` | `{ toolId, finalContent }`      | Tool finished                  |
| `tool:error`    | `{ toolId, error }`             | Generation failed              |
| `:heartbeat`    | `{ timestamp }`                 | Keep-alive (every 30s)         |

### Client Implementation

```typescript
// Tool Canvas component
useEffect(() => {
  const eventSource = new EventSource(`/api/tools/stream?sessionId=${sessionId}`);

  eventSource.addEventListener('tool:update', (event) => {
    const data = JSON.parse(event.data);
    setToolContent((prev) => prev + data.content);
    setProgress(data.progress);
  });

  eventSource.addEventListener('tool:complete', (event) => {
    const data = JSON.parse(event.data);
    setToolContent(data.finalContent);
    setIsComplete(true);
  });

  return () => eventSource.close();
}, [sessionId]);
```

### Server Implementation

```typescript
// /api/tools/stream/route.ts
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  const clientId = generateClientId();

  const stream = new ReadableStream({
    start(controller) {
      registerClient(clientId, sessionId, controller);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        sendHeartbeat(clientId);
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unregisterClient(clientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Broadcasting Tool Updates

When AI generates tool content:

```typescript
// In chat API handler
function* streamToolContent(toolId: string, sessionId: string) {
  for await (const chunk of aiStream) {
    // Send to all clients watching this session
    broadcastToSession(sessionId, 'tool:update', {
      toolId,
      content: chunk,
      progress: calculateProgress(),
    });
    yield chunk;
  }

  broadcastToSession(sessionId, 'tool:complete', {
    toolId,
    finalContent: accumulatedContent,
  });
}
```

### Security Considerations

1. **Session ID validation**: Regex check to prevent injection
2. **Client limits**: Max clients per session to prevent DoS
3. **Heartbeat timeout**: Disconnect idle clients
4. **CORS headers**: Restrict to same origin in production

## Consequences

### Positive

- Immediate visual feedback during tool generation
- Reduced perceived wait time
- Lower memory pressure (streaming vs accumulating)
- Simple infrastructure (standard HTTP)
- Automatic reconnection via EventSource

### Negative

- Unidirectional only (need separate POST for user actions)
- Browser connection limits (6 per domain)
- No binary data (must use base64 for images)
- Stateful server-side client registry

### Performance

| Metric          | Before (Polling)       | After (SSE)            |
| --------------- | ---------------------- | ---------------------- |
| First byte time | ~2-5s                  | ~100ms                 |
| Update latency  | 1000ms (poll interval) | <50ms                  |
| Server requests | 60/min                 | 1 (persistent)         |
| Client memory   | Full tool in memory    | Streamed incrementally |

## Key Files

| File                                   | Purpose               |
| -------------------------------------- | --------------------- |
| `src/app/api/tools/stream/route.ts`    | SSE endpoint          |
| `src/lib/realtime/tool-events.ts`      | Event broadcasting    |
| `src/lib/realtime/tool-state.ts`       | Tool state management |
| `src/components/tools/tool-canvas.tsx` | Canvas UI component   |

## References

- MDN: Server-Sent Events
- Next.js: Streaming with Web Streams
- GitHub Issue #26 - Real-time Tool Building
- ManifestoEdu.md - Tool Canvas specification
