# ADR 0018: Audio Coordination Architecture

## Status
Accepted

## Date
2026-01-01

## Context
MirrorBuddy has multiple audio sources that can conflict:
1. **Voice Session** (TTS from Maestri via Azure Realtime API)
2. **Voice Input** (User microphone for speech recognition)
3. **Ambient Audio** (Procedural noise, binaural beats for focus)
4. **Notifications** (Pomodoro alerts, system sounds)

## Decision

### Auto-Pause Strategy
When a voice session is active, ambient audio **pauses automatically** and **resumes when the session ends**.

This is simpler than audio ducking because:
- No mixing complexity
- Clear UX: study mode OR conversation mode
- No risk of ambient interfering with VAD

### Integration Points
1. **Voice Session Store** exports `isConnected` state
2. **Ambient Audio Header Widget** reacts to voice session state
3. Components coordinate via Zustand stores

### Pomodoro Integration
- **Focus phase**: Start ambient audio (if enabled)
- **Break phase**: Optionally pause ambient
- **Voice session during Pomodoro**: Pause ambient, resume after

Settings: `autoStartWithPomodoro`, `pauseDuringBreak`, `pomodoroPreset`

## Consequences
### Positive
- Simple mental model: one audio context at a time
- No audio conflicts or echo issues
- State preserved - ambient resumes where it was

### Negative
- Users cannot have ambient audio during voice conversations

## References
- Issue #71: Ambient Audio feature request
- PR #72: Copilot's initial implementation
