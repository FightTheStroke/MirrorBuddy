# Master Plan v2.1 - Gennaio 2026

**Data**: 2026-01-02
**Branch**: `development`
**Status**: In Progress
**Owner**: Roberto

---

## Executive Summary

Piano unificato che risolve **6 bug critici** + implementa feature pianificate.

### Priorità

| Wave | Tipo | Urgenza | Descrizione |
|------|------|---------|-------------|
| **WAVE 0** | CRITICAL BUGS | ASAP | 6 problemi che rompono l'esperienza utente |
| WAVE 1 | Quick Win | Alta | Voice model migration (80-90% cost savings) |
| WAVE 2 | Feature | Media | Study Kit Generator |
| WAVE 3 | Tech Debt | Bassa | Refactoring e hardening |

---

## GitHub Issues WAVE 0

| Bug | Issue | Track | Status |
|-----|-------|-------|--------|
| 0.1 Tool Creation | [#97](https://github.com/Roberdan/ConvergioEdu/issues/97) | A | ✅ Fixed |
| 0.2 Memory Maestri | [#98](https://github.com/Roberdan/ConvergioEdu/issues/98) | B | ✅ Fixed |
| 0.3 Demo Interattive | [#99](https://github.com/Roberdan/ConvergioEdu/issues/99) | A | ✅ Fixed |
| 0.4 Gamification | [#100](https://github.com/Roberdan/ConvergioEdu/issues/100) | C | ⚠️ Partial |
| 0.5 Parent Dashboard | [#101](https://github.com/Roberdan/ConvergioEdu/issues/101) | D | Open |
| 0.6 Layout Full Screen | [#102](https://github.com/Roberdan/ConvergioEdu/issues/102) | D | ⚠️ Partial |

### Gestione Issues

```
WORKFLOW PER OGNI ISSUE:

1. PRIMA DI INIZIARE:
   - Assegna issue a te stesso
   - Sposta in "In Progress" (se usi Projects)
   - Crea branch: git checkout -b fix/issue-{numero}-{descrizione-breve}

2. DURANTE IL LAVORO:
   - Committa con: "fix: {descrizione} (#{numero})"
   - Aggiorna checklist nell'issue man mano
   - Se trovi problemi aggiuntivi, aggiungi task alla checklist

3. DOPO IL FIX:
   - npm run lint && npm run typecheck && npm run test:unit
   - Lancia thor-quality-assurance-guardian
   - Solo se thor approva:
     - Committa finale
     - Aggiorna issue: "Fixed in {commit-sha}"
     - Marca tutti i checkbox come completati
     - NON chiudere l'issue (si chiude con PR)

4. AL TERMINE DI WAVE 0:
   - Tutti i fix su development
   - Crea PR: development → main
   - Nel corpo PR, elenca: "Closes #97, #98, #99, #100, #101, #102"
   - Thor review finale
   - Merge chiude automaticamente le issues
```

---

# WAVE 0: CRITICAL BUGS [ASAP]

## BUG 0.1: Tool Creation con Maestri NON FUNZIONA

### Richiesta Originale (Roberto)
> "La creazione di mappe, riassunti, demo etc con un professore non funziona un cazzo: risponde sempre solo melissa, i tool non si caricano e la UI fa cagare in genere e non è quello che avevo chiesto. Questa cosa va sistemata asap!"

### Root Cause (Investigato)

**3 flussi di tool creation, solo 2 funzionano:**

1. ✅ `maestri-grid.tsx → maestro-session.tsx` - Funziona
2. ⚠️ `focus-tool-layout.tsx` - Fallback silenzioso a Melissa se `focusMaestroId=null`
3. ❌ `conversation-flow.tsx` - **BROKEN**: parte SEMPRE con Coach Melissa, non c'è dialog per selezionare maestro

**File con problemi:**

| File | Linea | Problema |
|------|-------|----------|
| `focus-tool-layout.tsx` | 117-134 | Fallback silenzioso a Melissa |
| `conversation-flow-store.ts` | 400-402 | `startConversation()` usa sempre `getDefaultSupportTeacher()` = Melissa |
| `conversation-flow.tsx` | 164 | `handleToolRequest` passa `activeCharacter.id` che è sempre Melissa |

### Fix Richiesti

- [x] **0.1.1** Aggiungere `ToolMaestroSelectionDialog` a `conversation-flow.tsx`
  - Quando user chiede tool, aprire dialog per scegliere maestro
  - Usare `maestro.id` per POST a /api/chat invece di `activeCharacter.id`

- [x] **0.1.2** Fix fallback silenzioso in `focus-tool-layout.tsx`
  - Se `focusMaestroId` è null, mostrare errore o dialog di selezione
  - NON fallback silenzioso a Melissa

- [x] **0.1.3** Verificare `pendingToolRequest` in sessionStorage
  - `conversation-flow.tsx` deve leggere `pendingToolRequest` se presente
  - Altrimenti aprire dialog selezione maestro

- [x] **0.1.4** Fix Maestro ID mismatch: focus-tool-layout now uses @/data getMaestroById
- [ ] **0.1.5** Test E2E: creare tool con 3 maestri diversi, verificare che funzioni

---

## BUG 0.2: Maestri NON RICORDANO Conversazioni Precedenti

### Richiesta Originale (Roberto)
> "Gli agenti ripartono sempre da capo, va implementato quello che avevo chiesto di creare un riassunto dopo ogni conversazione (sia che si riagganci la call sia che ci si sposti su un altro maestro o comunque si esca dalla conversazione vocale o chat con qualcuno) e la volta successiva ci si deve ricordare ci cosa si è parlato e ripartire da li, non sempre da capo a cazzo. Melissa mi ha detto almeno 20 volte chi è e quanti anni ha. Questo doveva già essere implementato, perchè cazzo non lo è?"

### Root Cause (Investigato)

**Sistema PARZIALMENTE implementato ma DISCONNESSO:**

| Componente | Stato | Problema |
|------------|-------|----------|
| Memory Loader | ✅ Esiste | Funziona solo se chiamato |
| Summary Generator | ✅ Esiste | Solo manuale, mai automatico |
| Inactivity Monitor | ✅ Codice esiste | **MAI USATO** - `trackActivity()` non viene mai chiamato |
| Frontend Memory | ⚠️ Caricato | **Non passato al backend** |
| Auto-close | ❌ Manca | Zero implementazione |

**Gap critici:**

1. `inactivityMonitor.trackActivity()` **NON VIENE MAI CHIAMATO** in tutta la codebase
2. `setTimeoutCallback()` **NON È MAI REGISTRATO**
3. `conversation-flow.tsx` carica memory ma **non la passa** al chat API
4. Riassunti generati **SOLO** se user clicca esplicitamente "Termina conversazione"

### Fix Richiesti

- [x] **0.2.1** Attivare `InactivityMonitor`
  - Chiamare `trackActivity(conversationId)` quando inizia conversazione
  - Registrare `setTimeoutCallback()` per chiamare `/api/conversations/[id]/end` al timeout (15 min)

- [x] **0.2.2** Auto-generare riassunto quando:
  - User chiude tab/browser (beforeunload)
  - User cambia maestro (switchToCharacter)
  - User termina call vocale (handleVoiceCall)
  - Timeout inattività scatta (setTimeoutCallback)

- [x] **0.2.3** Passare memory al chat API
  - Chat API già carica memory da DB usando `loadPreviousContext()`
  - Funzionerà automaticamente una volta generati i riassunti

- [x] **0.2.4** Greeting contextualizzato
  - `switchToCharacter` ora chiama `loadContextualGreeting()`
  - Se esiste memoria precedente, usa greeting personalizzato invece del default

- [ ] **0.2.5** Test: parlare con Melissa, dire nome/età, chiudere, riaprire → deve ricordare

---

## BUG 0.3: Demo Interattive NON si Creano Dinamicamente

### Richiesta Originale (Roberto)
> "Anche le demo interattive, cosi come tutti gli altri strumenti, devono poter essere creati dinamicamente insieme ad un professore, perchè non lo fa?"

### Root Cause

Stesso problema di BUG 0.1: il flusso `conversation-flow.tsx` non permette di selezionare un maestro per creare demo. Inoltre:

- `demo-handler.ts` esiste ma potrebbe non essere registrato correttamente
- Il dialog di selezione tool non include sempre "Demo Interattiva"

### Fix Richiesti

- [x] **0.3.1** Verificare che `demo-handler.ts` sia registrato in `handlers/index.ts`
  - ✅ Verified: `demo-handler.ts` is properly registered in `/src/lib/tools/handlers/index.ts`
- [x] **0.3.2** Aggiungere "Demo Interattiva" al dialog di selezione tool
  - ✅ Added 'demo' type to ToolMaestroSelectionDialog TOOL_NAMES mapping
- [x] **0.3.3** Stesso fix di 0.1.1: permettere selezione maestro per creare demo
  - ✅ Demo creation now uses maestro selection dialog (same flow as other tools)
- [x] **0.3.4** Fix demo images not showing: added img-src to CSP in demo-sandbox.tsx
- [ ] **0.3.5** Test: chiedere a Galileo di creare demo sul sistema solare

---

## BUG 0.4: Gamification NON FUNZIONA / NON CHIARA

### Richiesta Originale (Roberto)
> "La gamification funziona o no? i livelli non si muovono mai, e non è chiaro cosa bisogna fare per guadagnare punti. Magari i professori dovrebbero essere a conoscenza delle regole e usarle per incentivare lo studente a finire un compito, a fare qualcosa in piu?"

### Root Cause (Investigato)

**Sistema XP FUNZIONA ma INVISIBILE:**

| Componente | Stato | Problema |
|------------|-------|----------|
| XP Assignment | ✅ Funziona | Assegna XP automaticamente |
| Level Calculation | ✅ Funziona | Calcola livelli correttamente |
| DB Sync | ✅ Funziona | Sincronizza con backend |
| **Maestri** | ❌ **IGNARI** | **Zero riferimenti a XP/gamification nei system prompt** |

**XP assegnati (ma nessuno lo dice allo studente):**
- Sessioni Maestri: 5 XP/min, 10 XP/domanda, max 100 XP/sessione
- Flashcards: 2-15 XP per carta
- Pomodoro: 15 XP completato, +15 XP per ciclo, +10 XP primo del giorno

**Problema:** I 17 Maestri NON HANNO NULLA sulla gamification nel system prompt. Lo studente guadagna XP senza capire perché.

### Fix Richiesti

- [ ] **0.4.1** Aggiungere regole gamification ai system prompt dei Maestri
  ```
  GAMIFICATION:
  - Lo studente guadagna 5 XP al minuto di conversazione
  - 10 XP per ogni domanda che fa
  - Incoraggialo a completare attività per guadagnare punti
  - Celebra quando sale di livello
  - Menziona gli achievement che può sbloccare
  ```

- [ ] **0.4.2** Comunicare XP guadagnati
  - Toast notification quando si guadagnano XP
  - Maestro che dice "Ottimo! Hai guadagnato 10 XP!"

- [ ] **0.4.3** UI più chiara per le regole
  - Sezione "Come guadagnare XP" visibile da qualche parte
  - Tooltip sui componenti gamification

- [ ] **0.4.4** Test: fare sessione con maestro, verificare che comunichi XP guadagnati

---

## BUG 0.5: Parent Dashboard UI SCADENTE

### Richiesta Originale (Roberto)
> "Dashboard genitori va integrata meglio nella UI, cosi fa cagare"

### Fix Richiesti

- [ ] **0.5.1** Aggiungere "Genitori" nella navigation sidebar principale
- [ ] **0.5.2** Visual indicator per nuovi insights (badge/dot)
- [ ] **0.5.3** Route alias `/genitori` oltre a `/parent-dashboard`
- [ ] **0.5.4** Consent status indicator nel header
- [ ] **0.5.5** Mobile responsiveness improvements
- [ ] **0.5.6** Filtering/search per insights
- [ ] **0.5.7** Coerenza visiva con il resto della app

---

## BUG 0.6: Layout Full Screen INCOERENTE

### Richiesta Originale (Roberto)
> "Il layout full screen quando si usano i tool va fatto coerente con la app UI. io ho detto solo di minimizzare la barra di navigazione a sinistra non di toglierla, sulla destra, in stile analogo ai professori e coach etc (quindi stesso avatar, colori etc), per un 30% dello spazio disponibile max, ci deve essere sia la voce che la chat e il resto della pagina deve essere a disposizione del tool (mappe, riassunti, demo etc etc). ti torna?"

### Layout Richiesto

```
┌─────────────────────────────────────────────────────────────────────┐
│ [≡] Sidebar minimizzata (icone only)                                │
├────┬────────────────────────────────────────────────┬───────────────┤
│    │                                                │               │
│ S  │                                                │  [Avatar]     │
│ I  │           TOOL AREA (70%)                      │  Maestro      │
│ D  │     (Mappa / Riassunto / Demo / Quiz)          │  Name         │
│ E  │                                                │               │
│ B  │                                                │  ──────────   │
│ A  │                                                │               │
│ R  │                                                │  [Voice UI]   │
│    │                                                │  🎤 Parla     │
│ M  │                                                │               │
│ I  │                                                │  ──────────   │
│ N  │                                                │               │
│ I  │                                                │  [Chat]       │
│    │                                                │  Input...     │
│    │                                                │               │
└────┴────────────────────────────────────────────────┴───────────────┘
      │◄────────────── 70% ──────────────►│◄─── 30% ───►│
```

### Fix Richiesti

- [ ] **0.6.1** Sidebar minimizzata (icone only, non rimossa)
  - Click su icona espande temporaneamente
  - Hover mostra tooltip con nome sezione

- [ ] **0.6.2** Panel destro per Maestro (30% width max)
  - Avatar del maestro attivo (stesso stile delle card)
  - Nome e colore del maestro
  - Voice UI integrata
  - Chat input integrato
  - Stesso design language del resto della app

- [ ] **0.6.3** Tool area (70% width)
  - Spazio massimo per il contenuto del tool
  - Scroll se necessario
  - Toolbar tool-specific in alto

- [ ] **0.6.4** Responsive: su mobile, panel destro diventa bottom sheet

---

# WAVE 1: Voice Model Migration [QUICK WIN]

**Obiettivo**: Migrare da `gpt-4o-realtime` a `gpt-realtime-mini`
**Risparmio**: 80-90% costi voice ($198/mese → $26/mese per studente)
**Rischio**: Basso (stesso API format GA)

### Checklist

- [ ] **1.1** Deploy `gpt-realtime-mini` su Azure
- [ ] **1.2** Aggiungere env var `AZURE_OPENAI_REALTIME_DEPLOYMENT_PREMIUM`
- [ ] **1.3** Modificare `realtime-proxy.ts` con logica hybrid (MirrorBuddy → premium)
- [ ] **1.4** Test dev con 5 maestri
- [ ] **1.5** Test MirrorBuddy con deployment premium
- [ ] **1.6** Rollout production
- [ ] **1.7** Monitoring 7 giorni

---

# WAVE 2: Study Kit Generator [FEATURE]

**Obiettivo**: PDF → Study Kit automatico (riassunto + mappa + demo + quiz)
**Target**: Studenti DSA/ADHD

### Checklist

- [ ] **2.1** Creare `src/types/study-kit.ts`
- [ ] **2.2** Creare API routes `/api/study-kit/*`
- [ ] **2.3** Creare `study-kit-handler.ts`
- [ ] **2.4** Creare UI components (upload, progress, viewer)
- [ ] **2.5** Integrare bottone nel Knowledge Hub
- [ ] **2.6** Test con PDF reale
- [ ] **2.7** Verificare accessibilità WCAG 2.1 AA

---

# WAVE 3: Tech Debt Residuo [ONGOING]

### 3.1 Component Refactoring

| File | Linee | Target |
|------|-------|--------|
| `settings-view.tsx` | 3649 | max 500 |
| `conversation-flow.tsx` | 1281 | max 500 |
| `archive-view.tsx` | 1096 | max 500 |

### 3.2 Production Hardening

- [ ] Rate limiting su `/api/chat`, `/api/realtime/token`
- [ ] Voice fallback a text
- [ ] Health endpoint `/api/health`
- [ ] Token budget enforcement

### 3.3 Performance

- [ ] Connection pooling DB
- [ ] Caching maestri list, settings

---

# WAVE 4: Future (Backlog)

| Issue | Feature | Note |
|-------|---------|------|
| #49 | Calendar Sync | ClasseViva + Google Classroom |
| #65 | i18n | Full UI localization |
| #66 | MirrorBuddy repo | Repository migration |

---

## Parallelizzazione WAVE 0

```
PARALLEL TRACK A: Tool Creation (0.1 + 0.3)
├── Fix conversation-flow.tsx
├── Fix focus-tool-layout.tsx
└── Verificare demo-handler registration

PARALLEL TRACK B: Memory System (0.2)
├── Attivare InactivityMonitor
├── Auto-generare riassunti
└── Passare memory al chat API

PARALLEL TRACK C: Gamification (0.4)
├── Aggiornare system prompt maestri
└── Toast notifications XP

PARALLEL TRACK D: UI/Layout (0.5 + 0.6)
├── Parent Dashboard integration
└── Focus mode layout redesign
```

## Ordine di Esecuzione

```
PRIORITY 1: WAVE 0 - Critical Bugs (ASAP)
├── Track A: 0.1 + 0.3 (Tool creation + Demo)
├── Track B: 0.2 (Memory)
├── Track C: 0.4 (Gamification)
└── Track D: 0.5 + 0.6 (UI/Layout)

PRIORITY 2: WAVE 1 - Voice Migration (1 giorno)

PRIORITY 3: WAVE 2 - Study Kit Generator (3-4 giorni)

ONGOING: WAVE 3 - Tech Debt
```

## Quality Assurance (OBBLIGATORIO)

### Per ogni task completato:
```
1. Implementa fix
2. npm run lint && npm run typecheck && npm run test:unit
3. Lancia thor-quality-assurance-guardian per verificare:
   - Codice scritto correttamente
   - Nessun task dimenticato
   - Test coverage adeguata
   - Nessun TODO lasciato
4. Solo se thor approva → commit
```

### Al termine di ogni WAVE:
```
1. Tutti i task della WAVE completati
2. Lancia thor su TUTTA la WAVE
3. Thor verifica:
   - Tutte le checkbox marcate
   - Nessun bug reintrodotto
   - Documentazione aggiornata
   - CHANGELOG aggiornato
4. Solo se thor approva → procedi alla WAVE successiva
```

### Al termine di WAVE 0 (Critical Bugs):
```
1. Tutti i 6 bug fixati e verificati da thor
2. Crea PR: development → main
3. Thor fa review finale della PR:
   - Code review completa
   - Verifica TUTTE le richieste originali di Roberto soddisfatte
   - Verifica lint/typecheck/test/build passano
   - Verifica documentazione completa
4. Solo se thor approva → merge PR
```

## Documentazione (Per ogni fix completato)

- [ ] **ADR**: Se cambia architettura, creare ADR in `docs/adr/`
- [ ] **CHANGELOG**: Aggiornare `CHANGELOG.md` con fix
- [ ] **Code comments**: Documentare "perché" nei punti critici
- [ ] **Master Plan**: Marcare checkbox come completate
- [ ] **GitHub Issues**: Chiudere issue collegata (se creata)

---

## Verification Commands

```bash
npm run lint          # Must be 0 warnings
npm run typecheck     # Must pass
npm run test:unit     # 1945+ tests passing
npm run build         # Must pass
```

---

## Reference Plans (Archived)

Piani incorporati in questo documento:
- `done/TechDebt-Backlog-2026-01-02.md`
- `done/VoiceModelMigration-2026-01-02.md`
- `done/StudyKitGenerator-2026-01-02.md`
- `done/KnowledgeBaseOptimization-2026-01-01.md`

Test manuali separati:
- `todo/ManualTests-Sprint-2026-01.md`

---

## WAVE 0 Progress Summary

### ✅ Completed (PR #103)

**Bug 0.1 - Tool Creation:**
- ToolMaestroSelectionDialog added to conversation-flow.tsx
- Focus fallback fixed in focus-tool-layout.tsx
- pendingToolRequest handling implemented
- **Critical Fix**: Maestro ID mismatch resolved (was using wrong import)

**Bug 0.2 - Memory System:**
- InactivityMonitor activated with trackActivity
- Auto-summary on: tab close, maestro switch, voice end, timeout
- Memory passed to chat API
- Contextual greetings based on previous conversations

**Bug 0.3 - Demo Interattive:**
- demo-handler properly registered
- Demo type added to tool selection dialog
- Same maestro selection flow as other tools
- **Critical Fix**: Images now show (CSP img-src added)

### ⚠️ Partial

**Bug 0.4 - Gamification:**
- XP system works but Maestri don't communicate it
- Need: system prompt updates, XP toast notifications

**Bug 0.6 - Layout Full Screen:**
- Basic layout implemented (sidebar, tool area, panel)
- Need: redesign to match phone-call UI style for consistency

### ❌ Not Started

**Bug 0.5 - Parent Dashboard:**
- UI integration improvements not done

---

**Autore**: Claude Opus 4.5
**Versione**: 2.1
**Ultimo Update**: 2026-01-02 15:30
