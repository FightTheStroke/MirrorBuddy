# Phase 3: Pagina Maestri Redesign

**Parent**: [Main Plan](./MirrorBuddyGamification-Main.md)
**Assignee**: CLAUDE 2 (EXECUTOR-UI)
**Priority**: MEDIA - Dipende da Phase 2
**Depends On**: Phase 2 (MirrorBucks per integrazione gamification)

---

## OBIETTIVO

Trasformare pagina maestri da "funzionale" a "emozionale":
- Avatar più grandi e prominenti
- Rimuovere tool buttons ridondanti
- Frasi celebri rotanti
- Suggerimenti personalizzati
- Avatar maestro in sidebar durante chat
- Contesto conversazione 5 min timeout

---

## EXECUTION TRACKER

| Status | ID | Task | Files | Notes |
|--------|-----|------|-------|-------|
| [ ] | T3-01 | Creare quotes database | `src/data/maestri/quotes.ts` | 5+ frasi per maestro |
| [ ] | T3-02 | Redesign MaestroCard | `src/components/maestros/maestro-card.tsx` | Avatar grande, no tools |
| [ ] | T3-03 | Redesign MaestriGrid | `src/components/maestros/maestri-grid.tsx` | Layout emozionale |
| [ ] | T3-04 | Aggiungere QuoteRotator | `src/components/maestros/quote-rotator.tsx` | Frase random per card |
| [ ] | T3-05 | Creare PersonalizedSuggestion | `src/components/maestros/personalized-suggestion.tsx` | "Ieri hai studiato..." |
| [ ] | T3-06 | Avatar maestro in sidebar | `src/components/conversation/components/active-maestro-avatar.tsx` | Durante conversazione |
| [ ] | T3-07 | Conversation context timeout | `src/lib/stores/conversation-flow-store.ts` | 5 min prima di cleanup |
| [ ] | T3-08 | Test UX e accessibilità | E2E + manual | Focus, contrast, motion |

---

## TASK DETAILS

### T3-01: Quotes Database
```typescript
// src/data/maestri/quotes.ts
export const MAESTRI_QUOTES: Record<string, string[]> = {
  leonardo: [
    "La semplicità è la sofisticazione suprema.",
    "Studia l'arte della scienza e la scienza dell'arte.",
    "Chi pensa poco, sbaglia molto.",
    "L'esperienza è la madre di ogni certezza.",
    "Ogni ostacolo è distrutto dalla fermezza."
  ],
  galileo: [
    "Eppur si muove!",
    "La matematica è l'alfabeto con cui Dio ha scritto l'universo.",
    "Dietro ogni problema c'è un'opportunità.",
    "Non puoi insegnare niente a un uomo, puoi solo aiutarlo a scoprire.",
    "Misura ciò che è misurabile, rendi misurabile ciò che non lo è."
  ],
  // ... per tutti i 17 maestri
}
```

### T3-02: Redesign MaestroCard
Layout attuale:
```
┌─────────────────────────┐
│ [Small Avatar] Name     │
│ Subject • Specialty     │
│ [Tool] [Tool] [Tool]   │
└─────────────────────────┘
```

Nuovo layout:
```
┌─────────────────────────────────┐
│      ╭─────────╮                │
│      │  AVATAR │   ← 120x120    │
│      │  GRANDE │                │
│      ╰─────────╯                │
│                                 │
│    Leonardo da Vinci            │
│    ═══════════════════          │
│    Arte & Scienza               │
│                                 │
│  "La semplicità è la           │
│   sofisticazione suprema"       │
│                                 │
│  ┌─────────────────────┐       │
│  │ Inizia a Studiare → │       │
│  └─────────────────────┘       │
└─────────────────────────────────┘
```

### T3-03: Redesign MaestriGrid
- Rimuovere header "I Tuoi Professori" → più dinamico
- Sezione hero in alto con suggerimento personalizzato
- Grid 3-4 colonne responsive
- Hover effect più pronunciato (scale + glow)
- Subject filter più visuale (icone invece di testo)

