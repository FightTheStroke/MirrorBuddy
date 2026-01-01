# Onboarding Voice Integration (#61)

Melissa guides new students through onboarding with voice conversation.

## Architecture

```
┌────────────────────────────────┬──────────────────────┐
│        FORM INPUT AREA         │    VOICE PANEL       │
│   (WelcomeStep / InfoStep)     │   (Melissa)          │
│                                │                      │
│   - Name input    <── synced ──│   [Avatar + Status]  │
│   - Age selector  <── synced ──│   [Audio Visualizer] │
│   - School level  <── synced ──│   [Call Controls]    │
│   - Learning diffs <─ synced ──│                      │
└────────────────────────────────┴──────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/voice/onboarding-tools.ts` | Melissa prompts + handler |
| `src/lib/voice/voice-tool-commands.ts` | Unified VOICE_TOOLS |
| `src/lib/hooks/use-voice-session.ts` | Voice hook |
| `src/components/onboarding/voice-onboarding-panel.tsx` | Voice UI |
| `src/lib/stores/onboarding-store.ts` | State |

## Tool Calls

When Melissa hears student info:
- `set_student_name(name)` → Updates name
- `set_student_age(age)` → Updates age
- `set_school_level(level)` → Updates school
- `set_learning_differences(diffs)` → Updates diffs
- `next_onboarding_step()` / `prev_onboarding_step()` → Navigate

## Voice Session Config

Onboarding uses `far_field` noise reduction for echo suppression while keeping barge-in enabled:

```typescript
useVoiceSession({
  noiseReductionType: 'far_field',  // Echo cancellation for laptop speakers
  // Barge-in enabled by default - user can interrupt Melissa
});
```

| Option | Value | Purpose |
|--------|-------|---------|
| `noiseReductionType` | `'far_field'` | Filters speaker audio from mic input |
| `disableBargeIn` | `false` (default) | Allows interrupting Melissa |

## Fallback

When Azure unavailable: Web Speech API TTS (`use-onboarding-tts.ts`) with manual form input.
