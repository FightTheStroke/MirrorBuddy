# WebSocket Observer Compliance Roadmap

## Status

**Not implemented** in the GA voice stack.

MirrorBuddy voice now runs on WebRTC media + **WebRTC data channel** for tool calls and transcript signaling.  
The legacy WebSocket proxy path was removed in W1, so a transport-level WebSocket observer cannot capture GA traffic anymore.

## Feasibility Summary

- A WebSocket observer is no longer the correct technical point for recording.
- Compliance capture must happen at:
  - server-side API boundaries (`/api/realtime/*`), and
  - data-channel event handling (`session.updated`, transcript events, tool events).

## EU AI Act Alignment Plan

To support auditability under **EU AI Act** obligations:

1. **Event schema**: define normalized compliance events for voice sessions.
2. **Capture hooks**: log transcript/tool/safety events in realtime handlers.
3. **Retention policy**: align retention + deletion with consent and privacy rules.
4. **Redaction layer**: strip sensitive user content where policy requires.
5. **Ops dashboard**: expose ingestion lag, drop rate, and storage health.

## Next Milestone

- Implement compliance event pipeline on WebRTC data-channel handlers.
- Track completion under W2/W7 hardening tasks and formal ADRs.
