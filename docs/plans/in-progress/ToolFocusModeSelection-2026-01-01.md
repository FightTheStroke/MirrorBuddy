# ToolFocusModeSelection - Selezione Maestro/Voce prima del Focus Mode

**Data**: 2026-01-01
**Branch**: `feature/tool-focus-mode-selection`
**Worktree**: `/Users/roberdan/GitHub/ConvergioEdu-tool-focus`
**Status**: ✅ IMPLEMENTATO - In attesa di review

---

## PROBLEMA

Quando l'utente cliccava "Crea con un Professore" in qualsiasi view (riassunti, mappe mentali, flashcard, quiz):

1. **Partiva sempre Melissa** (coach di default) invece di permettere la scelta del professore
2. **Nessuna scelta materia** - Non si poteva selezionare la materia prima di creare il tool
3. **Voce non funzionante** - Il pulsante voce era solo estetico, non connetteva realmente
4. **Nessuna scelta modalità** - Non si poteva scegliere tra voce e chat

### Screenshot del problema
L'utente vedeva "In attesa dello strumento..." con Melissa che rispondeva sempre, senza possibilità di scelta.

---

## SOLUZIONE

### Flow Nuovo (3 step)

```
[Crea con Professore]
    → Dialog Step 1: Scegli MATERIA (griglia di tutte le materie)
    → Dialog Step 2: Scegli MAESTRO (filtrato per materia, o tutti se nessuno specifico)
    → Dialog Step 3: Scegli MODALITÀ (Voce o Chat)
    → Entra in Focus Mode con maestro e modalità selezionati
```

### Componenti

1. **ToolMaestroSelectionDialog** (NUOVO)
   - Dialog modale a 3 step
   - Step 1: Griglia materie (usa `getAllSubjects()`)
   - Step 2: Lista maestri (usa `getMaestriBySubject()`)
   - Step 3: Scelta Voce/Chat con icone
   - Auto-skip step 2 se solo 1 maestro per materia

2. **Focus Tool Layout** (MODIFICATO)
   - Integrazione `useVoiceSession` hook
   - Auto-connessione voce se `focusInteractionMode === 'voice'`
   - UI pulsanti voce con stati (listening, speaking, muted, connecting)
   - Indicatore livello input microfono
   - Badge stato voce nell'header

3. **App Store** (MODIFICATO)
   - Nuovo stato: `focusInteractionMode: 'voice' | 'chat'`
   - Firma aggiornata: `enterFocusMode(toolType, maestroId?, interactionMode?)`

---

## FILE MODIFICATI

| File | Tipo | Linee | Descrizione |
|------|------|-------|-------------|
| `src/components/education/tool-maestro-selection-dialog.tsx` | NUOVO | ~340 | Dialog 3-step selezione |
| `src/components/education/summaries-view.tsx` | MOD | +19 | Import dialog, stato, handler |
| `src/components/education/mindmaps-view.tsx` | MOD | +19 | Import dialog, stato, handler |
| `src/components/education/flashcards-view.tsx` | MOD | +20 | Import dialog, stato, handler |
| `src/components/education/quiz-view.tsx` | MOD | +20 | Import dialog, stato, handler |
| `src/components/tools/focus-tool-layout.tsx` | MOD | +225 | Voice integration completa |
| `src/lib/stores/app-store.ts` | MOD | +8 | focusInteractionMode state |

**Totale**: ~650 linee aggiunte/modificate

---

## DETTAGLIO MODIFICHE

### 1. tool-maestro-selection-dialog.tsx (NUOVO)

```typescript
interface ToolMaestroSelectionDialogProps {
  isOpen: boolean;
  toolType: ToolType;
  onConfirm: (maestro: Maestro, mode: 'voice' | 'chat') => void;
  onClose: () => void;
}

type Step = 'subject' | 'maestro' | 'mode';
```

**Funzionalità:**
- Animazioni Framer Motion tra step
- Traduzione materie in italiano (SUBJECT_LABELS)
- Traduzione tool in italiano (TOOL_LABELS)
- Back button per tornare indietro
- Click fuori per chiudere
- Auto-select maestro se unico per materia

### 2. View Files (summaries, mindmaps, flashcards, quiz)

Pattern identico in tutti:

```typescript
// Stato
const [showMaestroDialog, setShowMaestroDialog] = useState(false);

// Handler
const handleMaestroConfirm = useCallback((maestro: Maestro, mode: 'voice' | 'chat') => {
  setShowMaestroDialog(false);
  enterFocusMode('toolType', maestro.id, mode);
}, [enterFocusMode]);

// Button
<Button onClick={() => setShowMaestroDialog(true)}>
  Crea con un Professore
</Button>

// Dialog
<ToolMaestroSelectionDialog
  isOpen={showMaestroDialog}
  toolType="toolType"
  onConfirm={handleMaestroConfirm}
  onClose={() => setShowMaestroDialog(false)}
/>
```

### 3. focus-tool-layout.tsx

**Nuovi import:**
```typescript
import { Phone, PhoneOff, Volume2 } from 'lucide-react';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import type { Subject } from '@/types';
```

**Nuovo stato:**
```typescript
const [connectionInfo, setConnectionInfo] = useState<{...} | null>(null);
const [configError, setConfigError] = useState<string | null>(null);
const lastTranscriptIdRef = useRef<string | null>(null);
```

