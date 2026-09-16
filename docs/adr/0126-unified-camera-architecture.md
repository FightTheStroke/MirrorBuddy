# ADR 0126: Unified Camera Architecture

## Status

**Accepted**

## Context

Plan 122 (ADR 0122) introduced video vision for voice sessions, allowing continuous frame capture to Azure OpenAI Realtime API. However, the user experience had two disconnected camera flows:

1. **Video Mode (Plan 122)**: Continuous frame capture as passive context (no AI response triggered)
2. **Photo Mode (WebcamCapture)**: Fullscreen modal with tool-triggered capture (AI responds)

Users could not switch between these modes at runtime during a voice session. Additionally, mobile users needed front/rear camera switching, which was inconsistent between the two flows.

## Decision

Implement a **unified camera mode selector** that allows runtime switching between:

- `off`: Camera disabled
- `video`: Continuous frames as passive context (existing ADR 0122 behavior)
- `photo`: Single snapshot that triggers AI response (ChatGPT-like "see and respond")

### Key Implementation Points

1. **Single Hook**: `useUnifiedCamera` replaces `useVideoVision`, maintaining backward compatibility
2. **Shared Camera Stream**: Both modes use the same `MediaStream` and preview UI
3. **Mode Cycling**: off → video → photo → off via single button
4. **Photo Snapshot**: Captures frame and sends `conversation.item.create` + `response.create` to trigger AI response
5. **Mobile Camera Flip**: `toggleCameraFacing()` switches between front (`user`) and rear (`environment`) cameras
6. **Tier Limits**: Reuses existing `videoVisionSecondsPerSession` and `videoVisionMinutesMonthly` limits

### Azure OpenAI Realtime API Integration

```typescript
// Video mode (passive context - no AI response):
dataChannel.send(
  JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_image', image_url: base64 }],
    },
  }),
);

// Photo mode (triggers AI response):
dataChannel.send(
  JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_image', image_url: base64 }],
    },
  }),
);
dataChannel.send(JSON.stringify({ type: 'response.create' }));
```

## Consequences

### Camera resource lifecycle

The camera owner releases photo and video tracks on unmount, including access
granted after the owner has gone away. Video startup failure (including a rejected
`video.play()`) releases the acquired stream and ends its usage reservation.
All capture timers, including the delayed first frame, are cancelled on stop.
Mode transitions are serialized across both camera controls, so a superseded
start cannot finalize another capture's reservation or leave capture running
behind an off indicator.

`apps/web/src/lib/hooks/voice-session/use-camera-usage.ts` owns reservation start/end
requests. Concurrent finalization shares one request; a rejected end remains
reported and retains its reservation identifier rather than appearing successful.
The next start first retries that finalization with its original duration and
does not allocate another reservation while recovery is failing.
`camera-snapshot.ts` releases its temporary video element even when capture fails.
Permission denial and unsupported devices remain failures, not simulated camera
successes; the public camera controls and tier limits are unchanged.

### Positive

- Unified camera experience across voice sessions
- Runtime mode switching without leaving the session
- Mobile-friendly with front/rear camera support
- Maintains backward compatibility with existing video vision limits
- WCAG 2.1 AA compliant with proper ARIA labels and screen reader announcements

### Negative

- Slight increase in complexity for mode state management
- Photo mode reuses video limits (may need separate photo quota in future)

## Files Changed

**New:**

- `src/lib/hooks/voice-session/use-unified-camera.ts` (~280 lines)
- `src/components/voice/camera-mode-selector.tsx` (~130 lines)
- `src/lib/hooks/voice-session/__tests__/use-unified-camera.test.ts`

**Modified:**

- `src/types/voice.ts` - Added `CameraMode` type
- `src/lib/hooks/voice-session/use-voice-session.ts` - Uses `useUnifiedCamera`
- `src/components/voice/voice-session/session-controls.tsx` - Uses `CameraModeSelector`
- `src/components/voice/voice-session.tsx` - Passes new camera props
- `messages/{it,en,fr,de,es}/chat.json` - i18n keys for camera modes

## Related ADRs

- ADR 0122: Realtime Video Vision (superseded for UI, limits still apply)
- ADR 0118: Webcam Fullscreen Architecture (photo flow reference)
