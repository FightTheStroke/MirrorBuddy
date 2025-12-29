# VoiceExperiencePlanDec29 - Voice UX Improvements

**Data**: 2025-12-29
**Target**: Migliorare l'esperienza vocale con barge-in, voice mapping corretto, e personalità vocali
**Metodo**: VERIFICA BRUTALE - ogni task testato prima di dichiararlo fatto
**Riferimento**: [improvementsDec29.md](../improvementsDec29.md)

---

## 🎭 RUOLI CLAUDE

| Claude | Ruolo | Task Assegnati | File Domain |
|--------|-------|----------------|-------------|
| **CLAUDE 1** | 🎯 COORDINATORE | Monitora piano, verifica, commit checkpoint | - |
| **CLAUDE 2** | 👨‍💻 MAESTRI EXPERT | T-01, T-04 | `src/data/index.ts` |
| **CLAUDE 3** | 👨‍💻 VOICE ENGINE | T-02, T-03 | `src/lib/hooks/use-voice-session.ts` |

> **3 CLAUDE sufficienti** - Phase 5 (docs) eseguita da CLAUDE 1 dopo merge

---

## ⚠️ REGOLE OBBLIGATORIE PER TUTTI I CLAUDE

```
1. PRIMA di iniziare: leggi TUTTO questo file
2. Trova i task assegnati a te (cerca "CLAUDE X" dove X è il tuo numero)
3. Per OGNI task:
   a. Leggi i file indicati
   b. Implementa la fix
   c. Esegui TUTTI i comandi di verifica
   d. Solo se TUTTI passano, aggiorna questo file marcando ✅ DONE

4. VERIFICA OBBLIGATORIA dopo ogni task:
   npm run lint        # DEVE essere 0 errors
   npm run typecheck   # DEVE compilare senza errori

5. NON DIRE MAI "FATTO" SE:
   - Non hai eseguito i comandi sopra
   - Anche UN SOLO errore appare
   - Non hai aggiornato questo file

6. Se trovi problemi/blocchi: CHIEDI invece di inventare soluzioni

7. Dopo aver completato: aggiorna la sezione EXECUTION TRACKER con ✅

8. CONFLITTI GIT: Non dovrebbero esserci - file separati per Claude
```

---

## 🎯 EXECUTION TRACKER

### Stream A: Maestri Data (CLAUDE 2) — 2/2 ✅

| Status | ID | Task | Assignee | Files | Commit After |
|:------:|-----|------|----------|-------|--------------|
| ✅ | T-01 | Voice Mapping (6 maestri) | **CLAUDE 2** | `src/data/index.ts` | ✅ Phase 1 |
| ✅ | T-04 | Voice Personality Enhancement | **CLAUDE 2** | `src/data/index.ts` | ✅ Phase 4 |

### Stream B: Voice Engine (CLAUDE 3) — 2/2 ✅

| Status | ID | Task | Assignee | Files | Commit After |
|:------:|-----|------|----------|-------|--------------|
| ✅ | T-02 | Barge-in Implementation | **CLAUDE 3** | `src/lib/hooks/use-voice-session.ts` | ✅ Phase 2 |
| ✅ | T-03 | VAD Tuning | **CLAUDE 3** | `src/lib/hooks/use-voice-session.ts` | ✅ Phase 3 |

### Stream C: Documentation (CLAUDE 1) — 0/1

| Status | ID | Task | Assignee | Files | Commit After |
|:------:|-----|------|----------|-------|--------------|
| ✅ | T-05 | Documentation Update | **CLAUDE 1** | `README.md`, `docs/AZURE_REALTIME_API.md`, `CHANGELOG.md` | ✅ Phase 5 → PR |

---

## 📋 TASK DETTAGLIATI PER CLAUDE

---

## CLAUDE 1: COORDINATORE

### Responsabilità
1. **Monitoraggio**: Controlla periodicamente questo file
2. **Checkpoint Commits**: Dopo ogni fase completata, esegui commit
3. **Aggregazione**: Quando T-01 a T-04 sono ✅, esegui T-05 (docs)
4. **PR Finale**: Crea PR dopo T-05

### Comandi di Monitoraggio
```bash
npm run lint && npm run typecheck
git status
```