**Voice session hook:**
```typescript
const {
  isConnected: voiceConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
  connectionState,
  connect: voiceConnect,
  disconnect: voiceDisconnect,
  toggleMute,
  sessionId: voiceSessionId,
} = useVoiceSession({ onError, onTranscript });
```

**Effects:**
1. Fetch connection info on mount (`/api/realtime/token`)
2. Auto-start voice if `focusInteractionMode === 'voice'`
3. Connect to voice when `isVoiceActive` becomes true

**UI Elements:**
- Header badge stato voce (verde/blu/rosso)
- Pulsante voce con stati visivi
- Indicatore livello input
- Pulsante mute
- Pulsante end call

### 4. app-store.ts

```typescript
// State
focusInteractionMode: 'voice' | 'chat';

// Action signature
enterFocusMode: (toolType: ToolType, maestroId?: string, interactionMode?: 'voice' | 'chat') => void;

// Implementation
enterFocusMode: (toolType, maestroId, interactionMode = 'chat') => set({
  focusMode: true,
  focusToolType: toolType,
  focusMaestroId: maestroId || null,
  focusInteractionMode: interactionMode,
  focusTool: null,
}),

// Reset on exit
exitFocusMode: () => set({
  focusMode: false,
  focusTool: null,
  focusToolType: null,
  focusMaestroId: null,
  focusInteractionMode: 'chat',
}),
```

---

## TEST MANUALI

### Test 1: Flow Base
1. Vai a `/materiali` (o riassunti/mappe/flashcard/quiz)
2. Clicca "Crea con un Professore"
3. Verifica: appare dialog con materie
4. Seleziona una materia (es. Matematica)
5. Verifica: appare lista maestri per quella materia
6. Seleziona un maestro
7. Verifica: appare scelta Voce/Chat
8. Seleziona Chat
9. Verifica: entra in focus mode con maestro corretto

### Test 2: Voice Mode
1. Ripeti flow, seleziona "Voce" al step 3
2. Verifica: focus mode si apre
3. Verifica: badge "Connessione..." appare nell'header
4. Verifica: dopo connessione, badge diventa "Voce attiva"
5. Verifica: pulsante mute funziona
6. Verifica: pulsante end call disconnette

### Test 3: Auto-select Maestro
1. Seleziona materia con un solo maestro
2. Verifica: salta direttamente a step 3 (mode selection)

### Test 4: Back Navigation
1. Vai a step 2 o 3
2. Clicca "Indietro"
3. Verifica: torna allo step precedente

### Test 5: Close Dialog
1. Apri dialog
2. Clicca X o fuori dal dialog
3. Verifica: dialog si chiude, stato resettato

---

## VERIFICA BUILD

```bash
cd /Users/roberdan/GitHub/ConvergioEdu-tool-focus

# Typecheck
npm run typecheck  # ✅ 0 errors

# Build
npm run build      # ✅ Passa

# Lint
npm run lint -- src/components/education/tool-maestro-selection-dialog.tsx \
                src/components/education/summaries-view.tsx \
                src/components/education/mindmaps-view.tsx \
                src/components/education/flashcards-view.tsx \
                src/components/education/quiz-view.tsx \
                src/components/tools/focus-tool-layout.tsx \
                src/lib/stores/app-store.ts
# ✅ Passa
```

---

## GIT WORKFLOW

```bash
# Nel worktree
cd /Users/roberdan/GitHub/ConvergioEdu-tool-focus

# Crea branch
git checkout -b feature/tool-focus-mode-selection

# Stage tutti i file
git add src/components/education/tool-maestro-selection-dialog.tsx
git add src/components/education/summaries-view.tsx
git add src/components/education/mindmaps-view.tsx
git add src/components/education/flashcards-view.tsx
git add src/components/education/quiz-view.tsx
git add src/components/tools/focus-tool-layout.tsx
git add src/lib/stores/app-store.ts

# Commit
git commit -m "feat: add maestro/voice selection before tool focus mode

- Add ToolMaestroSelectionDialog component (3-step: subject → maestro → mode)
- Update all tool views to use dialog before entering focus mode
- Add voice integration to focus-tool-layout with auto-connect
- Add focusInteractionMode to UI store

Closes #XX

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push e PR
git push -u origin feature/tool-focus-mode-selection
gh pr create --title "feat: add maestro/voice selection before tool focus mode" --body "..."
```

---

## CLEANUP POST-MERGE

```bash
# Dopo merge della PR
cd /Users/roberdan/GitHub/ConvergioEdu

# Rimuovi worktree
git worktree remove ../ConvergioEdu-tool-focus

# Elimina branch locale
git branch -d feature/tool-focus-mode-selection

# Aggiorna main
git checkout main
git pull origin main

# Sposta piano a completed
mv docs/plans/in-progress/ToolFocusModeSelection-2026-01-01.md docs/plans/completed/
```

---

## NOTE

- Il dialog usa `getMaestriBySubject()` e `getAllSubjects()` da `@/data`
- Se nessun maestro per una materia, mostra tutti i maestri
- La voice integration usa lo stesso `useVoiceSession` hook della chat principale
- I transcript vocali vengono aggiunti ai messaggi della chat nel focus mode
