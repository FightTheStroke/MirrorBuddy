# Voice API (Azure Realtime) - CRITICAL

> **LEGGI QUESTO PRIMA DI TOCCARE IL CODICE VOICE**

## Modelli Disponibili (Gennaio 2026)

| Modello | Versione | Stato | Costo Audio | Note |
|---------|----------|-------|-------------|------|
| `gpt-realtime` | 2025-08-28 | **GA** | $0.30/min | Qualità massima (ATTUALE) |
| `gpt-realtime-mini` | 2025-12-15 | **GA** | ~$0.03-0.05/min | **90% risparmio** - RACCOMANDATO |
| `gpt-4o-realtime-preview` | 2025-06-03 | Deprecated | - | NON usare |

**Deployment attuale**: `gpt-4o-realtime` → modello `gpt-realtime` (GA)

### Confronto Pricing Dettagliato

| Metrica | `gpt-realtime` | `gpt-realtime-mini` | Risparmio |
|---------|----------------|---------------------|-----------|
| Audio Input | $100/1M tokens | $10/1M tokens | 90% |
| Audio Output | $200/1M tokens | $20/1M tokens | 90% |
| Text Input | $5/1M tokens | $0.60/1M tokens | 88% |
| Text Output | $20/1M tokens | $2.40/1M tokens | 88% |
| **Costo pratico bidirezionale** | ~$0.30/min | ~$0.03-0.05/min | **80-90%** |

### Quando Usare Mini vs Standard

| Use Case | Modello Consigliato | Motivo |
|----------|---------------------|--------|
| Tutoring educativo | **Mini** | System prompt guida la personalità |
| Onboarding studenti | **Mini** | Conversazioni semplici |
| Supporto emotivo (MirrorBuddy) | Standard | Richiede sfumature emotive |
| Demo/testing | **Mini** | Risparmio costi |

### Migrazione a Mini

1. Deploy nuovo modello:
```bash
az cognitiveservices account deployment create \
  --resource-group rg-virtualbpm-prod \
  --name aoai-virtualbpm-prod \
  --deployment-name gpt-realtime-mini \
  --model-name gpt-realtime-mini \
  --model-version 2025-12-15 \
  --sku-name Standard \
  --sku-capacity 1
```

2. Aggiorna `.env.local`:
```bash
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime-mini
```

3. Test qualità con Maestri prima di produzione

## Trascrizione Audio (input_audio_transcription)

### Modelli Disponibili nel Realtime API

| Modello | Stato | Note |
|---------|-------|------|
| `whisper-1` | **Supportato** | Unico modello funzionante |
| `gpt-4o-transcribe` | **NON supportato** | Solo via `/audio` endpoint separato |
| `gpt-4o-mini-transcribe` | **NON supportato** | Solo via `/audio` endpoint separato |

> **IMPORTANTE**: Il Realtime API supporta SOLO `whisper-1` per la trascrizione.
> `gpt-4o-transcribe` dà errore: `Invalid value. Supported values are: 'whisper-1'`

### Configurazione Attuale

```typescript
input_audio_transcription: {
  model: 'whisper-1',
  language: transcriptionLanguages[language] || 'it',  // Dinamico da settings
  prompt: transcriptionPrompts[language],  // Keyword hints per accuratezza
}
```

### Prompt per Migliorare Accuratezza

Whisper-1 supporta un parametro `prompt` con **lista di keyword** (non frasi):

```typescript
const transcriptionPrompts = {
  it: 'MirrorBuddy, maestro, matematica, italiano, storia, geografia, scienze...',
  en: 'MirrorBuddy, teacher, math, English, history, geography, science...',
  // ... altre lingue
};
```

Questo aiuta Whisper a riconoscere termini specifici del dominio educativo.

### Flusso Audio vs Trascrizione

```
Audio User → [2 percorsi paralleli]
├── 1. Audio raw → Modello GPT-4o (lui capisce SEMPRE bene)
└── 2. Audio → Whisper STT → Trascrizione chat (può avere errori)
```

La trascrizione mostrata nella chat è **separata** da ciò che il modello capisce.
Il modello riceve l'audio originale e lo interpreta correttamente.

## Session Config Ottimale (Issue #61)

Hardcoded in `session-config.ts` - NON modificabili dall'utente:

```typescript
{
  input_audio_noise_reduction: { type: 'near_field' },
  input_audio_transcription: {
    model: 'whisper-1',
    language: 'it',  // da settings
    prompt: '...',   // keyword educative
  },
  turn_detection: {
    type: 'server_vad',
    threshold: 0.6,
    prefix_padding_ms: 300,
    silence_duration_ms: 700,
    create_response: true,
    interrupt_response: true,  // false per onboarding
  },
  temperature: 0.8,
}
```

## Preview vs GA API

Azure ha DUE formati con **event names DIVERSI**:

| Evento | Preview API | GA API |
|--------|-------------|--------|
| Audio | `response.audio.delta` | `response.output_audio.delta` |
| Transcript | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

Il codice in `use-voice-session.ts` ascolta ENTRAMBI (linee 575-616).

## File Critici

| File | Responsabilità |
|------|----------------|
| `src/lib/hooks/use-voice-session.ts` | Hook principale |
| `src/server/realtime-proxy.ts` | WebSocket proxy |
| `src/app/test-voice/page.tsx` | Pagina debug |
| `docs/AZURE_REALTIME_API.md` | Documentazione API |

## Requisito HTTPS per Microfono

`navigator.mediaDevices.getUserMedia()` richiede **secure context**:
- `localhost:3000` / `127.0.0.1:3000` → OK
- `https://...` → OK
- `http://192.168.x.x:3000` → **NON FUNZIONA**

**Soluzione mobile**: tunnel HTTPS (ngrok, cloudflared)

## Debug Checklist

1. Audio non si sente? → Controlla event types (Preview vs GA)
2. Echo loop? → `disableBargeIn: true`
3. session.update fallisce? → Verifica formato GA
4. Audio distorto? → AudioContext DEVE essere 24kHz
5. `mediaDevices undefined`? → HTTP su IP

## Env Vars

```bash
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime
```