### T3-05: PersonalizedSuggestion
```typescript
// Logica suggerimento
function getPersonalizedSuggestion(progress: ProgressState): Suggestion {
  const lastSession = progress.sessions[progress.sessions.length - 1]

  if (lastSession && isYesterday(lastSession.date)) {
    return {
      type: 'continue',
      maestroId: lastSession.maestroId,
      subject: lastSession.subject,
      message: `Ieri hai studiato ${subject} con ${maestroName}. Vuoi continuare?`
    }
  }

  if (progress.streak > 0) {
    const weakSubject = findWeakestSubject(progress.masteries)
    return {
      type: 'improve',
      subject: weakSubject,
      message: `Hai ${progress.streak} giorni di streak! Rafforza ${weakSubject}?`
    }
  }

  return {
    type: 'explore',
    message: 'Scegli un maestro per iniziare la tua avventura!'
  }
}
```

### T3-06: Avatar Maestro in Sidebar
- Posizione: sotto avatar Coach/Buddy esistenti
- Appare solo quando `currentMaestroId` è set
- Click → torna alla conversazione con quel maestro
- Tooltip: "Stai parlando con {nome}"
- Badge indicatore sessione attiva (pallino verde)

### T3-07: Conversation Context Timeout
Attuale: 15 min inactivity → auto-summary
Nuovo comportamento:
- 0-5 min inactivity: contesto attivo, può switchare e tornare
- 5+ min inactivity: trigger "vuoi continuare o chiudere?"
- Se chiude: genera summary, salva per genitori
- Se continua: reset timer

```typescript
// conversation-flow-store.ts
const CONTEXT_KEEP_ALIVE = 5 * 60 * 1000 // 5 min
const contextTimers = new Map<string, NodeJS.Timeout>()

function switchMaestro(newMaestroId: string) {
  const oldMaestroId = get().currentMaestroId

  if (oldMaestroId) {
    // Mantieni contesto per 5 min
    contextTimers.set(oldMaestroId, setTimeout(() => {
      promptCloseConversation(oldMaestroId)
    }, CONTEXT_KEEP_ALIVE))
  }

  set({ currentMaestroId: newMaestroId })
}
```

---

## ACCEPTANCE CRITERIA

- [ ] Ogni maestro ha almeno 5 frasi celebri che ruotano
- [ ] Card maestro mostra avatar 120x120, no tool buttons
- [ ] Quote cambia ad ogni render/hover
- [ ] Suggerimento personalizzato basato su history
- [ ] Avatar maestro appare in sidebar durante chat
- [ ] Switch maestro mantiene contesto 5 min
- [ ] Dopo 5 min inattività, prompt chiusura conversazione
- [ ] Accessibilità: focus visible, motion reduced support

---

## FILE DEPENDENCIES

```
src/data/maestri/
└── quotes.ts (T3-01) NEW

src/components/maestros/
├── maestro-card.tsx (T3-02) MODIFY
├── maestri-grid.tsx (T3-03) MODIFY
├── quote-rotator.tsx (T3-04) NEW
├── personalized-suggestion.tsx (T3-05) NEW
└── index.ts (update exports)

src/components/conversation/
└── components/
    └── active-maestro-avatar.tsx (T3-06) NEW

src/lib/stores/
└── conversation-flow-store.ts (T3-07) MODIFY
```

---

## DESIGN TOKENS

```css
/* Nuovi token per maestri cards */
--maestro-avatar-size: 120px;
--maestro-card-padding: 1.5rem;
--maestro-hover-scale: 1.05;
--maestro-hover-glow: 0 8px 32px rgba(var(--primary), 0.3);
--maestro-quote-font: var(--font-serif);
--maestro-quote-size: 0.9rem;
--maestro-quote-style: italic;
```

---

## ESTIMATED COMPLEXITY

| Task | Complexity | LOC New | LOC Modified |
|------|------------|---------|--------------|
| T3-01 | Medium | 200 | 0 |
| T3-02 | High | 0 | 150 |
| T3-03 | High | 0 | 120 |
| T3-04 | Low | 50 | 0 |
| T3-05 | Medium | 100 | 0 |
| T3-06 | Medium | 80 | 20 |
| T3-07 | High | 0 | 100 |
| T3-08 | Medium | 60 | 0 |

**Total**: ~490 new LOC, ~390 modified LOC
