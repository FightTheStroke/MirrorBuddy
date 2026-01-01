# Voice API (Azure Realtime) - CRITICAL

> **LEGGI QUESTO PRIMA DI TOCCARE IL CODICE VOICE**

## Modelli Disponibili (Dicembre 2025)

| Modello | Versione | Stato | Note |
|---------|----------|-------|------|
| `gpt-realtime` | 2025-08-28 | **GA** | Raccomandato, qualità massima (ATTUALE) |
| `gpt-realtime-mini` | 2025-12-15 | GA | Più veloce, costo minore (FUTURO) |
| `gpt-4o-realtime-preview` | 2025-06-03 | **Deprecated** | NON usare |

**Deployment attuale**: `gpt-4o-realtime` → modello `gpt-realtime` (GA)

## Session Config Ottimale (Issue #61)

Hardcoded in `use-voice-session.ts` - NON modificabili dall'utente:

```typescript
{
  input_audio_noise_reduction: { type: 'near_field' },
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
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
