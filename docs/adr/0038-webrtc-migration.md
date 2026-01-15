# ADR 0038: WebRTC Migration for Azure Realtime Voice

## Status
Accepted

## Context
MirrorBuddy uses Azure OpenAI Realtime API for voice conversations with AI tutors.
The original WebSocket implementation had latency of ~450-900ms for first audio.
Azure now supports WebRTC transport with direct peer-to-peer connections.

## Decision
Migrate voice transport from WebSocket to WebRTC while maintaining WebSocket as fallback.

### Key Changes
1. **Transport Detection**: Server returns preferred transport mode via `/api/realtime/token`
2. **Ephemeral Tokens**: New `/api/realtime/ephemeral-token` endpoint for WebRTC auth
3. **SDP Exchange**: Direct browser-to-Azure SDP negotiation
4. **Audio Handling**: Native WebRTC tracks instead of PCM16 base64 encoding
5. **Fallback**: Automatic WebSocket fallback for unsupported browsers

## Consequences

### Positive
- Lower latency (~200-350ms first audio)
- Native barge-in support
- Reduced server load (no audio proxy)
- Better audio quality (native codecs)

### Negative
- Increased client complexity
- Browser compatibility requirements
- Dual transport maintenance

### Neutral
- WebSocket proxy deprecated but maintained
- Feature flag controls transport selection

## Implementation Details

### Transport Selection Logic
```typescript
// Server determines transport based on:
// 1. Client capabilities (Accept header or user-agent)
// 2. Region (some Azure regions WebRTC-first)
// 3. Feature flag configuration
// 4. User preferences (override)

export async function POST(req: NextRequest) {
  const transport = shouldUseWebRTC() ? 'webrtc' : 'websocket';
  return NextResponse.json({
    token: ephemeralToken,
    transport,
    expires_in: 60,
  });
}
```

### Browser Compatibility
- WebRTC: Chrome 90+, Edge 90+, Safari 14.1+, Firefox 85+
- Fallback: All modern browsers via WebSocket
- Detection: `RTCPeerConnection` availability + feature testing

### CSP Requirements (CRITICAL)
Content-Security-Policy must include these endpoints in `connect-src`:

**WebRTC Transport:**
```
connect-src 'self'
  https://*.openai.azure.com
  wss://*.openai.azure.com
  https://*.realtimeapi-preview.ai.azure.com;
```

**WebSocket Fallback (local proxy):**
```
connect-src 'self'
  ws://localhost:*
  wss://localhost:*;
```

**Why this matters:**
- Azure WebRTC uses a **separate regional endpoint** (`{region}.realtimeapi-preview.ai.azure.com`)
- This endpoint is different from the main Azure OpenAI endpoint (`*.openai.azure.com`)
- Without this CSP entry, browsers silently block the SDP exchange
- Safari is particularly strict about CSP violations

**Environment Variables:**
- `AZURE_OPENAI_REALTIME_REGION`: Must match your Azure resource region (default: `swedencentral`)
- `VOICE_TRANSPORT`: Set to `websocket` to force WebSocket fallback

### Audio Pipeline
**WebRTC Path**:
- Browser captures audio (MediaStreamAudioSource)
- WebRTC encodes opus natively
- Direct SDP to Azure TURN
- Receives audio via MediaStreamTrack
- No base64 encoding overhead

**WebSocket Path** (legacy):
- Browser PCM16 → base64
- Server routes to Azure
- Response base64 → PCM16 playback
- ~100ms additional latency

## Migration Strategy

### Phase 1: Server Endpoints (Week 1)
- [ ] Add `/api/realtime/ephemeral-token` endpoint
- [ ] Update `/api/realtime/token` to return transport preference
- [ ] Feature flag: `ENABLE_WEBRTC` (default: false)

### Phase 2: Client Implementation (Week 2-3)
- [ ] WebRTC transport handler (`src/lib/voice/webrtc-transport.ts`)
- [ ] Connection fallback logic
- [ ] Audio input/output routing
- [ ] Error recovery

### Phase 3: Testing & Monitoring (Week 4)
- [ ] E2E tests with WebRTC enabled
- [ ] Latency monitoring (dashboard metric)
- [ ] Error rate tracking
- [ ] Browser compatibility matrix

### Phase 4: Gradual Rollout (Week 5+)
- [ ] 10% canary (internal users)
- [ ] 50% beta (opt-in feature flag)
- [ ] 100% production

## Rollback Plan
If WebRTC introduces critical issues:
1. Disable feature flag immediately
2. All clients revert to WebSocket within 5 minutes
3. No data loss (stateless transport layer)
4. Monitoring alerts on error rate threshold

## Related ADRs
- ADR 0005: Realtime SSE Architecture (supersedes for voice only)
- ADR 0028: PostgreSQL + pgvector (data storage, not affected)

## References
- [Azure OpenAI Realtime API - WebRTC Transport](https://learn.microsoft.com/en-us/azure/ai-services/openai/realtime-api-overview)
- [MDN: WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [RFC 8829: JavaScript Session Establishment Protocol](https://tools.ietf.org/html/rfc8829)
