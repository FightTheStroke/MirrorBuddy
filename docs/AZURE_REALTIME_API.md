# Azure OpenAI Realtime API - Documentazione Tecnica

> **ATTENZIONE**: Questa documentazione riporta problemi reali che abbiamo risolto.
> NON è documentazione teorica - sono fix verificati in produzione.

## Indice

1. [Panoramica](#panoramica)
2. [**CRITICO: Preview vs GA API**](#critico-preview-vs-ga-api)
3. [Requisiti Azure GA (2025-08-28)](#requisiti-azure-ga-2025-08-28)
4. [Architettura WebSocket Proxy](#architettura-websocket-proxy)
5. [Formato Audio](#formato-audio)
6. [Resampling 48kHz → 24kHz](#resampling-48khz--24khz)
7. [Errori Comuni e Soluzioni](#errori-comuni-e-soluzioni)
8. [Testing e Debug](#testing-e-debug)
9. [**BUG CRITICO: Stale Closure in React Hook**](#bug-critico-stale-closure-in-react-hook)
10. [**BUG CRITICO: WebSocket Blob vs String**](#bug-critico-websocket-blob-vs-string)
11. [Device Selection (Microphone e Speaker)](#device-selection-microphone-e-speaker)

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

## CRITICO: Preview vs GA API

> ⚠️ **QUESTO È IL BUG CHE CI HA FATTO PERDERE ORE DI DEBUG** ⚠️
>
> Azure ha DUE versioni dell'API Realtime con event names DIVERSI!
> Se il tuo codice aspetta l'evento sbagliato, l'audio NON VIENE MAI RIPRODOTTO.

### Le Due API

| Aspetto | Preview API | GA API |
|---------|-------------|--------|
| **Deployment** | `gpt-4o-realtime-preview` | `gpt-realtime` |
| **URL Path** | `/openai/realtime` | `/openai/v1/realtime` |
| **API Version param** | `api-version=2025-04-01-preview` | NO param |
| **Model param** | `deployment=...` | `model=...` |

### Event Names - LA DIFFERENZA CRITICA

| Evento | Preview API | GA API |
|--------|-------------|--------|
| Audio chunk | `response.audio.delta` | `response.output_audio.delta` |
| Audio completato | `response.audio.done` | `response.output_audio.done` |
| Transcript chunk | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |
| Transcript completato | `response.audio_transcript.done` | `response.output_audio_transcript.done` |

### Come Gestire Entrambi (SOLUZIONE)

Nel tuo message handler, usa switch con ENTRAMBI i case:

```typescript
switch (event.type) {
  // Gestisci ENTRAMBI i formati!
  case 'response.output_audio.delta':  // GA API
  case 'response.audio.delta':         // Preview API
    playAudio(event.delta);
    break;

  case 'response.output_audio.done':   // GA API
  case 'response.audio.done':          // Preview API
    console.log('Audio completato');
    break;

  case 'response.output_audio_transcript.delta':  // GA API
  case 'response.audio_transcript.delta':         // Preview API
    showStreamingText(event.delta);
    break;
}
```

### Come Sapere Quale Stai Usando

Controlla il nome del tuo deployment Azure:
- Contiene `4o` o `preview`? → **Preview API**
- Altrimenti → **GA API**

Il proxy (`realtime-proxy.ts` linea 61) fa questa detection automaticamente:

```typescript
const isPreviewModel = azureDeployment.includes('4o') || azureDeployment.includes('preview');
```

### Bug Tipico

```typescript
// ❌ SBAGLIATO - funziona solo con GA
if (event.type === 'response.output_audio.delta') {
  playAudio(event.delta);
}
// Con Preview API, l'audio arriva ma questo if non matcha MAI!

// ✅ CORRETTO - funziona con entrambi
if (event.type === 'response.output_audio.delta' ||
    event.type === 'response.audio.delta') {
  playAudio(event.delta);
}
```

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
| 2025-12-29 | **Audio ricevuto ma non riprodotto** | Preview API usa `response.audio.delta` invece di `response.output_audio.delta` - il codice aspettava l'evento GA! |
| 2025-12-29 | **VoiceSession non funziona ma test page sì** | Stale closure bug - `handleServerEvent` catturato al momento della connessione. Fix: usare useRef |
| 2025-12-29 | **ws.onmessage non riceve eventi** | WebSocket invia Blob ma il codice gestiva solo String. Fix: `event.data instanceof Blob` |

---

## BUG CRITICO: Stale Closure in React Hook

> ⚠️ **QUESTO BUG CI HA FATTO IMPAZZIRE** ⚠️
>
> Il componente VoiceSession non funzionava mentre la pagina test-voice funzionava perfettamente.
> Stesso codice WebSocket, stessi eventi - ma uno funzionava e l'altro no!

### Il Problema

In un React hook con `useCallback`, quando fai:

```typescript
const handleServerEvent = useCallback((event) => {
  // usa stato come `messages`, `currentResponse`, etc.
}, [messages, currentResponse, ...]);

const connect = useCallback(() => {
  ws.onmessage = (event) => {
    handleServerEvent(JSON.parse(event.data));  // ❌ CATTURA VECCHIA VERSIONE!
  };
}, [handleServerEvent]);
```

Il problema: `ws.onmessage` cattura la versione di `handleServerEvent` che esisteva AL MOMENTO DELLA CONNESSIONE.
Quando le dipendenze cambiano, `handleServerEvent` viene ri-creato, ma `ws.onmessage` usa ancora la vecchia versione!

### Sintomi

- Test page funziona (usa callback inline)
- VoiceSession non funziona (usa useCallback)
- Eventi WebSocket arrivano (vedi nei log)
- `handleServerEvent` non processa gli eventi (stato mai aggiornato)

### La Soluzione: useRef Pattern

```typescript
// 1. Crea un ref per tenere l'ultima versione del callback
const handleServerEventRef = useRef<((event: Record<string, unknown>) => void) | null>(null);

// 2. Aggiorna il ref ogni volta che il callback cambia
useEffect(() => {
  handleServerEventRef.current = handleServerEvent;
}, [handleServerEvent]);

// 3. In ws.onmessage, usa il ref invece del callback diretto
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  if (handleServerEventRef.current) {
    handleServerEventRef.current(data);  // ✅ SEMPRE L'ULTIMA VERSIONE!
  }
};
```

### File Modificato

`src/lib/hooks/use-voice-session.ts`:
- Linea 204: Dichiarazione `handleServerEventRef`
- Linee 725-729: useEffect che aggiorna il ref
- Linee 783-808: `ws.onmessage` che usa il ref

---

## BUG CRITICO: WebSocket Blob vs String

### Il Problema

In alcuni browser/contesti, `ws.onmessage` riceve dati come `Blob` invece di `string`.

```typescript
// ❌ SBAGLIATO - funziona solo se data è string
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);  // ERRORE se event.data è Blob!
};

// ✅ CORRETTO - gestisce entrambi i casi
ws.onmessage = async (event) => {
  let msgText: string;

  if (event.data instanceof Blob) {
    msgText = await event.data.text();  // Converti Blob → string
  } else if (typeof event.data === 'string') {
    msgText = event.data;
  } else {
    console.log('Binary data, skipping');
    return;
  }

  const data = JSON.parse(msgText);
  // ... processa data
};
```

### Come Capire se è Questo il Problema

```typescript
ws.onmessage = (event) => {
  console.log('Data type:', typeof event.data);
  console.log('Is Blob:', event.data instanceof Blob);
  // Se vedi "Is Blob: true" → devi gestirlo!
};
```

---

## Device Selection (Microphone e Speaker)

### Selezionare Microfono Specifico

```typescript
// Enumera dispositivi (richiede permesso)
await navigator.mediaDevices.getUserMedia({ audio: true });  // Richiedi permesso
const devices = await navigator.mediaDevices.enumerateDevices();
const microphones = devices.filter(d => d.kind === 'audioinput');

// Usa dispositivo specifico
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: { exact: selectedMicrophoneId }  // ⚠️ `exact` è importante!
  }
});
```

### Selezionare Speaker Specifico (Chrome 110+)

```typescript
// Enumera output devices
const speakers = devices.filter(d => d.kind === 'audiooutput');

// Opzione 1: AudioContext con sinkId (Chrome 110+)
const ctx = new AudioContext({
  sampleRate: 24000,
  sinkId: selectedSpeakerId  // Potrebbe non essere supportato
});

// Opzione 2: setSinkId (più compatibile)
if ('setSinkId' in audioContext) {
  await audioContext.setSinkId(selectedSpeakerId);
}
```

### Ascoltare Cambi Dispositivo

```typescript
useEffect(() => {
  const handleDeviceChange = () => {
    // Re-enumerate devices quando utente collega/scollega
    enumerateDevices();
  };

  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  };
}, []);
```

---

## File Critici e Cosa Fare se Non Funziona

### Checklist Debug Voice

1. **Audio non si sente ma WebSocket funziona?**
   - Controlla quale API usi (Preview vs GA)
   - Verifica che gestisci ENTRAMBI gli event types
   - File: `src/lib/hooks/use-voice-session.ts` linee 575-616

2. **session.update fallisce?**
   - Controlla il formato (Preview usa struttura diversa da GA)
   - File: `src/app/test-voice/page.tsx` per test manuale

3. **Proxy non connette ad Azure?**
   - Controlla env vars: `AZURE_OPENAI_REALTIME_*`
   - File: `src/server/realtime-proxy.ts` linee 43-74

4. **Audio distorto o veloce?**
   - AudioContext playback DEVE essere a 24kHz
   - File: `src/lib/hooks/use-voice-session.ts` linea 214

5. **VoiceSession component non funziona ma test page sì?**
   - Probabile stale closure bug
   - Verifica che `handleServerEventRef` sia usato in `ws.onmessage`
   - File: `src/lib/hooks/use-voice-session.ts` linee 204, 725-729, 783-808

6. **Eventi WebSocket arrivano come Blob?**
   - Aggiungi gestione `event.data instanceof Blob`
   - Usa `await event.data.text()` per convertire
   - File: `src/lib/hooks/use-voice-session.ts` linee 785-795

7. **Microfono sbagliato selezionato?**
   - Usa `/test-voice` per selezionare dispositivo
   - Verifica con waveform che il mic corretto sia attivo
   - File: `src/app/test-voice/page.tsx` - sezione Device Selection

---

## Waveform Visualization per Debug

La pagina `/test-voice` include una waveform canvas per vedere l'audio in tempo reale:

```typescript
// Setup analyser
analyser.fftSize = 2048;
const timeDataArray = new Uint8Array(analyser.fftSize);

// Draw loop
function draw() {
  requestAnimationFrame(draw);
  analyser.getByteTimeDomainData(timeDataArray);

  // Draw wave
  ctx.beginPath();
  for (let i = 0; i < timeDataArray.length; i++) {
    const v = timeDataArray[i] / 128.0;
    const y = (v * height) / 2;
    i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}
```

Utile per verificare:
- Microfono funziona (wave si muove)
- Dispositivo corretto (confronta con altro software)
- Livello audio (barra verde in basso)

---

---

## Compatibilità Browser e Sistema Operativo

### Browser Supportati

| Browser | Windows | macOS | Linux | Note |
|---------|---------|-------|-------|------|
| Chrome 110+ | ✅ | ✅ | ✅ | Pieno supporto, incluso setSinkId |
| Edge 110+ | ✅ | ✅ | ✅ | Pieno supporto come Chrome |
| Firefox | ⚠️ | ⚠️ | ⚠️ | Funziona, ma NO selezione speaker output |
| Safari 14.1+ | ⚠️ | ⚠️ | N/A | Funziona, ma NO selezione speaker output |
| Safari iOS | ⚠️ | N/A | N/A | Richiede user gesture per AudioContext |

### Feature Support Matrix

| Feature | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| getUserMedia (mic) | ✅ | ✅ | ✅ |
| enumerateDevices | ✅ | ✅ | ✅ |
| AudioContext | ✅ | ✅ | ✅ (webkitAudioContext) |
| **setSinkId** (output device) | ✅ | ❌ | ❌ |
| WebSocket | ✅ | ✅ | ✅ |
| ScriptProcessorNode | ✅ | ✅ | ✅ |

### Fallback Implementati

#### 1. webkitAudioContext (Safari)

```typescript
// File: src/lib/hooks/use-voice-session.ts
const AudioContextClass = window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
```

#### 2. setSinkId (Firefox, Safari)

```typescript
// File: src/components/settings/settings-view.tsx, src/app/test-voice/page.tsx
if ('setSinkId' in audioContext) {
  await audioContext.setSinkId(selectedOutputDevice);
} else {
  console.warn('Output device selection not supported, using system default');
}
```

Se setSinkId non è supportato, l'audio va allo speaker di default del sistema.

#### 3. Device Label Privacy (tutti i browser)

I browser non mostrano i nomi dei dispositivi finché l'utente non concede il permesso:

```typescript
// Prima: devices hanno label vuoto
// Dopo getUserMedia: devices hanno label completo
await navigator.mediaDevices.getUserMedia({ audio: true });
const devices = await navigator.mediaDevices.enumerateDevices();
```

### Limitazioni per OS

#### macOS
- ✅ Funziona al 100%
- ✅ Tutti i dispositivi riconosciuti
- ✅ Airpods e bluetooth supportati

#### Windows
- ✅ Funziona al 100%
- ✅ Tutti i dispositivi riconosciuti
- ⚠️ Alcuni driver audio possono richiedere permessi aggiuntivi

#### Linux
- ✅ Funziona con PulseAudio/PipeWire
- ⚠️ setSinkId non funziona su Firefox Linux
- ⚠️ Potrebbe richiedere configurazione ALSA per alcuni dispositivi

### Mobile (iOS/Android)

| Piattaforma | Supporto | Note |
|-------------|----------|------|
| iOS Safari | ⚠️ | Richiede user gesture, no background audio |
| iOS Chrome | ⚠️ | Usa WebKit, stesse limitazioni Safari |
| Android Chrome | ✅ | Pieno supporto |
| Android Firefox | ⚠️ | No setSinkId |

### Requisiti Minimi

- **HTTPS obbligatorio**: getUserMedia richiede contesto sicuro
- **Permessi browser**: Microfono e camera richiedono consenso utente
- **WebSocket**: Deve essere supportato (tutti i browser moderni)

### Come Testare Cross-Platform

```bash
# 1. Vai su /test-voice
# 2. Verifica che i dispositivi siano elencati
# 3. Prova la connessione WebSocket
# 4. Parla e verifica che l'audio venga inviato
# 5. Ascolta la risposta del maestro
```

### Problemi Noti per Piattaforma

| Problema | Piattaforma | Workaround |
|----------|-------------|------------|
| AudioContext suspended | Safari iOS | User deve toccare schermo prima |
| No device labels | Tutti | Richiedere permesso prima di enumerare |
| setSinkId undefined | Firefox, Safari | Usa speaker di sistema |
| Blob in WebSocket | Alcuni browser | Gestito con `instanceof Blob` |

---

*Documento creato dopo 2+ giorni di debug. NON RIPETERE I NOSTRI ERRORI!*
