# Azure OpenAI Realtime API - Technical Documentation

> **IMPORTANT**: This documentation reflects REAL problems we solved in production.
> NOT theoretical docs - these are VERIFIED fixes.
>
> **Last validated**: 2025-12-30

## Table of Contents

1. [Overview](#overview)
2. [**CRITICAL: Preview vs GA API**](#critical-preview-vs-ga-api)
3. [WebSocket Proxy Architecture](#websocket-proxy-architecture)
4. [Audio Format](#audio-format)
5. [Resampling 48kHz → 24kHz](#resampling-48khz--24khz)
6. [Common Errors and Solutions](#common-errors-and-solutions)
7. [Testing and Debug](#testing-and-debug)
8. [**CRITICAL BUG: Stale Closure in React Hook**](#critical-bug-stale-closure-in-react-hook)
9. [**CRITICAL BUG: WebSocket Blob vs String**](#critical-bug-websocket-blob-vs-string)
10. [Device Selection (Microphone and Speaker)](#device-selection-microphone-and-speaker)
11. [Barge-in (Auto-Interruption)](#barge-in-auto-interruption)
12. [VAD Tuning](#vad-tuning-voice-activity-detection)
13. [Browser Compatibility](#browser-compatibility)
14. [Z-Index Modal Hierarchy](#z-index-modal-hierarchy)

---

## Overview

The app uses Azure OpenAI Realtime API for real-time voice conversations with maestros.
Architecture:

```
Browser (48kHz) → WebSocket Proxy (port 3001) → Azure OpenAI Realtime API
                       ↑
                  API Key here
                  (never exposed to client)
```

**Key files:**
- `src/server/realtime-proxy.ts` - WebSocket proxy
- `src/lib/hooks/use-voice-session.ts` - Main voice hook
- `src/app/test-voice/page.tsx` - Test/debug page

---

## CRITICAL: Preview vs GA API

> ⚠️ **THIS BUG COST US HOURS OF DEBUGGING** ⚠️
>
> Azure has TWO versions of the Realtime API with DIFFERENT event names!
> If your code expects the wrong event, audio WILL NEVER PLAY.

### The Two APIs

| Aspect | Preview API | GA API |
|--------|-------------|--------|
| **Deployment** | `gpt-4o-realtime-preview` | `gpt-realtime` |
| **URL Path** | `/openai/realtime` | `/openai/v1/realtime` |
| **API Version param** | `api-version=2025-04-01-preview` | NO param |
| **Model param** | `deployment=...` | `model=...` |

### Event Names - THE CRITICAL DIFFERENCE

| Event | Preview API | GA API |
|-------|-------------|--------|
| Audio chunk | `response.audio.delta` | `response.output_audio.delta` |
| Audio completed | `response.audio.done` | `response.output_audio.done` |
| Transcript chunk | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |
| Transcript completed | `response.audio_transcript.done` | `response.output_audio_transcript.done` |

### How to Handle Both (SOLUTION)

In your message handler, use switch with BOTH cases:

```typescript
switch (event.type) {
  // Handle BOTH formats!
  case 'response.output_audio.delta':  // GA API
  case 'response.audio.delta':         // Preview API
    playAudio(event.delta);
    break;

  case 'response.output_audio.done':   // GA API
  case 'response.audio.done':          // Preview API
    console.log('Audio complete');
    break;

  case 'response.output_audio_transcript.delta':  // GA API
  case 'response.audio_transcript.delta':         // Preview API
    showStreamingText(event.delta);
    break;
}
```

### How to Know Which You're Using

Check your Azure deployment name:
- Contains `4o` or `preview`? → **Preview API**
- Otherwise → **GA API**

The proxy (`realtime-proxy.ts` line 61) does this detection automatically:

```typescript
const isPreviewModel = azureDeployment.includes('4o') || azureDeployment.includes('preview');
```

### Implementation References

- **Proxy detection**: `src/server/realtime-proxy.ts:61-74`
- **Event handling**: `src/lib/hooks/use-voice-session.ts:627-671`

---

## session.update Format

> ⚠️ **UNCERTAINTY NOTE**: We're using Preview API (`gpt-4o-realtime-preview`).
> The format below is what WORKS in our code. The exact requirements may differ for GA API.

### What Works (Preview API - VERIFIED)

```typescript
{
  type: 'session.update',
  session: {
    voice: 'alloy',                   // FLAT in session (not in audio.output)
    instructions: 'You are...',
    input_audio_format: 'pcm16',
    input_audio_transcription: {
      model: 'whisper-1',
      language: 'it',                 // Force transcription language
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.4,
      prefix_padding_ms: 300,
      silence_duration_ms: 400,
      create_response: true,
    },
    tools: [...],                     // Optional: function calling
  }
}
```

### What We DON'T Use (But Documentation Mentions)

These fields appear in Azure docs but we DON'T include them and it works:

| Field | Status | Note |
|-------|--------|------|
| `session.type: 'realtime'` | Not used | Works without it for Preview API |
| `modalities: ['text', 'audio']` | Not used | Azure may use default |
| `output_audio_format` | Not used | Defaults to pcm16 |

> **HONESTY**: We're not 100% certain these are optional. They may be required for GA API.
> Our code works with Preview API without them. If you switch to GA, verify.

### Implementation Reference

- **Session config**: `src/lib/hooks/use-voice-session.ts:515-538`

---

## WebSocket Proxy Architecture

### Why a Proxy?

1. **Security**: API key never exposed to browser
2. **CORS**: Azure doesn't support WebSocket from browser directly
3. **Logging**: Server-side debug of messages

### Message Flow

```
Client                    Proxy                     Azure
  │                         │                         │
  │─── connect ───────────→│                         │
  │                         │─── connect ───────────→│
  │                         │←── session.created ────│
  │←── proxy.ready ─────────│                         │
  │←── session.created ─────│                         │
  │                         │                         │
  │─── session.update ─────→│                         │
  │    (JSON as text)       │─── session.update ────→│
  │                         │    (MUST be text)      │
  │                         │←── session.updated ────│
  │←── session.updated ─────│                         │
```

### CRITICAL BUG FIXED: Buffer vs String

**Problem**: Proxy received messages as `Buffer` and forwarded as binary.
Azure REJECTS JSON sent as binary.

**Symptom**: session.update worked via websocat but failed via proxy.

**Fix** (`src/server/realtime-proxy.ts:142-157`):

```typescript
// ❌ WRONG - sends as binary
backendWs.send(data);

// ✅ CORRECT - convert to string for JSON
clientWs.on('message', (data: Buffer) => {
  const msg = data.toString('utf-8');
  try {
    JSON.parse(msg);  // Is it JSON?
    backendWs.send(msg);  // Send as TEXT
  } catch {
    backendWs.send(data); // Non-JSON (raw audio) → binary OK
  }
});
```

---

## Audio Format

### Technical Specifications

| Direction | Sample Rate | Format | Encoding |
|-----------|-------------|--------|----------|
| Input (browser → Azure) | 24000 Hz | PCM16 signed | base64 |
| Output (Azure → browser) | 24000 Hz | PCM16 signed | base64 |

### Audio Input Message

```typescript
{
  type: 'input_audio_buffer.append',
  audio: 'BASE64_ENCODED_PCM16_24KHZ'
}
```

### Audio Output Message

```typescript
// Azure sends incremental chunks
{
  type: 'response.audio.delta',  // or response.output_audio.delta for GA
  delta: 'BASE64_ENCODED_PCM16_24KHZ'
}

// Parallel transcription
{
  type: 'response.audio_transcript.delta',
  delta: 'partial text...'
}
```

---

## Resampling 48kHz → 24kHz

### The Problem

Browsers use `AudioContext` which defaults to 48000 Hz.
Azure requires EXACTLY 24000 Hz.

**If you send 48kHz**: Azure won't understand the audio, no speech detection.

### Solution: Linear Interpolation

```typescript
function resample(inputData: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return inputData;

  const ratio = fromRate / toRate;  // 48000/24000 = 2
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation between two samples
    output[i] = inputData[srcIndexFloor] * (1 - fraction) +
                inputData[srcIndexCeil] * fraction;
  }

  return output;
}
```

### Implementation Reference

- **Resample function**: `src/lib/hooks/use-voice-session.ts:165-178`
- **Capture context**: `src/lib/hooks/use-voice-session.ts:371-372`

---

## Playback Audio (Azure → Speaker)

### The Problem

Azure sends audio as base64 PCM16 in chunks.
You must:
1. Decode base64
2. Convert PCM16 → Float32
3. Play with Web Audio API at 24kHz

### Implementation

```typescript
const AZURE_SAMPLE_RATE = 24000;

// Create playback context at 24kHz (CRITICAL!)
const playbackContext = new AudioContext({ sampleRate: AZURE_SAMPLE_RATE });

// Decode and play
function playAudioChunk(base64Audio: string) {
  // Base64 → Int16Array
  const audioData = base64ToInt16Array(base64Audio);

  // Int16 → Float32
  const float32Data = int16ToFloat32(audioData);

  // Create buffer at 24kHz
  const buffer = playbackContext.createBuffer(1, float32Data.length, AZURE_SAMPLE_RATE);
  buffer.getChannelData(0).set(float32Data);

  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackContext.destination);
  source.start();
}
```

### Implementation Reference

- **Playback context**: `src/lib/hooks/use-voice-session.ts:269`
- **playNextChunk**: `src/lib/hooks/use-voice-session.ts:292-332`

---

## Common Errors and Solutions

### 1. Audio not playing but WebSocket works?

**Check which API you're using (Preview vs GA)**
- Verify you handle BOTH event types
- File: `src/lib/hooks/use-voice-session.ts:627-671`

### 2. session.update fails?

**Check the format (Preview uses different structure than GA)**
- For Preview: flat structure, no `type: 'realtime'` needed
- File: `src/app/test-voice/page.tsx` for manual testing

### 3. Proxy doesn't connect to Azure?

**Check env vars:**
```bash
AZURE_OPENAI_REALTIME_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
```
- File: `src/server/realtime-proxy.ts:31-84`

### 4. Audio distorted or too fast/slow?

**AudioContext playback MUST be 24kHz:**
```typescript
// ❌ WRONG - uses system default
const ctx = new AudioContext();

// ✅ CORRECT - force 24kHz
const ctx = new AudioContext({ sampleRate: 24000 });
```

### 5. Audio sent but Azure doesn't respond?

**Possible causes:**
1. Wrong sample rate (must be 24kHz)
2. VAD threshold too high
3. Audio too quiet

**Debug:**
```typescript
console.log(audioContext.sampleRate); // Must be 24000 after resample
```

---

## Testing and Debug

### 1. Direct test with websocat

Bypass the app to test Azure directly:

```bash
# Install websocat
brew install websocat

# Connect directly to Azure (replace with your values)
websocat "wss://YOUR-RESOURCE.openai.azure.com/openai/realtime?api-version=2025-04-01-preview&deployment=gpt-4o-realtime-preview&api-key=YOUR_KEY"

# Send session.update
{"type":"session.update","session":{"voice":"alloy","instructions":"Test"}}
```

If it works here but not in app → problem in proxy or client.

### 2. Proxy logs

Logs appear in console when running `npm run dev`:

```
[INFO] Client connected: UUID for maestro: test-debug
[INFO] Backend WebSocket OPEN for UUID
[DEBUG] Backend -> Client [session.created]
[INFO] Client -> Backend [session.update]: {"type":"session.update"...
[DEBUG] Backend -> Client [session.updated]   ← If you see this, it works!
[DEBUG] Backend -> Client [error]             ← If you see this, read the message
```

### 3. Test page

Go to `/test-voice` for interactive debug:
- Isolated microphone test
- Manual WebSocket connection
- All message logging
- Audio waveform visualization

---

## CRITICAL BUG: Stale Closure in React Hook

> ⚠️ **THIS BUG DROVE US CRAZY** ⚠️
>
> VoiceSession component didn't work while test-voice page worked perfectly.
> Same WebSocket code, same events - but one worked and one didn't!

### The Problem

In a React hook with `useCallback`, when you do:

```typescript
const handleServerEvent = useCallback((event) => {
  // uses state like `messages`, `currentResponse`, etc.
}, [messages, currentResponse, ...]);

const connect = useCallback(() => {
  ws.onmessage = (event) => {
    handleServerEvent(JSON.parse(event.data));  // ❌ CAPTURES OLD VERSION!
  };
}, [handleServerEvent]);
```

The problem: `ws.onmessage` captures the version of `handleServerEvent` that existed AT CONNECTION TIME.
When dependencies change, `handleServerEvent` is re-created, but `ws.onmessage` still uses the old version!

### Symptoms

- Test page works (uses inline callback)
- VoiceSession doesn't work (uses useCallback)
- WebSocket events arrive (visible in logs)
- `handleServerEvent` doesn't process events (state never updates)

### The Solution: useRef Pattern

```typescript
// 1. Create a ref to hold the latest callback version
const handleServerEventRef = useRef<((event: Record<string, unknown>) => void) | null>(null);

// 2. Update the ref every time the callback changes
useEffect(() => {
  handleServerEventRef.current = handleServerEvent;
}, [handleServerEvent]);

// 3. In ws.onmessage, use the ref instead of the callback directly
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  if (handleServerEventRef.current) {
    handleServerEventRef.current(data);  // ✅ ALWAYS THE LATEST VERSION!
  }
};
```

### Implementation Reference

- **Ref declaration**: `src/lib/hooks/use-voice-session.ts:249`
- **Ref update effect**: `src/lib/hooks/use-voice-session.ts:819-823`
- **Usage in ws.onmessage**: `src/lib/hooks/use-voice-session.ts:916-918`

---

## CRITICAL BUG: WebSocket Blob vs String

### The Problem

In some browsers/contexts, `ws.onmessage` receives data as `Blob` instead of `string`.

```typescript
// ❌ WRONG - only works if data is string
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);  // ERROR if event.data is Blob!
};

// ✅ CORRECT - handles both cases
ws.onmessage = async (event) => {
  let msgText: string;

  if (event.data instanceof Blob) {
    msgText = await event.data.text();  // Convert Blob → string
  } else if (typeof event.data === 'string') {
    msgText = event.data;
  } else {
    console.log('Binary data, skipping');
    return;
  }

  const data = JSON.parse(msgText);
  // ... process data
};
```

### How to Know if This is Your Problem

```typescript
ws.onmessage = (event) => {
  console.log('Data type:', typeof event.data);
  console.log('Is Blob:', event.data instanceof Blob);
  // If you see "Is Blob: true" → you need to handle it!
};
```

### Implementation Reference

- **Blob handling**: `src/lib/hooks/use-voice-session.ts:899-912`

---

## Device Selection (Microphone and Speaker)

### Select Specific Microphone

```typescript
// Enumerate devices (requires permission)
await navigator.mediaDevices.getUserMedia({ audio: true });  // Request permission
const devices = await navigator.mediaDevices.enumerateDevices();
const microphones = devices.filter(d => d.kind === 'audioinput');

// Use specific device
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: { ideal: selectedMicrophoneId }  // 'ideal' falls back if unavailable
  }
});
```

### Select Specific Speaker (Chrome 110+)

```typescript
// Enumerate output devices
const speakers = devices.filter(d => d.kind === 'audiooutput');

// Option 1: AudioContext with sinkId (Chrome 110+)
const ctx = new AudioContext({
  sampleRate: 24000,
  sinkId: selectedSpeakerId  // May not be supported
});

// Option 2: setSinkId (more compatible)
if ('setSinkId' in audioContext) {
  await audioContext.setSinkId(selectedSpeakerId);
}
```

### Listen for Device Changes

```typescript
useEffect(() => {
  const handleDeviceChange = () => {
    enumerateDevices();  // Re-enumerate when user plugs/unplugs
  };

  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  };
}, []);
```

---

## Barge-in (Auto-Interruption)

### What is Barge-in?

Barge-in allows the user to interrupt the maestro while speaking, like in a natural conversation. Without this, the user must wait for the maestro to finish.

### Implementation

When user starts speaking (`input_audio_buffer.speech_started`), if maestro is speaking (`isSpeaking === true`):

1. Send `response.cancel` to Azure to stop generation
2. Clear audio queue (`audioQueueRef.current = []`)
3. Stop playback (`isPlayingRef.current = false`)
4. Update UI state (`setSpeaking(false)`)

```typescript
case 'input_audio_buffer.speech_started':
  console.log('[VoiceSession] User speech detected');
  setListening(true);

  // AUTO-INTERRUPT: If maestro is speaking, stop them (barge-in)
  if (voiceBargeInEnabled && hasActiveResponseRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
    console.log('[VoiceSession] Barge-in detected - interrupting assistant');
    wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
    hasActiveResponseRef.current = false;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setSpeaking(false);
  }
  break;
```

### Implementation Reference

- **Barge-in logic**: `src/lib/hooks/use-voice-session.ts:582-602`

---

## VAD Tuning (Voice Activity Detection)

### Optimized Parameters

| Parameter | Previous | Optimized | Effect |
|-----------|----------|-----------|--------|
| `threshold` | 0.5 | 0.4 | More sensitive to soft voices |
| `silence_duration_ms` | 500 | 400 | Faster turn-taking |

### Configuration

```typescript
turn_detection: {
  type: 'server_vad',
  threshold: 0.4,            // Microphone sensitivity
  prefix_padding_ms: 300,    // Audio before speech
  silence_duration_ms: 400,  // Pause for end of turn
  create_response: true,
}
```

### Considerations

- **Lower threshold**: Catches quieter voices, but may increase false positives in noisy environments
- **Lower silence_duration_ms**: Faster response, but may interrupt natural speech pauses

---

## Browser Compatibility

### Supported Browsers

| Browser | Windows | macOS | Linux | Note |
|---------|---------|-------|-------|------|
| Chrome 110+ | ✅ | ✅ | ✅ | Full support including setSinkId |
| Edge 110+ | ✅ | ✅ | ✅ | Full support like Chrome |
| Firefox | ⚠️ | ⚠️ | ⚠️ | Works, but NO speaker output selection |
| Safari 14.1+ | ⚠️ | ⚠️ | N/A | Works, but NO speaker output selection |
| Safari iOS | ⚠️ | N/A | N/A | Requires user gesture for AudioContext |

### Feature Support Matrix

| Feature | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| getUserMedia (mic) | ✅ | ✅ | ✅ |
| enumerateDevices | ✅ | ✅ | ✅ |
| AudioContext | ✅ | ✅ | ✅ (webkitAudioContext) |
| **setSinkId** (output device) | ✅ | ❌ | ❌ |
| WebSocket | ✅ | ✅ | ✅ |
| ScriptProcessorNode | ✅ | ✅ | ✅ |

### Fallbacks Implemented

#### 1. webkitAudioContext (Safari)

```typescript
const AudioContextClass = window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
```

#### 2. setSinkId (Firefox, Safari)

```typescript
if ('setSinkId' in audioContext) {
  await audioContext.setSinkId(selectedOutputDevice);
} else {
  console.warn('Output device selection not supported, using system default');
}
```

---

## Z-Index Modal Hierarchy

When voice session is active, other modals (webcam, tools) must appear ABOVE:

```
z-50: Voice Session Modal (main overlay)
z-[60]: Webcam Capture Modal (above voice session)
z-[70]: Tool Preview Modal (above everything)
```

**Important**: If a modal appears BELOW voice session, increase its z-index.

---

## Environment Variables

```bash
# .env.local

# Azure OpenAI Realtime (for voice)
AZURE_OPENAI_REALTIME_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key-here
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview

# WebSocket proxy port
WS_PROXY_PORT=3001
```

---

## Pre-Deploy Checklist

- [ ] Voice in flat `session.voice` (Preview API)
- [ ] Proxy converts Buffer to string for JSON
- [ ] Resampling 48kHz → 24kHz implemented
- [ ] Playback context at 24kHz
- [ ] API key in query string URL, not header
- [ ] VAD type is `server_vad`
- [ ] Handle BOTH Preview and GA event types
- [ ] Z-index modals correct
- [ ] handleServerEventRef pattern for stale closure
- [ ] Blob handling in ws.onmessage

---

## Problem History

| Date | Problem | Solution |
|------|---------|----------|
| 2025-12-28 | session.update rejected | Added `type: 'realtime'` (GA API) |
| 2025-12-28 | voice not recognized | Moved to `audio.output.voice` (GA API) |
| 2025-12-28 | Proxy sends binary | Buffer → string conversion |
| 2025-12-28 | Audio not detected | Resampling 48k→24k |
| 2025-12-28 | No output sound | Implemented 24kHz playback |
| 2025-12-29 | **Audio received but not played** | Preview API uses `response.audio.delta` not `response.output_audio.delta` |
| 2025-12-29 | **VoiceSession doesn't work but test page does** | Stale closure bug - fixed with useRef pattern |
| 2025-12-29 | **ws.onmessage doesn't receive events** | WebSocket sends Blob, code expected String |
| 2025-12-30 | session.update format confusion | Clarified: current code uses Preview API flat format |

---

## Uncertainties and Known Gaps

> **HONESTY SECTION**: These are things we're NOT 100% certain about.

1. **GA API vs Preview API requirements**: We're using Preview API. If you switch to GA API (`gpt-realtime` without `4o`), you may need:
   - `session.type: 'realtime'`
   - `modalities: ['text', 'audio']`
   - `voice` in `audio.output.voice` instead of flat
   - **We have NOT tested GA API recently.**

2. **ScriptProcessorNode deprecation**: We use ScriptProcessorNode which is deprecated. AudioWorklet would be better but requires more work. Current implementation works in all browsers.

3. **WebSocket binary mode**: Not fully tested. If Azure ever switches to binary WebSocket mode, our current text-based handling might need updates.

---

## Debug Checklist

1. **Audio not playing but WebSocket works?**
   - Check Preview vs GA API event types
   - Handle BOTH in switch statement
   - File: `src/lib/hooks/use-voice-session.ts:627-671`

2. **session.update fails?**
   - Check format (Preview vs GA have different structures)
   - File: `src/app/test-voice/page.tsx` for manual testing

3. **Proxy doesn't connect to Azure?**
   - Check env vars: `AZURE_OPENAI_REALTIME_*`
   - File: `src/server/realtime-proxy.ts:31-84`

4. **Audio distorted or too fast?**
   - AudioContext playback MUST be 24kHz
   - File: `src/lib/hooks/use-voice-session.ts:269`

5. **VoiceSession component doesn't work but test page does?**
   - Likely stale closure bug
   - Verify `handleServerEventRef` is used in `ws.onmessage`
   - File: `src/lib/hooks/use-voice-session.ts:249, 819-823, 916-918`

6. **WebSocket events arrive as Blob?**
   - Add `event.data instanceof Blob` handling
   - Use `await event.data.text()` to convert
   - File: `src/lib/hooks/use-voice-session.ts:899-912`

7. **Wrong microphone selected?**
   - Use `/test-voice` to select device
   - Verify with waveform that correct mic is active

---

*Document created after 2+ days of debugging. DON'T REPEAT OUR MISTAKES!*
