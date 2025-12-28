# Azure OpenAI Realtime API - Documentazione Tecnica

> **ATTENZIONE**: Questa documentazione riporta problemi reali che abbiamo risolto.
> NON è documentazione teorica - sono fix verificati in produzione.

## Indice

1. [Panoramica](#panoramica)
2. [Requisiti Azure GA (2025-08-28)](#requisiti-azure-ga-2025-08-28)
3. [Architettura WebSocket Proxy](#architettura-websocket-proxy)
4. [Formato Audio](#formato-audio)
5. [Resampling 48kHz → 24kHz](#resampling-48khz--24khz)
6. [Errori Comuni e Soluzioni](#errori-comuni-e-soluzioni)
7. [Testing e Debug](#testing-e-debug)

---

## Panoramica

L'app usa Azure OpenAI Realtime API per conversazioni vocali real-time con i maestri.
L'architettura è:

```
Browser (48kHz) → WebSocket Proxy (port 3001) → Azure OpenAI Realtime API
                       ↑
                  API Key qui
                  (mai esposta al client)
```

**File chiave:**
- `src/server/realtime-proxy.ts` - Proxy WebSocket
- `src/lib/hooks/use-voice-session.ts` - Hook principale per voice
- `src/app/test-voice/page.tsx` - Pagina di test/debug

---

## Requisiti Azure GA (2025-08-28)

### session.update - Formato VERIFICATO FUNZIONANTE

```typescript
{
  type: 'session.update',
  session: {
    modalities: ['text', 'audio'],   // ⚠️ OBBLIGATORIO per output audio
    voice: 'alloy',                   // ⚠️ FLAT, direttamente in session
    instructions: 'Sei un assistente...',
    input_audio_format: 'pcm16',      // Formato audio input
    output_audio_format: 'pcm16',     // Formato audio output
    input_audio_transcription: {      // ⚠️ FLAT, non in audio.input!
      model: 'whisper-1'
    },
    turn_detection: {                 // ⚠️ FLAT, non in audio.input!
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,       // 500ms funziona meglio
      create_response: true
    },
    tools: [...]                      // Tools per function calling
  }
}
```

### Differenze rispetto a OpenAI diretto

| Parametro | OpenAI Beta | Azure GA (verificato) |
|-----------|-------------|----------|
| `modalities` | `['text', 'audio']` | **OBBLIGATORIO**: `['text', 'audio']` |
| `voice` | In `session.voice` | In `session.voice` (FLAT) |
| `turn_detection` | In `audio.input.turn_detection` | In `session.turn_detection` (FLAT) |
| `transcription` | In `audio.input.transcription` | In `session.input_audio_transcription` (FLAT) |
| `turn_detection.type` | `semantic_vad` | `server_vad` |
| API Key | Header `Authorization` | Query string `api-key=XXX` |
| Audio format | Nested in `audio.input/output` | Flat: `input_audio_format`, `output_audio_format` |

**IMPORTANTE**: Azure GA usa struttura FLAT, NON nested!

### URL WebSocket Azure

```typescript
// Costruzione URL
const url = new URL(azureEndpoint);
url.pathname = '/openai/v1/realtime';
url.searchParams.set('model', deployment);      // es: 'gpt-4o-realtime'
url.searchParams.set('api-key', apiKey);        // API key in query string!

// Risultato:
// wss://YOUR-RESOURCE.openai.azure.com/openai/v1/realtime?model=gpt-4o-realtime&api-key=XXX
```

---

## Architettura WebSocket Proxy

### Perché un proxy?

1. **Sicurezza**: API key mai esposta al browser
2. **CORS**: Azure non supporta WebSocket dal browser direttamente
3. **Logging**: Debug server-side dei messaggi

### Flow dei messaggi

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
  │    (JSON come testo)    │─── session.update ────→│
  │                         │    (DEVE essere testo) │
  │                         │←── session.updated ────│
  │←── session.updated ─────│                         │
  │                         │                         │
  │─── audio.append ───────→│                         │
  │    (base64 PCM16)       │─── audio.append ──────→│
  │                         │←── speech_started ─────│
  │←── speech_started ──────│                         │
  │                         │←── audio.delta ────────│
  │←── audio.delta ─────────│    (base64 PCM16)      │
```

### BUG CRITICO RISOLTO: Buffer vs String

**Problema**: Il proxy riceveva messaggi come `Buffer` e li inoltrava come binario.
Azure RIFIUTA messaggi JSON inviati come binario.

**Sintomo**: session.update funzionava via websocat ma falliva via proxy.

**Fix** (`src/server/realtime-proxy.ts` linee 113-128):

```typescript
// ❌ SBAGLIATO - invia come binario
backendWs.send(data);

// ✅ CORRETTO - converti a stringa per JSON
clientWs.on('message', (data: Buffer) => {
  const msg = data.toString('utf-8');
  try {
    JSON.parse(msg);  // È JSON?
    backendWs.send(msg);  // Invia come TESTO
  } catch {
    backendWs.send(data); // Non-JSON (audio raw) → binario OK
  }
});
```

---

## Formato Audio

### Specifiche tecniche

| Direzione | Sample Rate | Formato | Encoding |
|-----------|-------------|---------|----------|
| Input (browser → Azure) | 24000 Hz | PCM16 signed | base64 |
| Output (Azure → browser) | 24000 Hz | PCM16 signed | base64 |

### Messaggio audio input

```typescript
{
  type: 'input_audio_buffer.append',
  audio: 'BASE64_ENCODED_PCM16_24KHZ'
}
```

### Messaggio audio output

```typescript
// Azure invia chunks incrementali
{
  type: 'response.output_audio.delta',
  delta: 'BASE64_ENCODED_PCM16_24KHZ'
}

// Trascrizione in parallelo
{
  type: 'response.output_audio_transcript.delta',
  delta: 'testo parziale...'
}

// Fine risposta
{
  type: 'response.done'
}
```

---

## Resampling 48kHz → 24kHz

### Il problema

I browser usano `AudioContext` che di default opera a 48000 Hz.
Azure richiede ESATTAMENTE 24000 Hz.

**Se invii 48kHz**: Azure non capisce l'audio, non rileva speech.

### Soluzione: Linear Interpolation

```typescript
function resample(inputData: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return inputData;

  const ratio = fromRate / toRate;  // 48000/24000 = 2
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    // Calcola posizione nel buffer sorgente
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Interpolazione lineare tra due sample
    output[i] = inputData[srcIndexFloor] * (1 - fraction) +
                inputData[srcIndexCeil] * fraction;
  }

  return output;
}
```

### Conversione Float32 → PCM16

```typescript
function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp a [-1, 1] e scala a [-32768, 32767]
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = sample < 0
      ? sample * 32768
      : sample * 32767;
  }
  return int16Array;
}
```

### Encode base64

```typescript
function int16ArrayToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

---

## Playback Audio (Azure → Speaker)

### Il problema

Azure invia audio come base64 PCM16 in chunks.
Devi:
1. Decodificare base64
2. Convertire PCM16 → Float32
3. Riprodurre con Web Audio API

### Implementazione

```typescript
// Coda per gestire chunks asincroni
const audioQueue: Float32Array[] = [];
let isPlaying = false;
const playbackContext = new AudioContext({ sampleRate: 24000 });

// Decodifica e accoda
function queueAudio(base64Audio: string) {
  // Base64 → bytes
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PCM16 → Float32
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }

  audioQueue.push(float32);
  if (!isPlaying) playNext();
}

// Riproduci sequenzialmente
function playNext() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const samples = audioQueue.shift()!;

  const buffer = playbackContext.createBuffer(1, samples.length, 24000);
  buffer.getChannelData(0).set(samples);

  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackContext.destination);
  source.onended = playNext;
  source.start();
}
```

---

## Errori Comuni e Soluzioni

### 1. "Missing required parameter: 'session.type'"

**Causa**: Azure GA richiede `session.type: "realtime"`.

**Fix**:
```typescript
// ❌ Sbagliato
{ type: 'session.update', session: { instructions: '...' } }

// ✅ Corretto
{ type: 'session.update', session: { type: 'realtime', instructions: '...' } }
```

### 2. "Unknown parameter: 'session.voice'"

**Causa**: Voice deve essere in `audio.output.voice`, non top-level.

**Fix**:
```typescript
// ❌ Sbagliato
{ session: { voice: 'alloy' } }

// ✅ Corretto
{ session: { audio: { output: { voice: 'alloy' } } } }
```

### 3. session.update funziona via websocat ma fallisce via proxy

**Causa**: Proxy invia JSON come Buffer (binario) invece che stringa.

**Fix**: Vedi sezione "BUG CRITICO RISOLTO" sopra.

### 4. Audio inviato ma Azure non risponde

**Cause possibili**:
1. Sample rate sbagliato (deve essere 24kHz)
2. VAD threshold troppo alto
3. Audio troppo silenzioso

**Debug**:
```typescript
// Verifica sample rate del browser
console.log(audioContext.sampleRate); // Se 48000, DEVI resample

// Verifica che stai mandando dati
processor.onaudioprocess = (e) => {
  const data = e.inputBuffer.getChannelData(0);
  const maxAmplitude = Math.max(...data.map(Math.abs));
  console.log('Max amplitude:', maxAmplitude); // Deve essere > 0.01
};
```

### 5. Sento l'audio ma è distorto/veloce/lento

**Causa**: Mismatch sample rate nel playback.

**Fix**: AudioContext di playback DEVE essere 24kHz:
```typescript
// ❌ Sbagliato - usa default del sistema
const ctx = new AudioContext();

// ✅ Corretto - forza 24kHz
const ctx = new AudioContext({ sampleRate: 24000 });
```

---

## Testing e Debug

### 1. Test diretto con websocat

Bypassa completamente l'app per testare Azure direttamente:

```bash
# Installa websocat
brew install websocat

# Connetti direttamente ad Azure
websocat "wss://YOUR-RESOURCE.openai.azure.com/openai/v1/realtime?model=gpt-4o-realtime&api-key=YOUR_KEY"

# Invia session.update
{"type":"session.update","session":{"type":"realtime","instructions":"Test","audio":{"output":{"voice":"alloy"}}}}
```

Se funziona qui ma non nell'app → problema nel proxy o client.

### 2. Log del proxy

I log sono in console quando fai `npm run dev`:

```
[INFO] Client connected: UUID for maestro: test-debug
[INFO] Backend WebSocket OPEN for UUID
[DEBUG] Backend -> Client [session.created]
[INFO] Client -> Backend [session.update]: {"type":"session.update"...
[DEBUG] Backend -> Client [session.updated]   ← Se vedi questo, funziona!
[DEBUG] Backend -> Client [error]             ← Se vedi questo, leggi il messaggio
```

### 3. Pagina di test

Vai a `/test-voice` per debug interattivo:
- Test microfono isolato
- Connessione WebSocket manuale
- Log di tutti i messaggi
- Visualizzazione audio waveform

### 4. Verifica deployment Azure

```bash
# Verifica che il deployment esista
az cognitiveservices account deployment show \
  --name YOUR-RESOURCE \
  --resource-group YOUR-RG \
  --deployment-name gpt-4o-realtime

# Output deve mostrare:
# "model": { "name": "gpt-4o-realtime-preview", "version": "2025-08-28" }
```

---

## Variabili d'Ambiente

```bash
# .env.local

# Azure OpenAI Realtime (per voice)
AZURE_OPENAI_REALTIME_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key-here
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime

# Porta WebSocket proxy
WS_PROXY_PORT=3001
```

---

## Checklist Pre-Deploy

- [ ] `session.type: "realtime"` presente in session.update
- [ ] Voice in `audio.output.voice`, non top-level
- [ ] Proxy converte Buffer a stringa per JSON
- [ ] Resampling 48kHz → 24kHz implementato
- [ ] Playback context a 24kHz
- [ ] API key in query string URL, non header
- [ ] VAD type è `server_vad`

---

## Cronologia Problemi Risolti

| Data | Problema | Soluzione |
|------|----------|-----------|
| 2025-12-28 | session.update rifiutato | Aggiunto `type: "realtime"` |
| 2025-12-28 | voice non riconosciuto | Spostato in `audio.output.voice` |
| 2025-12-28 | Proxy invia binario | Conversione Buffer → string |
| 2025-12-28 | Audio non rilevato | Resampling 48k→24k |
| 2025-12-28 | Nessun suono output | Implementato playback 24kHz |

---

*Documento creato dopo 1 giorno di debug. Non ripetere i nostri errori!*