### Checkpoint Commit Template
```bash
# Dopo Phase 1 (T-01)
git add src/data/index.ts && git commit -m "feat(voice): update voice mapping for 6 maestri

- Mozart: shimmer → sage (masculine)
- Erodoto: ballad → echo (authoritative)
- Cicerone: ballad → echo (oratorical)
- Manzoni: coral → sage (refined)
- Leonardo: coral → alloy (versatile)
- Ippocrate: coral → sage (wise)

🤖 Generated with Claude Code"

# Dopo Phase 2 (T-02)
git add src/lib/hooks/use-voice-session.ts && git commit -m "feat(voice): implement barge-in auto-interruption

- Detect user speech during maestro speaking
- Send response.cancel to stop current response
- Clear audio queue immediately
- Natural conversation flow enabled

🤖 Generated with Claude Code"

# Dopo Phase 3 (T-03)
git add src/lib/hooks/use-voice-session.ts && git commit -m "feat(voice): tune VAD for faster response

- threshold: 0.5 → 0.4 (more sensitive)
- silence_duration_ms: 500 → 400 (faster turns)

🤖 Generated with Claude Code"

# Dopo Phase 4 (T-04)
git add src/data/index.ts && git commit -m "feat(voice): enhance voice personality instructions

- Cicerone: add rhetorical devices and oratorical structure
- Erodoto: add dramatic storytelling pacing

🤖 Generated with Claude Code"

# Dopo Phase 5 (T-05)
git add README.md docs/AZURE_REALTIME_API.md CHANGELOG.md && git commit -m "docs: document voice experience improvements

- README: add voice features section
- AZURE_REALTIME_API: document barge-in
- CHANGELOG: add all voice changes

🤖 Generated with Claude Code"
```

---

## CLAUDE 2: MAESTRI EXPERT

### Task T-01: Voice Mapping (6 maestri)

#### Obiettivo
Cambiare la proprietà `voice` per 6 maestri per match gender corretto.

#### File da leggere PRIMA
```bash
# Leggi src/data/index.ts e trova le definizioni dei 6 maestri
```

#### Modifiche Richieste

| Maestro | Linea circa | Da | A |
|---------|-------------|-----|-----|
| Mozart | ~260 | `'shimmer'` | `'sage'` |
| Erodoto | ~140 | `'ballad'` | `'echo'` |
| Cicerone | ~280 | `'ballad'` | `'echo'` |
| Manzoni | ~180 | `'coral'` | `'sage'` |
| Leonardo | ~220 | `'coral'` | `'alloy'` |
| Ippocrate | ~320 | `'coral'` | `'sage'` |

#### Esempio di modifica
```typescript
// PRIMA
{
  id: 'mozart',
  voice: 'shimmer',  // ❌ feminine
  ...
}

// DOPO
{
  id: 'mozart',
  voice: 'sage',  // ✅ calm, masculine
  ...
}
```

#### Verifica OBBLIGATORIA
```bash
npm run lint && npm run typecheck
```

#### Quando completato
1. Aggiorna questo file: T-01 → ✅
2. Notifica CLAUDE 1 per checkpoint commit

---

### Task T-04: Voice Personality Enhancement

#### Obiettivo
Migliorare `voiceInstructions` per Cicerone e Erodoto con pacing e retorica.

#### Modifiche Richieste

**Cicerone** - Aggiungi/migliora voiceInstructions:
```typescript
voiceInstructions: `You are Marcus Tullius Cicero, the greatest Roman orator.

## Speaking Style
- Use rhetorical devices: tricolon (groups of three), anaphora (repetition), rhetorical questions
- Build arguments classically: introduce, develop, conclude with impact
- Address the student respectfully as "young citizen" or with dignity

## Pacing
- Moderate pace with deliberate pauses before key points
- Speed up slightly during passionate arguments about civic duty
- Slow down and lower tone for moral lessons

## Emotional Expression
- Show genuine passion for the Republic and civic virtue
- Express measured disappointment at injustice, never anger
- Demonstrate intellectual joy when student grasps rhetorical concepts`,
```

**Erodoto** - Aggiungi/migliora voiceInstructions:
```typescript
voiceInstructions: `You are Herodotus of Halicarnassus, the Father of History.

## Speaking Style
- Tell history as captivating stories with characters and drama
- Use vivid descriptions: "Imagine yourself standing at Thermopylae..."
- Occasionally pause as if recalling a distant memory

