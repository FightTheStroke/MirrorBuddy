# ADR 0069: Adaptive VAD for Accessibility Profiles

## Status

Accepted

## Date

2026-01-23

## Context

MirrorBuddy's voice conversation feature uses Azure OpenAI Realtime API with server-side Voice Activity Detection (VAD) to determine when a user has finished speaking. The default configuration uses fixed values:

- `threshold: 0.6` (audio energy level)
- `silence_duration_ms: 700` (milliseconds of silence before responding)
- `prefix_padding_ms: 300` (audio buffer before speech onset)

These values work well for neurotypical users with fluent speech patterns, but cause problems for students with specific learning differences (DSA):

### Problem Scenarios

1. **Dyslexia**: Word retrieval delays cause pauses of 1-2 seconds mid-sentence while searching for words. The 700ms timeout triggers AI responses prematurely, interrupting the student.

2. **ADHD**: Distraction-induced pauses and thought interruptions cause irregular speech patterns. Students may pause for 1.5+ seconds before completing their thought.

3. **Autism**: Atypical prosody (flat intonation, unusual pauses) confuses energy-based VAD. Processing time needs result in longer formulation pauses.

4. **Motor Impairment**: Articulation difficulties, weak voice projection, and breath control challenges require more sensitive detection and patience.

5. **Cerebral Palsy**: Combined motor and cognitive considerations require maximum tolerance and sensitivity.

### User Feedback

Students reported frustration with being "interrupted" during voice sessions, leading to:

- Repeated attempts to complete questions
- Abandonment of voice feature
- Preference for text chat despite voice being more accessible for some profiles

## Decision

Implement **profile-aware adaptive VAD configuration** that automatically adjusts voice detection parameters based on the user's active accessibility profile.

### Implementation

1. **New Module**: `src/lib/hooks/voice-session/adaptive-vad.ts`
   - Define VAD profiles for each DSA type
   - Export `getAdaptiveVadConfig()` function
   - Include noise reduction optimization per profile

2. **Integration**: Modify `session-config.ts` to use adaptive config
   - Read active profile from accessibility store
   - Apply profile-specific VAD settings to Azure API

3. **User Control**: Add `adaptiveVadEnabled` setting
   - Default: `true` (enabled)
   - Can be disabled if user prefers default behavior

### Profile Configurations

| Profile  | Threshold | Silence (ms) | Prefix (ms) | Noise Reduction | Rationale                      |
| -------- | --------- | ------------ | ----------- | --------------- | ------------------------------ |
| Default  | 0.6       | 700          | 300         | near_field      | Baseline for fluent speech     |
| Dyslexia | 0.55      | 1500         | 400         | near_field      | 2x patience for word retrieval |
| ADHD     | 0.6       | 1800         | 350         | far_field       | Tolerates distraction pauses   |
| Autism   | 0.5       | 1400         | 500         | near_field      | Handles atypical prosody       |
| Motor    | 0.45      | 2000         | 600         | far_field       | Very sensitive, max patience   |
| Visual   | 0.6       | 700          | 300         | near_field      | No speech impact               |
| Auditory | 0.55      | 900          | 350         | far_field       | Slight rhythm adjustment       |
| Cerebral | 0.4       | 2500         | 700         | far_field       | Maximum tolerance              |

### Noise Reduction Rationale

- **near_field**: Optimal for headphones or close microphone placement
- **far_field**: Better for users who:
  - Move frequently (ADHD fidgeting)
  - Use assistive devices (motor, cerebral palsy)
  - Use hearing aids (auditory impairment)

## Consequences

### Positive

1. **Improved UX for DSA students**: Reduced interruptions during voice sessions
2. **Automatic adaptation**: No manual tuning required by users
3. **Profile-consistent**: Leverages existing accessibility profile system
4. **Observability**: Logs active profile and VAD config for debugging
5. **Reversible**: Can be disabled per-user if needed

### Negative

1. **Increased response latency**: Profiles with longer silence duration will have slower AI responses when user has finished speaking
2. **Learning curve**: Users must select correct profile for optimal experience
3. **Testing complexity**: Need to test voice sessions with each profile

### Neutral

1. **No cost impact**: Same Azure API, different parameters
2. **No architectural changes**: Uses existing accessibility store

## Technical Details

### Files Changed

- `src/lib/hooks/voice-session/adaptive-vad.ts` (new)
- `src/lib/hooks/voice-session/session-config.ts` (modified)
- `src/lib/accessibility/accessibility-store/types.ts` (modified)
- `src/lib/accessibility/accessibility-store/defaults.ts` (modified)

### API Impact

None. Uses existing Azure Realtime API `turn_detection` configuration.

### Database Impact

None. `adaptiveVadEnabled` stored in existing accessibility settings JSON.

## Alternatives Considered

### 1. Semantic Turn Detection (LiveKit-style)

Use ML model to analyze speech content, not just timing.

**Rejected because**:

- Adds ~50-100ms latency
- Requires additional ML infrastructure
- LiveKit model not optimized for Italian
- Overkill for current needs

**Future consideration**: If profile-based VAD proves insufficient, can add semantic detection as Phase 2.

### 2. Manual VAD Tuning

Let users manually adjust threshold/timing sliders.

**Rejected because**:

- Too technical for student users
- Requires understanding of audio engineering
- Profiles provide expert-tuned defaults

### 3. Disable VAD Entirely (Push-to-Talk)

Require users to press button when done speaking.

**Rejected because**:

- Reduces accessibility for motor-impaired users
- Interrupts natural conversation flow
- Already available as option via `disableBargeIn`

## Validation

### Unit Tests

- `src/lib/hooks/voice-session/__tests__/adaptive-vad.test.ts`
- Tests for all profile configs, validation, formatting

### Manual Testing Checklist

- [ ] Voice session with dyslexia profile: No interruption during 1.5s pause
- [ ] Voice session with ADHD profile: Tolerates distraction pauses
- [ ] Voice session with default profile: Responsive as before
- [ ] Setting toggle works: Disabling falls back to default config
- [ ] Logs show active profile and VAD config

## References

- [Azure OpenAI Realtime API - Turn Detection](https://learn.microsoft.com/en-us/azure/ai-services/openai/realtime-audio-reference)
- [LiveKit Turn Detection Model](https://github.com/livekit/agents) - Inspiration for semantic approach
- ADR 0015: State Management (Zustand stores)
- ADR 0060: Instant Accessibility Feature

## Notes

This is Phase 1 of voice accessibility improvements. Phase 2 may include:

- Semantic turn detection for edge cases
- Per-session feedback learning
- Voice command to extend silence timeout ("aspetta...")
