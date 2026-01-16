# ADR 0042: Vocal Prosody Frustration Detection

## Status

Accepted (Implemented 2026-01-16)

## Context

The adaptive difficulty engine (ADR 0041) detects frustration through text patterns.
However, voice input is transcribed to text before analysis, losing prosodic information
(tone, pitch, pace, volume) that strongly indicates emotional state.

Students may sound frustrated without using specific phrases. A sigh, raised voice,
or hesitant speech pattern reveals frustration more reliably than words alone.

## Decision

Enhance frustration detection with prosodic analysis of voice input, implemented
in three phases to balance effort against accuracy gains.

## Proposed Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Voice Stream   │────>│  Azure Speech    │────>│  Transcription  │
│  (WebRTC)       │     │  Recognition     │     │  (text)         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                │
         │              ┌──────────────────┐              │
         └─────────────>│  Prosody         │              │
                        │  Analyzer        │              │
                        └──────────────────┘              │
                                 │                        │
                                 v                        v
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Frustration     │<────│  Text Pattern   │
                        │  Score (0-1)     │     │  Detection      │
                        └──────────────────┘     └─────────────────┘
```

## Prosodic Indicators of Frustration

| Indicator | Normal Range | Frustrated Range | Weight |
|-----------|--------------|------------------|--------|
| Speech rate | 120-150 wpm | <100 or >180 wpm | 0.2 |
| Pitch variance | Medium | High (erratic) | 0.25 |
| Volume | Stable | Increasing/shouting | 0.2 |
| Pause frequency | Low | High (sighs, hesitation) | 0.2 |
| Filler words | Few | Many ("uhm", "ehm") | 0.15 |

## Implementation Options

### Option A: Azure Speech SDK with Pronunciation Assessment

```typescript
const speechConfig = SpeechConfig.fromSubscription(key, region);
speechConfig.setProfanity(ProfanityOption.Raw);
speechConfig.setProperty(
  PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
  "5000"
);

const audioConfig = AudioConfig.fromWavFileInput(audioBuffer);
const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

recognizer.recognized = (s, e) => {
  const result = e.result;
  // Extract NBest[0].Words with timing and confidence
  // Analyze gaps between words (hesitation)
  // Track confidence drops (mumbling/frustration)
};
```

**Pros**: Already using Azure, no new vendor
**Cons**: Limited prosody features, mainly for pronunciation

### Option B: Custom Audio Analysis Pipeline

```typescript
interface ProsodyFeatures {
  pitchMean: number;
  pitchVariance: number;
  volumeRMS: number;
  speechRate: number;
  pauseRatio: number;
  fillerCount: number;
}

async function analyzeProsody(audioChunk: Float32Array): Promise<ProsodyFeatures> {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();

  // Pitch detection via autocorrelation
  const pitchData = detectPitch(audioChunk);

  // Volume via RMS
  const rms = Math.sqrt(
    audioChunk.reduce((sum, x) => sum + x * x, 0) / audioChunk.length
  );

  return { pitchMean, pitchVariance, volumeRMS, speechRate, pauseRatio, fillerCount };
}
```

**Pros**: Full control, real-time, no API costs
**Cons**: Complex, needs ML model for accuracy

### Option C: Specialized Emotion API (Hume AI, Vokaturi)

```typescript
const response = await fetch('https://api.hume.ai/v0/batch/jobs', {
  method: 'POST',
  headers: { 'X-Hume-Api-Key': process.env.HUME_API_KEY },
  body: formData
});

// Returns: frustration, confusion, joy, etc. with confidence scores
```

**Pros**: Highest accuracy, trained on emotion data
**Cons**: Additional vendor, API costs, latency

## Recommended Phased Approach

### Phase 1: Enhanced Text Detection (Low Effort)

- Add more Italian frustration phrases to pattern list
- Detect repeated failed attempts (same question asked 3+ times)
- Track conversation sentiment trend over time
- **Estimated impact**: +10% detection accuracy

### Phase 2: Azure Speech Enhancements (Medium Effort)

- Use word-level timing to detect hesitation
- Track confidence scores as proxy for clarity
- Detect long pauses (>2s) and sighs
- **Estimated impact**: +20% detection accuracy
- **Dependencies**: Azure Speech SDK already integrated

### Phase 3: Custom Prosody Pipeline (High Effort)

- Implement pitch/volume analysis with Web Audio API
- Train simple classifier on labeled frustration data
- Run client-side for low latency
- **Estimated impact**: +30% detection accuracy
- **Dependencies**: Labeled training data, ML expertise

## Implementation

All three phases implemented in `src/lib/education/frustration-detection/`:

### Phase 1: i18n Text Detection
- **Module**: `patterns/` - Supports IT, EN, ES, FR, DE languages
- **Module**: `tracker.ts` - Repeated attempts with fuzzy matching, trend tracking
- **Key**: Unicode-aware filler counting, weighted locale detection

### Phase 2: Azure Speech Timing
- **Module**: `azure-timing/` - Parses Azure NBest word timings
- **Features**: Pause detection (micro/short/medium/long/sigh), hesitation score
- **Key**: Speech rate estimation, confidence tracking

### Phase 3: Client-side Prosody
- **Module**: `prosody/` - Web Audio API pitch detection (autocorrelation)
- **Module**: `classifier.ts` - Unified classifier combining all signals
- **Features**: RMS volume, pitch variance, emotional inference, real-time monitor

### Test Coverage
- **69 unit tests** across 5 test files
- Tests cover: locale detection, pattern matching, pause categorization, pitch detection

## Consequences

### Positive

- More accurate frustration detection reduces false negatives
- Earlier intervention prevents student abandonment
- Non-verbal cues captured that text misses
- Phased approach allows incremental validation

### Negative

- Increased complexity in voice processing pipeline
- Privacy considerations for audio analysis
- Phase 3 requires labeled training data
- Potential latency impact on real-time adaptation

## Privacy Considerations

- Audio analysis should happen client-side when possible
- No raw audio stored beyond session
- Prosody features (aggregated metrics) are less sensitive than transcripts
- Clear disclosure in privacy policy if using third-party emotion APIs

## References

- [Affective Computing and Intelligent Interaction](https://ieeexplore.ieee.org/document/8925463)
- [Azure Speech SDK Pronunciation Assessment](https://docs.microsoft.com/azure/cognitive-services/speech-service/how-to-pronunciation-assessment)
- [Hume AI Emotion Recognition](https://www.hume.ai/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [ADR 0041: Adaptive Difficulty Engine](./0041-adaptive-difficulty-engine.md)