## Pacing
- Slow, measured pace for dramatic moments
- Speed up with excitement when describing battles or discoveries
- Brief pauses before revealing historical twists

## Emotional Expression
- Wonder and curiosity about the diversity of human cultures
- Respect for all civilizations - Greek, Persian, Egyptian alike
- Excitement when connecting past events to present lessons`,
```

#### Verifica OBBLIGATORIA
```bash
npm run lint && npm run typecheck
```

#### Quando completato
1. Aggiorna questo file: T-04 → ✅
2. Notifica CLAUDE 1 per checkpoint commit

---

## CLAUDE 3: VOICE ENGINE

### Task T-02: Barge-in Implementation

#### Obiettivo
Permettere all'utente di interrompere il maestro mentre parla.

#### File da leggere PRIMA
```bash
# Leggi src/lib/hooks/use-voice-session.ts
# Trova il case 'input_audio_buffer.speech_started' (circa linea 593)
```

#### Problema Attuale
```typescript
case 'input_audio_buffer.speech_started':
  console.log('[VoiceSession] User speech detected');
  setListening(true);  // ← Solo setta stato, non interrompe!
  break;
```

#### Codice da Implementare
```typescript
case 'input_audio_buffer.speech_started':
  console.log('[VoiceSession] User speech detected');
  setListening(true);

  // AUTO-INTERRUPT: If maestro is speaking, stop them (barge-in)
  if (isSpeaking && wsRef.current?.readyState === WebSocket.OPEN) {
    console.log('[VoiceSession] Barge-in detected - interrupting assistant');
    wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setSpeaking(false);
  }
  break;
```

#### Note Tecniche
- `isSpeaking` è lo state che indica se il maestro sta parlando
- `response.cancel` è l'evento Azure per cancellare la risposta in corso
- Pulire `audioQueueRef` evita che audio già ricevuto continui a suonare

#### Verifica OBBLIGATORIA
```bash
npm run lint && npm run typecheck
```

#### Quando completato
1. Aggiorna questo file: T-02 → ✅
2. Notifica CLAUDE 1 per checkpoint commit

---

### Task T-03: VAD Tuning

#### Obiettivo
Migliorare la reattività del Voice Activity Detection.

#### File da modificare
`src/lib/hooks/use-voice-session.ts` - trova `turn_detection` config (circa linea 541)

#### Problema Attuale
```typescript
turn_detection: {
  type: 'server_vad',
  threshold: 0.5,           // ← Poco sensibile
  prefix_padding_ms: 300,
  silence_duration_ms: 500,  // ← Troppo lento
  create_response: true
}
```

#### Codice da Implementare
```typescript
turn_detection: {
  type: 'server_vad',
  threshold: 0.4,            // ✅ Più sensibile a voce soft
  prefix_padding_ms: 300,
  silence_duration_ms: 400,  // ✅ Turn-taking più veloce
  create_response: true
}
```

#### Verifica OBBLIGATORIA
```bash
npm run lint && npm run typecheck
```

#### Quando completato
1. Aggiorna questo file: T-03 → ✅
2. Notifica CLAUDE 1 per checkpoint commit

---

## 📊 PROGRESS SUMMARY

| Stream | Done | Total | Status |
|--------|:----:|:-----:|--------|
| Stream A (CLAUDE 2) | 2 | 2 | ✅ |
| Stream B (CLAUDE 3) | 2 | 2 | ✅ |
| Stream C (CLAUDE 1) | 1 | 1 | ✅ |
| **TOTAL** | **5** | **5** | **100%** |

---

## VERIFICATION CHECKLIST (Prima del merge)

```bash
npm run lint        # 0 errors
npm run typecheck   # no errors
npm run build       # success (opzionale, più lento)
```

---

## PARALLEL EXECUTION DIAGRAM

```
TIME →

CLAUDE 2:  [====T-01 Voice Mapping====]----commit----[====T-04 Personality====]----commit
                     ↓ parallel                                    ↓
CLAUDE 3:  [====T-02 Barge-in====]----commit----[====T-03 VAD====]----commit
                                                                   ↓
                                                            Both complete
                                                                   ↓
CLAUDE 1:                                              [====T-05 Docs====]----commit----PR
```

---

**Versione**: 1.0
**Ultimo aggiornamento**: 2025-12-29
