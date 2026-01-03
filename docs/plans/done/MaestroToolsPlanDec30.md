# MaestroToolsPlanDec30 - Interactive Tools & Materials System

**Data**: 2025-12-30
**Target**: Complete tool execution + Materials archive + UI improvements
**Metodo**: VERIFICA BRUTALE - ogni task testato prima di dichiararlo fatto

---

## 🎯 ESEGUI PIANO - UN SOLO COMANDO

**Apri Kitty, poi copia e incolla QUESTO:**

```
Esegui il piano in /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md - Sei il COORDINATORE (CLAUDE 1). Workflow: 1) Crea branch e worktree per ogni Claude (vedi sezione GIT WORKFLOW), 2) Lancia 4 Claude con claude-parallel.sh, 3) Invia ogni Claude al suo worktree, 4) Invia i task, 5) Monitora e sincronizza i gate, 6) Quando ogni Claude finisce deve fare commit+push+PR, 7) Tu fai merge delle PR in ordine, 8) Cleanup worktree e branch. Segui le regole BRUTAL MODE. Mai chiudere issue senza prova.
```

**Tutto qui. CLAUDE 1 leggerà il piano e farà il resto.**

---

## 🚀 KITTY ORCHESTRATION - DETTAGLI

> **LEGGI PRIMA DI TUTTO** - Istruzioni per parallelizzare

### Pre-requisiti
```bash
# DEVE essere eseguito da Kitty (non Warp, non iTerm)
# Verifica di essere in Kitty:
echo $KITTY_PID  # Deve stampare un numero

# Verifica remote control attivo:
~/.claude/scripts/kitty-check.sh
```

### GIT WORKFLOW (OBBLIGATORIO)

**Ogni Claude lavora in un worktree separato. Ogni fase = 1 PR.**

#### STEP 0: Setup Worktrees (CLAUDE 1 fa questo PRIMA di tutto)

```bash
cd /Users/roberdan/GitHub/MirrorBuddy

# Crea branch per ogni fase
git checkout MirrorBuddy
git branch feature/tools-phase1-backend
git branch feature/tools-phase2-ui
git branch feature/tools-phase3-integration

# Crea worktree per ogni Claude
git worktree add ../MirrorBuddy-C2 feature/tools-phase1-backend
git worktree add ../MirrorBuddy-C3 feature/tools-phase2-ui
git worktree add ../MirrorBuddy-C4 feature/tools-phase3-integration

# Verifica
git worktree list
```

#### Mapping Claude → Worktree → Branch

| Claude | Worktree | Branch | PR |
|--------|----------|--------|-----|
| CLAUDE 1 | `/Users/roberdan/GitHub/MirrorBuddy` | MirrorBuddy | Coordina solo |
| CLAUDE 2 | `/Users/roberdan/GitHub/MirrorBuddy-C2` | feature/tools-phase1-backend | PR #1 |
| CLAUDE 3 | `/Users/roberdan/GitHub/MirrorBuddy-C3` | feature/tools-phase2-ui | PR #2 |
| CLAUDE 4 | `/Users/roberdan/GitHub/MirrorBuddy-C4` | feature/tools-phase3-integration | PR #3 |

---

### Launch Sequence (DA ESEGUIRE IN ORDINE)

**STEP 1: Lancia i Claude worker (dal terminale Kitty)**
```bash
~/.claude/scripts/claude-parallel.sh 4
```

**STEP 2: Invia ogni Claude al suo worktree**
```bash
kitty @ send-text --match title:Claude-2 "cd /Users/roberdan/GitHub/MirrorBuddy-C2" && kitty @ send-key --match title:Claude-2 Return
kitty @ send-text --match title:Claude-3 "cd /Users/roberdan/GitHub/MirrorBuddy-C3" && kitty @ send-key --match title:Claude-3 Return
kitty @ send-text --match title:Claude-4 "cd /Users/roberdan/GitHub/MirrorBuddy-C4" && kitty @ send-key --match title:Claude-4 Return
```

**STEP 3: Invia i task**
```bash
kitty @ send-text --match title:Claude-2 "Leggi /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md, sei CLAUDE 2 (BACKEND). Lavori nel worktree feature/tools-phase1-backend. Esegui T-00 → T-06. Quando finisci: commit, push, crea PR verso MirrorBuddy." && kitty @ send-key --match title:Claude-2 Return

kitty @ send-text --match title:Claude-3 "Leggi /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md, sei CLAUDE 3 (FRONTEND). Lavori nel worktree feature/tools-phase2-ui. ATTENDI GATE-1 poi esegui T-07 → T-12. Quando finisci: commit, push, crea PR." && kitty @ send-key --match title:Claude-3 Return

kitty @ send-text --match title:Claude-4 "Leggi /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md, sei CLAUDE 4 (INTEGRATION). Lavori nel worktree feature/tools-phase3-integration. ATTENDI GATE-2 poi esegui T-15 → T-22. Quando finisci: commit, push, crea PR." && kitty @ send-key --match title:Claude-4 Return
```

---

### PR Workflow (ogni Claude fa questo quando completa la sua fase)

```bash
# 1. Commit tutto
git add .
git commit -m "feat(tools): Phase X - [description]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 2. Push
git push -u origin feature/tools-phaseX-[name]

# 3. Crea PR
gh pr create --title "feat(tools): Phase X - [description]" --body "## Summary
- [bullet points]

## Issues Closed
- Closes #XX
- Closes #YY

## Test Plan
- [ ] npm run lint ✅
- [ ] npm run typecheck ✅
- [ ] npm run build ✅
- [ ] Manual test: [description]

🤖 Generated with Claude Code" --base MirrorBuddy
```

---

### Merge & Cleanup (CLAUDE 1 fa questo alla fine)

```bash
cd /Users/roberdan/GitHub/MirrorBuddy

# 1. Merge tutte le PR (in ordine!)
gh pr merge [PR-1-number] --merge
gh pr merge [PR-2-number] --merge
gh pr merge [PR-3-number] --merge

# 2. Pull changes
git pull origin MirrorBuddy

# 3. Cleanup worktrees
git worktree remove ../MirrorBuddy-C2
git worktree remove ../MirrorBuddy-C3
git worktree remove ../MirrorBuddy-C4

# 4. Cleanup branches
git branch -d feature/tools-phase1-backend
git branch -d feature/tools-phase2-ui
git branch -d feature/tools-phase3-integration

# 5. Verifica finale
npm run lint && npm run typecheck && npm run build
```

**STEP 4: Monitora (CLAUDE 1 durante l'esecuzione)**
```bash
~/.claude/scripts/claude-monitor.sh
```

### Gate Unlock Protocol

**Quando CLAUDE 2 completa Phase 1 (tutti T-01→T-08 = ✅):**
1. Aggiorna GATE-1 nel plan: `🔴 LOCKED` → `🟢 UNLOCKED`
2. Notifica CLAUDE 3:
```bash
kitty @ send-text --match title:Claude-3 "🟢 GATE-1 UNLOCKED! Inizia i tuoi task Phase 2." && kitty @ send-key --match title:Claude-3 Return
```

**Quando CLAUDE 3 completa Phase 2 (tutti T-09→T-14 = ✅):**
1. Aggiorna GATE-2 nel plan: `🔴 LOCKED` → `🟢 UNLOCKED`
2. Notifica CLAUDE 4:
```bash
kitty @ send-text --match title:Claude-4 "🟢 GATE-2 UNLOCKED! Inizia i tuoi task Phase 3." && kitty @ send-key --match title:Claude-4 Return
```

### Polling per Claude in Attesa

Se sei CLAUDE 3 o CLAUDE 4 in attesa di gate:
```bash
# Poll ogni 5 minuti
while ! grep "GATE-1" /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md | grep -q "🟢 UNLOCKED"; do
  echo "$(date): Waiting for GATE-1..."
  sleep 300
done
echo "🟢 GATE-1 UNLOCKED! Inizio lavoro..."
```

---

## GITHUB ISSUES COPERTE

| Issue | Titolo | Priority |
|-------|--------|----------|
| **#39** | Chat API missing OpenAI function calling | P0 BLOCKING |
| **#23** | Conversation-First Architecture - Tools via Chat/Voice | P0 |
| **#36** | Tool Panel - Video conference layout | P0 |
| **#38** | Tool Buttons Bar | P0 |
| **#35** | Demo button missing from Maestro cards | P1 |
| **#37** | Unified Archive page | P1 |
| **#22** | Materials Archive - Storage (IndexedDB) | P1 |
| **#19** | Rename Compiti→Materiali + redesign | P1 |
| **#26** | Real-time Tool Building (SSE wiring) | P1 |
| **#25** | Voice-First Tool Creation | P2 (voice works) |
| **#14** | Notifications system wiring | P2 |
| **#27** | Study Scheduler | P2 |
| **#33** | Conversazioni page UX | P2 |
| **#16** | Technical Support Assistant (Guido) | P3 |
| **#18** | Data integrity / reset progress | P3 |
| **#34** | Voice WebSocket bug | P3 |

---

## OVERVIEW

### The Problem
1. **#39**: Chat API has NO function calling - Maestros just output text
2. **#36**: No Tool Panel - tools render inline in chat (unusable)
3. **#35, #38**: No tool buttons on maestro cards or conversation
4. **#37**: No Archive - all created content is LOST
5. **#22**: No IndexedDB storage for materials
6. **#19**: Still says "Compiti", no Subject→Maestro flow
7. **#14, #27**: Notifications exist but NEVER triggered

### The Solution
Complete system with:
- OpenAI function calling in chat API (#39)
- Tool panel with video conference layout (#36)
- Tool buttons everywhere (#35, #38)
- Unified archive for ALL content (#37)
- IndexedDB for materials (#22)
- Materials page redesign (#19)
- Notification triggers (#14)

---

## USE CASES

| Action | Tool | Result |
|--------|------|--------|
| Click "Mappa" | Mind Map | Maestro creates interactive mind map |
| Click "Quiz" | Quiz | Maestro creates quiz, evaluates answers |
| Click "Demo" | Demo | Maestro generates HTML/JS simulation |
| Click "Cerca" | Search | Search web/YouTube for educational content |
| Click "Flashcard" | Flashcard | Maestro creates flashcard deck |
| Click "Webcam" | Upload | Capture photo → detect subject → route to Maestro |
| Upload PDF | Upload | PDF pages → detect subject → route to Maestro |
| Browse Archive | Archive | Filter/sort all created tools and materials |

---

## ARCHITECTURE

### Tool Execution Flow
```
Button click OR Maestro decides
        ↓
Chat API with OpenAI function calling (#39)
        ↓
Tool handler executes
        ↓
SSE broadcasts updates (#26)
        ↓
Tool Panel renders in real-time (#36)
        ↓
Save to Archive (IndexedDB #22 + Prisma)
        ↓
Available in Archive page (#37)
```

### Video Conference Layout (#36)
```
┌─────────────────────────────────────────┐
│ [Avatar] Maestro Name    [Close Panel]  │  10%
├─────────────────────────────────────────┤
│                                         │
│         TOOL CONTENT PANEL              │  70%
│    (Mind Map / Quiz / Demo / Webcam)    │
│                                         │
├─────────────────────────────────────────┤
│  Chat messages (scrollable)             │  15%
├─────────────────────────────────────────┤
│  [Input] [Mappa][Quiz][Demo][Cam][...]  │  5%
└─────────────────────────────────────────┘
```

### Materials Flow (#19)
```
Upload (Webcam/File/PDF)
        ↓
Azure Vision API analyzes
        ↓
Subject detected (math, science, etc.)
        ↓
User confirms subject
        ↓
Route to appropriate Maestro
        ↓
Maieutic guidance begins
        ↓
Save to Materials Archive (#37)
```

---

## 🎭 RUOLI CLAUDE

| Claude | Ruolo | Fase | Tasks | File Domain |
|--------|-------|------|-------|-------------|
| **CLAUDE 1** | 🎯 COORDINATORE | Tutte | Monitor, verify, aggregate, resolve conflicts | Nessun file (solo verifica) |
| **CLAUDE 2** | 👨‍💻 BACKEND | 0→1 | T-00→T-08 (ADR, types, APIs, handlers, storage) | `src/lib/tools/`, `src/app/api/`, `prisma/`, `docs/adr/` |
| **CLAUDE 3** | 👨‍💻 FRONTEND | 2 | T-09→T-14 (UI components, panels, buttons) | `src/components/tools/`, `src/components/conversation/` |
| **CLAUDE 4** | 👨‍💻 INTEGRATION + TESTS | 3 | T-15→T-22 (Wiring, archive, materials, tests) | `src/components/education/`, `src/lib/materials/`, `__tests__/` |

> **MAX 4 CLAUDE** - Oltre diventa ingestibile. CLAUDE 2-3-4 toccano file DIVERSI per evitare conflitti git.

---

## ⚠️ REGOLE OBBLIGATORIE (BRUTAL MODE)

### 🔴 CHIUSURA ISSUES - MAI CHIUDERE SENZA PROVA

```
⛔ NON CHIUDERE MAI UNA ISSUE SE:
- Il codice non è stato EFFETTIVAMENTE scritto
- I test non passano TUTTI
- npm run lint ha QUALSIASI warning
- npm run typecheck ha QUALSIASI errore
- npm run build fallisce
- La funzionalità non è VISIBILE e FUNZIONANTE nell'app
- Non hai fatto commit del codice

✅ PER CHIUDERE UNA ISSUE DEVI:
1. Codice scritto e committato
2. npm run lint && npm run typecheck && npm run build → TUTTI OK
3. Funzionalità testata manualmente nell'app
4. Screenshot o output che PROVA che funziona
5. Aggiornare plan file con ✅
6. Solo DOPO: gh issue close --reason completed

📸 PROVA RICHIESTA:
- Tool esegue? → mostra output in console
- UI visibile? → screenshot
- API funziona? → curl output
- Test passa? → output test

SE NON HAI PROVA, NON È FATTO.
```

---

### 🔴 LINEE GUIDA BRUTALI (NON NEGOZIABILI)

**Riferimento:** https://microsoft.github.io/code-with-engineering-playbook/

```
❌ ZERO TOLLERANZA PER:
- Cazzate e soluzioni "quick and dirty"
- Technical debt (ogni task COMPLETO, non "abbastanza buono")
- Errori e warnings ignorati
- TODO dimenticati nel codice
- console.log di debug lasciati in giro
- Codice commentato (usa git, non commenti)
- Dipendenze inutilizzate
- File temporanei non rimossi

✅ OBBLIGATORIO:
- Test per OGNI funzione critica
- Type safety STRICT (no any, no ignore)
- OWASP Top 10 compliance
- Documentazione inline per funzioni complesse
- Error handling ESPLICITO (no silent failures)
```

### 📋 Workflow Per Task

```
1. PRIMA di iniziare: leggi TUTTO questo file + CLAUDE.md
2. Per OGNI task:
   a. Leggi i file indicati (NON assumere nulla)
   b. Implementa (TypeScript strict, no shortcuts)
   c. Scrivi test se richiesto
   d. Esegui verifica (sotto)
   e. Aggiorna questo file: cambia ⬜ → 🔄 → ✅

3. VERIFICA OBBLIGATORIA dopo ogni task:
   npm run lint        # 0 errors, 0 warnings
   npm run typecheck   # DEVE passare
   npm run build       # DEVE buildare

4. NON DIRE MAI "FATTO" SE:
   - La verifica non passa
   - Hai lasciato TODO/FIXME
   - Ci sono warning anche solo 1
   - Non hai aggiornato questo file

5. CONFLITTI GIT:
   - Risolvi mantenendo ENTRAMBE le modifiche
   - In dubbio? Chiedi a CLAUDE 1

6. ERRORI:
   - Dopo 2 tentativi falliti con stesso approccio → cambia strategia
   - Dopo 3 fallimenti totali → STOP e chiedi aiuto
```

### 🧪 Test Requirements

```
- Ogni handler in src/lib/tools/handlers/ → test unitario
- Ogni API route → test integrazione
- Copertura minima: 80% per business logic
- Test E2E per flow critici (tool creation, archive)
```

### 📝 Documentazione Inline

```typescript
// BUONO: Spiega il PERCHÉ
// Safety: block localStorage access to prevent data exfiltration
const DANGEROUS_PATTERNS = [/localStorage/i, ...];

// CATTIVO: Ripete il COSA
// Check if pattern matches
if (pattern.test(code)) { ... }
```

---

## 🚦 PHASE GATES

| Gate | Blocking Phase | Waiting Phases | Status | Unlocked By | Unlocked At |
|------|----------------|----------------|--------|-------------|-------------|
| GATE-1 | Phase 1 (Foundation) | Phase 2 (UI) | 🔴 LOCKED | CLAUDE 2 | - |
| GATE-2 | Phase 2 (UI) | Phase 3 (Integration) | 🔴 LOCKED | CLAUDE 3 | - |

### Gate Instructions

**CLAUDE che completa fase bloccante:**
1. Verifica TUTTI i task della fase siano ✅
2. Esegui verifica: `npm run lint && npm run typecheck && npm run build`
3. Aggiorna tabella sopra: cambia Status da `🔴 LOCKED` a `🟢 UNLOCKED`
4. Aggiungi timestamp in "Unlocked At"
5. Invia notifica (comandi in sezione Kitty Orchestration sopra)

**CLAUDE in attesa di gate:**
1. Controlla questa tabella ogni 5 minuti
2. Oppure usa script polling (vedi sezione Kitty)
3. Quando gate diventa 🟢, inizia i tuoi task

---

## 🎭 CLAUDE 1: COORDINATORE - RESPONSABILITÀ

### Cosa Deve Fare CLAUDE 1
```
1. NON implementa codice (solo monitor/verify)
2. Controlla questo file ogni 10 minuti per aggiornamenti
3. Verifica che lint/typecheck/build passino sempre
4. Se un Claude chiede aiuto, fornisce guidance
5. Traccia elapsed time per fase
6. Alert se una fase supera 2x tempo stimato
7. Quando TUTTI i task sono ✅:
   a. Esegue verifica finale
   b. Prepara commit/PR
   c. Aggiorna PROGRESS SUMMARY
```

### Comandi di Monitoraggio (CLAUDE 1)
```bash
# Stato generale
npm run lint && npm run typecheck

# Git status
git status

# Verifica aggiornamenti remoti
git fetch && git log HEAD..origin/MirrorBuddy --oneline

# Leggi plan file per aggiornamenti
grep -E "^\\| (✅|🔄|⬜)" /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md

# Conta task completati
grep -c "^| ✅" /Users/roberdan/GitHub/MirrorBuddy/docs/plans/MaestroToolsPlanDec30.md
```

### Se Conflitti Git
```bash
# CLAUDE 1 risolve i conflitti:
git stash
git pull
git stash pop
# Se conflitto: mantieni ENTRAMBE le modifiche
```

---

## 🎯 EXECUTION TRACKER

### Phase 0: Preparation — 0/4 (CLAUDE 2 solo, prima di tutto)

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-00 | ADR: Tool Execution Architecture | **CLAUDE 2** | `docs/adr/0004-tool-execution-architecture.md` | |
| ⬜ | T-00b | Test setup: vitest config | **CLAUDE 2** | `vitest.config.ts`, `package.json` | Add vitest if not present |
| ⬜ | T-00c | Test skeleton: tool-executor.test.ts | **CLAUDE 2** | `src/lib/tools/__tests__/tool-executor.test.ts` | Empty tests, fill later |
| ⬜ | T-00d | Update CLAUDE.md with tool section | **CLAUDE 2** | `CLAUDE.md` | Document tool system |

### Phase 1: Foundation — 0/6 ⏳ BLOCKING

| Status | ID | Task | Issue | Assignee | Files |
|:------:|-----|------|-------|----------|-------|
| ⬜ | T-01 | Unified tool types | #23 | **CLAUDE 2** | `src/types/tools.ts` |
| ⬜ | T-02 | Chat API function calling | **#39** | **CLAUDE 2** | `src/app/api/chat/route.ts` |
| ⬜ | T-03 | Tool executor framework | #23 | **CLAUDE 2** | `src/lib/tools/tool-executor.ts` |
| ⬜ | T-04 | Tool handlers (mindmap, quiz, demo, search) | #23 | **CLAUDE 2** | `src/lib/tools/handlers/` |
| ⬜ | T-05 | CreatedTool Prisma model | #37 | **CLAUDE 2** | `prisma/schema.prisma` |
| ⬜ | T-06 | IndexedDB storage for materials | **#22** | **CLAUDE 2** | `src/lib/storage/materials-db.ts` |

### Phase 2: UI Components — 0/6 ⏸️ WAITING

| Status | ID | Task | Issue | Assignee | Files |
|:------:|-----|------|-------|----------|-------|
| ⬜ | T-07 | Tool panel component | **#36** | **CLAUDE 3** | `src/components/tools/tool-panel.tsx` |
| ⬜ | T-08 | Tool buttons bar | **#38** | **CLAUDE 3** | `src/components/conversation/tool-buttons.tsx` |
| ⬜ | T-09 | Demo sandbox (secure iframe) | #23 | **CLAUDE 3** | `src/components/tools/demo-sandbox.tsx` |
| ⬜ | T-10 | Search results component | #23 | **CLAUDE 3** | `src/components/tools/search-results.tsx` |
| ⬜ | T-11 | Notification triggers wiring | **#14** | **CLAUDE 3** | `src/lib/notifications/triggers.ts` |
| ⬜ | T-12 | Conversazioni page redesign | **#33** | **CLAUDE 3** | `src/app/conversazioni/page.tsx` |

### Phase 3: Integration & Tests — 0/8 ⏸️ WAITING

| Status | ID | Task | Issue | Assignee | Files |
|:------:|-----|------|-------|----------|-------|
| ⬜ | T-15 | Wire tools to conversation | #23, #26 | **CLAUDE 4** | `src/components/conversation/conversation-flow.tsx` |
| ⬜ | T-16 | Materials page redesign | **#19** | **CLAUDE 4** | `src/components/education/materials-view.tsx` |
| ⬜ | T-17 | Subject→Maestro routing | #19 | **CLAUDE 4** | `src/lib/materials/subject-router.ts` |
| ⬜ | T-18 | Unified Archive page | **#37** | **CLAUDE 4** | `src/components/education/archive-view.tsx` |
| ⬜ | T-19 | Add Demo + Webcam to maestro cards | **#35** | **CLAUDE 4** | `src/components/maestros/maestro-card.tsx` |
| ⬜ | T-20 | Persist tools to database + API | #37 | **CLAUDE 4** | `src/lib/tools/tool-persistence.ts`, `src/app/api/tools/saved/route.ts` |
| ⬜ | T-21 | Unit tests: tool-executor + handlers | - | **CLAUDE 4** | `src/lib/tools/__tests__/*.test.ts` |
| ⬜ | T-22 | Integration test: full tool flow | - | **CLAUDE 4** | `e2e/tools.spec.ts` |

---

## 📋 TASK DETAILS

---

## CLAUDE 2: PHASE 0 (Preparation)

### T-00: ADR - Tool Execution Architecture

Create `docs/adr/0004-tool-execution-architecture.md`:

```markdown
# ADR 0004: Tool Execution Architecture

## Status
Accepted

## Context
I Maestri AI devono poter creare strumenti interattivi (mind maps, quiz, demo, flashcard)
durante le conversazioni. Attualmente il chat API NON ha function calling - i Maestri
scrivono solo testo come "Usa lo strumento create_mindmap..." senza eseguire nulla.

Problemi attuali:
1. Chat API non supporta OpenAI function calling
2. Nessun tool panel per visualizzare i tool creati
3. Nessun storage per salvare i tool
4. Nessun archivio per rivedere tool passati

Opzioni considerate:
1. Client-side parsing del testo → fragile, non affidabile
2. Streaming custom → complesso, non standard
3. OpenAI function calling → standard, supportato, affidabile

## Decision
Implementiamo OpenAI function calling nel chat API con:
- `tools` parameter con CHAT_TOOL_DEFINITIONS
- Tool executor framework con handler registry
- SSE per aggiornamenti real-time
- IndexedDB per storage materiali
- Prisma CreatedTool model per persistenza

## Consequences

### Positive
- Standard OpenAI API, ben documentato
- Affidabile: il modello decide quando chiamare i tool
- Estensibile: nuovi tool = nuovi handler
- Real-time: SSE per progress updates

### Negative
- Richiede Azure OpenAI (Ollama non supporta function calling)
- Complessità aggiuntiva nel frontend

## References
- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- Issue #39: Chat API missing function calling
- Issue #23: Conversation-First Architecture
```

---

### T-00b: Test Setup - Vitest Config

1. Check if vitest is installed: `npm ls vitest`
2. If not: `npm install -D vitest @vitest/ui`
3. Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

4. Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

5. Add to `package.json` scripts:
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:unit:ui": "vitest --ui",
"test:unit:coverage": "vitest run --coverage"
```

---

### T-00c: Test Skeleton - tool-executor.test.ts

Create `src/lib/tools/__tests__/tool-executor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
// These imports will be added after T-01, T-03 are done
// import { registerToolHandler, executeToolCall } from '../tool-executor';
// import type { ToolExecutionResult } from '@/types/tools';

describe('tool-executor', () => {
  describe('registerToolHandler', () => {
    it('should register a handler for a function name', () => {
      // TODO: implement after T-03
      expect(true).toBe(true); // Placeholder
    });

    it('should overwrite existing handler with same name', () => {
      // TODO: implement after T-03
      expect(true).toBe(true);
    });
  });

  describe('executeToolCall', () => {
    it('should execute registered handler with args', async () => {
      // TODO: implement after T-03
      expect(true).toBe(true);
    });

    it('should return error for unknown tool', async () => {
      // TODO: implement after T-03
      expect(true).toBe(true);
    });

    it('should broadcast tool_started event', async () => {
      // TODO: implement after T-03
      expect(true).toBe(true);
    });

    it('should broadcast tool_completed on success', async () => {
      // TODO: implement after T-03
      expect(true).toBe(true);
    });

    it('should broadcast tool_error on failure', async () => {
      // TODO: implement after T-03
      expect(true).toBe(true);
    });
  });
});
```

---

### T-00d: Update CLAUDE.md with Tool Section

Add to `CLAUDE.md` after "### MirrorBuddy v2.0" section:

```markdown
### Tool Execution System

> **Architecture Decision**: ADR 0004 - Tool Execution Architecture

The Maestri can create interactive tools during conversations using OpenAI function calling.

#### Key Files

| File | Purpose |
|------|---------|
| `src/types/tools.ts` | Tool types and OpenAI function definitions |
| `src/lib/tools/tool-executor.ts` | Handler registry and execution |
| `src/lib/tools/handlers/` | Individual tool handlers |
| `src/components/tools/tool-panel.tsx` | Tool visualization panel |
| `src/components/tools/demo-sandbox.tsx` | Secure iframe for demos |
| `src/lib/storage/materials-db.ts` | IndexedDB for materials |

#### Tool Types

\`\`\`typescript
type ToolType = 'mindmap' | 'quiz' | 'flashcard' | 'demo' | 'search' | 'webcam' | 'pdf';
\`\`\`

#### Tool Flow

\`\`\`
User clicks tool button OR Maestro decides
        ↓
Chat API with OpenAI function calling
        ↓
Tool executor routes to handler
        ↓
Handler generates content
        ↓
Tool panel renders result
        ↓
Saved to Archive (IndexedDB + Prisma)
\`\`\`

#### Adding a New Tool

1. Add type to `ToolType` in `src/types/tools.ts`
2. Add function definition to `CHAT_TOOL_DEFINITIONS`
3. Create handler in `src/lib/tools/handlers/[tool]-handler.ts`
4. Register handler in `src/lib/tools/handlers/index.ts`
5. Add rendering case to `ToolPanel` component
6. Write tests in `__tests__/[tool]-handler.test.ts`
```

---

## CLAUDE 2: PHASE 1 (Foundation)

### T-01: Unified Tool Types (#23)

Create `src/types/tools.ts`:

```typescript
// Tool types - unified across voice and chat
export type ToolType =
  | 'mindmap'
  | 'quiz'
  | 'flashcard'
  | 'demo'
  | 'search'
  | 'diagram'
  | 'timeline'
  | 'summary'
  | 'formula'
  | 'chart'
  | 'webcam'
  | 'pdf';

// OpenAI function definitions for chat API
export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_mindmap',
      description: 'Crea mappa mentale interattiva su un argomento',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Argomento principale' },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                parentId: { type: 'string' },
              },
            },
          },
        },
        required: ['topic', 'nodes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_quiz',
      description: 'Crea quiz interattivo con domande a risposta multipla',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correctIndex: { type: 'number' },
                explanation: { type: 'string' },
              },
            },
          },
        },
        required: ['topic', 'questions'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_demo',
      description: 'Crea simulazione interattiva HTML/JS (es. sistema solare, fisica)',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          html: { type: 'string' },
          css: { type: 'string' },
          js: { type: 'string' },
        },
        required: ['title', 'html'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Cerca contenuti educativi su web o YouTube',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          type: { type: 'string', enum: ['web', 'youtube', 'all'] },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_flashcards',
      description: 'Crea set di flashcard per ripasso',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          cards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string' },
                back: { type: 'string' },
              },
            },
          },
        },
        required: ['topic', 'cards'],
      },
    },
  },
];

// Tool state for real-time updates
export interface ToolState {
  id: string;
  type: ToolType;
  status: 'initializing' | 'building' | 'completed' | 'error';
  progress: number;
  content: unknown;
  createdAt: Date;
}

// Execution result
export interface ToolExecutionResult {
  success: boolean;
  toolId: string;
  toolType: ToolType;
  data?: unknown;
  error?: string;
}
```

---

### T-02: Chat API Function Calling (#39) - **CRITICAL**

Modify `src/app/api/chat/route.ts`:

1. Import tool definitions:
```typescript
import { CHAT_TOOL_DEFINITIONS } from '@/types/tools';
import { executeToolCall } from '@/lib/tools/tool-executor';
```

2. Add `tools` to OpenAI request:
```typescript
const response = await openai.chat.completions.create({
  model: deploymentName,
  messages: formattedMessages,
  tools: CHAT_TOOL_DEFINITIONS,  // ADD THIS
  tool_choice: toolRequest ? { type: 'function', function: { name: `create_${toolRequest}` } } : 'auto',
  // ... rest
});
```

3. Handle tool_calls in response:
```typescript
const message = response.choices[0].message;

if (message.tool_calls && message.tool_calls.length > 0) {
  const toolResults = [];

  for (const toolCall of message.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await executeToolCall(
      toolCall.function.name,
      args,
      { sessionId, userId, maestroId }
    );
    toolResults.push(result);
  }

  return NextResponse.json({
    content: message.content,
    toolCalls: toolResults,
  });
}
```

---

### T-03: Tool Executor Framework (#23)

Create `src/lib/tools/tool-executor.ts`:

```typescript
import { ToolType, ToolExecutionResult } from '@/types/tools';
import { nanoid } from 'nanoid';
import { broadcastToolEvent } from '@/lib/realtime/tool-events';

type ToolHandler = (
  args: Record<string, unknown>,
  context: { sessionId?: string; userId?: string; maestroId?: string }
) => Promise<ToolExecutionResult>;

const handlers = new Map<string, ToolHandler>();

export function registerToolHandler(functionName: string, handler: ToolHandler) {
  handlers.set(functionName, handler);
}

export async function executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  context: { sessionId?: string; userId?: string; maestroId?: string }
): Promise<ToolExecutionResult> {
  const handler = handlers.get(functionName);

  if (!handler) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'mindmap',
      error: `Unknown tool: ${functionName}`,
    };
  }

  const toolId = nanoid();

  // Broadcast start event
  broadcastToolEvent({
    type: 'tool_started',
    toolId,
    functionName,
    timestamp: new Date(),
  });

  try {
    const result = await handler(args, context);

    // Broadcast complete event
    broadcastToolEvent({
      type: 'tool_completed',
      toolId,
      data: result.data,
      timestamp: new Date(),
    });

    return result;
  } catch (error) {
    broadcastToolEvent({
      type: 'tool_error',
      toolId,
      error: String(error),
      timestamp: new Date(),
    });

    return {
      success: false,
      toolId,
      toolType: 'mindmap',
      error: String(error),
    };
  }
}
```

---

### T-04: Tool Handlers (#23)

Create `src/lib/tools/handlers/`:

**mindmap-handler.ts**:
```typescript
import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';

registerToolHandler('create_mindmap', async (args) => {
  const { topic, nodes } = args as { topic: string; nodes: Array<{id: string; label: string; parentId?: string}> };

  // Convert to MarkMap format
  const markdownContent = generateMarkdownFromNodes(topic, nodes);

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'mindmap',
    data: {
      topic,
      nodes,
      markdown: markdownContent,
    },
  };
});

function generateMarkdownFromNodes(topic: string, nodes: Array<{id: string; label: string; parentId?: string}>): string {
  // Build tree structure and convert to markdown
  let md = `# ${topic}\n\n`;
  // ... tree building logic
  return md;
}
```

**quiz-handler.ts**, **demo-handler.ts**, **search-handler.ts**, **flashcard-handler.ts** - similar pattern.

Create `src/lib/tools/handlers/index.ts` to import all handlers.

---

### T-05: CreatedTool Prisma Model (#37)

Add to `prisma/schema.prisma`:

```prisma
model CreatedTool {
  id             String   @id @default(cuid())
  userId         String

  type           String   // mindmap, quiz, demo, flashcard, search
  title          String
  topic          String?
  content        String   @default("{}")  // JSON data

  maestroId      String?
  conversationId String?
  sessionId      String?

  userRating     Int?     // 1-5 stars
  isBookmarked   Boolean  @default(false)
  viewCount      Int      @default(0)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@index([type])
  @@index([createdAt])
  @@index([isBookmarked])
}
```

Run: `npx prisma generate && npx prisma db push`

---

### T-06: IndexedDB Storage for Materials (#22)

Create `src/lib/storage/materials-db.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MaterialsDB extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      thumbnail?: Blob;
      createdAt: number;
    };
  };
  metadata: {
    key: string;
    value: {
      id: string;
      filename: string;
      format: 'image' | 'pdf';
      mimeType: string;
      subject?: string;
      maestroId?: string;
      size: number;
      pageCount?: number;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: {
      'by-date': Date;
      'by-subject': string;
      'by-format': string;
    };
  };
}

let dbInstance: IDBPDatabase<MaterialsDB> | null = null;

export async function getMaterialsDB(): Promise<IDBPDatabase<MaterialsDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MaterialsDB>('convergio-materials', 1, {
    upgrade(db) {
      // Files store (blobs)
      db.createObjectStore('files', { keyPath: 'id' });

      // Metadata store
      const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
      metaStore.createIndex('by-date', 'createdAt');
      metaStore.createIndex('by-subject', 'subject');
      metaStore.createIndex('by-format', 'format');
    },
  });

  return dbInstance;
}

export async function saveMaterial(
  file: Blob,
  metadata: Omit<MaterialsDB['metadata']['value'], 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = await getMaterialsDB();
  const id = crypto.randomUUID();
  const now = new Date();

  // Generate thumbnail for images
  let thumbnail: Blob | undefined;
  if (metadata.format === 'image') {
    thumbnail = await generateThumbnail(file);
  }

  await db.put('files', {
    id,
    blob: file,
    thumbnail,
    createdAt: now.getTime(),
  });

  await db.put('metadata', {
    ...metadata,
    id,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getMaterials(filter?: {
  subject?: string;
  format?: 'image' | 'pdf';
  limit?: number;
}): Promise<Array<MaterialsDB['metadata']['value']>> {
  const db = await getMaterialsDB();
  let results = await db.getAll('metadata');

  if (filter?.subject) {
    results = results.filter(m => m.subject === filter.subject);
  }
  if (filter?.format) {
    results = results.filter(m => m.format === filter.format);
  }

  // Sort by date descending
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (filter?.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

export async function getMaterialFile(id: string): Promise<Blob | undefined> {
  const db = await getMaterialsDB();
  const file = await db.get('files', id);
  return file?.blob;
}

export async function deleteMaterial(id: string): Promise<void> {
  const db = await getMaterialsDB();
  await db.delete('files', id);
  await db.delete('metadata', id);
}

async function generateThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((thumbBlob) => {
        resolve(thumbBlob || blob);
      }, 'image/jpeg', 0.7);
    };
    img.src = URL.createObjectURL(blob);
  });
}
```

Add dependency: `npm install idb`

---

## CLAUDE 3: FRONTEND

### T-07: Tool Panel Component (#36)

Create `src/components/tools/tool-panel.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkmapRenderer } from './markmap-renderer';
import { QuizTool } from './quiz-tool';
import { DemoSandbox } from './demo-sandbox';
import { SearchResults } from './search-results';
import { FlashcardTool } from './flashcard-tool';
import type { ToolState } from '@/types/tools';

interface ToolPanelProps {
  tool: ToolState | null;
  maestro: { name: string; avatar: string; color: string } | null;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ToolPanel({
  tool,
  maestro,
  onClose,
  isMinimized = false,
  onToggleMinimize,
}: ToolPanelProps) {
  if (!tool) return null;

  const renderToolContent = () => {
    switch (tool.type) {
      case 'mindmap':
        return <MarkmapRenderer data={tool.content as { markdown: string }} />;
      case 'quiz':
        return <QuizTool data={tool.content} />;
      case 'demo':
        return <DemoSandbox data={tool.content as { html: string; css?: string; js?: string }} />;
      case 'search':
        return <SearchResults data={tool.content} />;
      case 'flashcard':
        return <FlashcardTool data={tool.content} />;
      default:
        return <div>Tool type not supported: {tool.type}</div>;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          'bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700',
          'flex flex-col overflow-hidden',
          isMinimized ? 'h-16' : 'h-[70vh]'
        )}
      >
        {/* Header - 10% */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700"
          style={{ backgroundColor: maestro?.color ? `${maestro.color}10` : undefined }}
        >
          <div className="flex items-center gap-3">
            {maestro && (
              <img
                src={maestro.avatar}
                alt={maestro.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="font-medium">{maestro?.name || 'Tool'}</span>
            <span className="text-sm text-slate-500">
              {tool.status === 'building' ? 'Creazione in corso...' : tool.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleMinimize && (
              <Button variant="ghost" size="icon" onClick={onToggleMinimize}>
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - 70% */}
        {!isMinimized && (
          <div className="flex-1 overflow-auto p-4">
            {tool.status === 'building' ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                <p className="mt-4 text-slate-500">
                  {Math.round(tool.progress * 100)}% completato...
                </p>
              </div>
            ) : tool.status === 'error' ? (
              <div className="text-red-500 text-center">
                Errore nella creazione del tool
              </div>
            ) : (
              renderToolContent()
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

### T-08: Tool Buttons Bar (#38)

Create `src/components/conversation/tool-buttons.tsx`:

```typescript
'use client';

import { Brain, HelpCircle, Play, Layers, Search, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ToolType } from '@/types/tools';

interface ToolButtonsProps {
  onToolRequest: (type: ToolType) => void;
  disabled?: boolean;
  activeToolId?: string | null;
}

const TOOL_BUTTONS = [
  { type: 'mindmap' as ToolType, icon: Brain, label: 'Mappa', tooltip: 'Crea mappa mentale' },
  { type: 'quiz' as ToolType, icon: HelpCircle, label: 'Quiz', tooltip: 'Crea quiz' },
  { type: 'demo' as ToolType, icon: Play, label: 'Demo', tooltip: 'Crea simulazione interattiva' },
  { type: 'flashcard' as ToolType, icon: Layers, label: 'Flashcard', tooltip: 'Crea flashcard' },
  { type: 'search' as ToolType, icon: Search, label: 'Cerca', tooltip: 'Cerca su web/YouTube' },
  { type: 'webcam' as ToolType, icon: Camera, label: 'Foto', tooltip: 'Scatta foto' },
];

export function ToolButtons({ onToolRequest, disabled, activeToolId }: ToolButtonsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {TOOL_BUTTONS.map(({ type, icon: Icon, label, tooltip }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToolRequest(type)}
              disabled={disabled || !!activeToolId}
              className="h-8 px-2 gap-1"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
```

---

### T-09: Demo Sandbox (#23)

Create `src/components/tools/demo-sandbox.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoSandboxProps {
  data: {
    title?: string;
    html: string;
    css?: string;
    js?: string;
  };
}

// Dangerous patterns to block
const DANGEROUS_PATTERNS = [
  /document\.cookie/i,
  /localStorage/i,
  /sessionStorage/i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /window\.open/i,
  /window\.location/i,
  /eval\s*\(/i,
  /Function\s*\(/i,
];

function validateCode(code: string): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      warnings.push(`Blocked: ${pattern.source}`);
    }
  }

  return { safe: warnings.length === 0, warnings };
}

export function DemoSandbox({ data }: DemoSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const { html, css = '', js = '' } = data;

  // Validate JS code
  const validation = validateCode(js);

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; script-src 'unsafe-inline';">
      <style>
        body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
        ${css}
      </style>
    </head>
    <body>
      ${html}
      ${validation.safe ? `<script>${js}</script>` : '<!-- JS blocked for safety -->'}
    </body>
    </html>
  `;

  const handleRefresh = () => {
    setKey(prev => prev + 1);
    setError(null);
  };

  if (!validation.safe) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Demo bloccata per sicurezza</span>
        </div>
        <ul className="text-sm text-yellow-600 dark:text-yellow-500 list-disc list-inside">
          {validation.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">{data.title || 'Simulazione Interattiva'}</h3>
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Ricarica
        </Button>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden bg-white">
        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={fullHtml}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title="Demo interattiva"
        />
      </div>
    </div>
  );
}
```

---

### T-10: Search Results (#23)

Create `src/components/tools/search-results.tsx`:

```typescript
'use client';

import { ExternalLink, Youtube, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SearchResult {
  type: 'web' | 'youtube';
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  duration?: string; // YouTube only
}

interface SearchResultsProps {
  data: {
    query: string;
    results: SearchResult[];
  };
}

export function SearchResults({ data }: SearchResultsProps) {
  const { query, results } = data;

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Nessun risultato trovato per "{query}"
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {results.length} risultati per "{query}"
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((result, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {result.thumbnail && (
                  <div className="relative mb-2 rounded-lg overflow-hidden aspect-video bg-slate-100">
                    <img
                      src={result.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {result.type === 'youtube' && result.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {result.duration}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  {result.type === 'youtube' ? (
                    <Youtube className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Globe className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 hover:text-primary">
                      {result.title}
                    </h4>
                    {result.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>

                  <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </div>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

### T-11: Notification Triggers Wiring (#14)

Create `src/lib/notifications/triggers.ts`:

```typescript
import { notificationService } from './notification-service';

/**
 * Call these functions at appropriate points in the app to trigger notifications.
 * Currently the service exists but is NEVER CALLED.
 */

// Call after session ends in conversation-flow.tsx
export function onSessionComplete(params: {
  duration: number;
  xpEarned: number;
  subject: string;
  maestroName: string;
}) {
  notificationService.sessionComplete(
    params.duration,
    params.xpEarned,
    params.subject,
    params.maestroName
  );
}

// Call in progress-store.ts when level increases
export function onLevelUp(newLevel: number) {
  notificationService.levelUp(newLevel);
}

// Call when achievement unlocked
export function onAchievement(name: string, description: string) {
  notificationService.achievement(name, description);
}

// Call when streak reaches milestones
export function onStreakMilestone(days: number) {
  if ([3, 7, 14, 30, 60, 100].includes(days)) {
    notificationService.streakMilestone(days);
  }
}

// Call when streak is at risk (no activity today, near end of day)
export function onStreakAtRisk(currentStreak: number) {
  notificationService.streakAtRisk(currentStreak);
}

// Call when flashcards are due for review
export function onFlashcardsDue(count: number) {
  notificationService.flashcardReview(count);
}
```

Wire into `src/lib/stores/app-store.ts`:
```typescript
import { onLevelUp, onStreakMilestone, onAchievement } from '@/lib/notifications/triggers';

// In addXp action:
if (newLevel > state.level) {
  onLevelUp(newLevel);
}

// In updateStreak action:
onStreakMilestone(newStreak);

// In unlockAchievement action:
onAchievement(achievement.name, achievement.description);
```

---

### T-12: Conversazioni Page Redesign (#33)

Modify `src/app/conversazioni/page.tsx` - see issue #33 for full spec.

---

## CLAUDE 4: INTEGRATION

### T-13: Wire Tools to Conversation (#23, #26)

Modify `src/components/conversation/conversation-flow.tsx`:

1. Import new components:
```typescript
import { ToolPanel } from '@/components/tools/tool-panel';
import { ToolButtons } from '@/components/conversation/tool-buttons';
import { useToolStream } from '@/lib/hooks/use-tool-stream';
```

2. Add state:
```typescript
const [activeTool, setActiveTool] = useState<ToolState | null>(null);
const { toolState, error: toolError } = useToolStream(activeTool?.id);
```

3. Handle tool requests:
```typescript
const handleToolRequest = async (type: ToolType) => {
  // Send to chat API with toolRequest parameter
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      systemPrompt,
      maestroId,
      toolRequest: type,
    }),
  });

  const data = await response.json();

  if (data.toolCalls?.[0]) {
    setActiveTool({
      id: data.toolCalls[0].toolId,
      type: data.toolCalls[0].toolType,
      status: 'completed',
      progress: 1,
      content: data.toolCalls[0].data,
      createdAt: new Date(),
    });
  }
};
```

4. Add to JSX:
```typescript
{/* Tool Panel when active */}
{activeTool && (
  <ToolPanel
    tool={activeTool}
    maestro={currentMaestro}
    onClose={() => setActiveTool(null)}
  />
)}

{/* Tool buttons in input area */}
<ToolButtons
  onToolRequest={handleToolRequest}
  disabled={isLoading}
  activeToolId={activeTool?.id}
/>
```

---

### T-14: Materials Page Redesign (#19)

Create `src/components/education/materials-view.tsx`:

- New upload experience (webcam + file + PDF)
- Subject detection after upload
- User confirms/changes subject
- Route to appropriate Maestro
- Materials gallery with thumbnails
- Search/filter by subject/date

---

### T-15: Subject→Maestro Routing (#19)

Create `src/lib/materials/subject-router.ts`:

```typescript
const SUBJECT_MAESTRO_MAP: Record<string, string> = {
  // Italian
  matematica: 'pitagora',
  math: 'pitagora',
  mathematics: 'pitagora',
  algebra: 'pitagora',
  geometria: 'archimede',
  geometry: 'archimede',

  scienze: 'da-vinci',
  science: 'da-vinci',
  biologia: 'da-vinci',
  biology: 'da-vinci',

  fisica: 'galileo',
  physics: 'galileo',

  italiano: 'dante',
  italian: 'dante',
  letteratura: 'dante',
  literature: 'dante',

  storia: 'cesare',
  history: 'cesare',

  geografia: 'marco-polo',
  geography: 'marco-polo',

  arte: 'michelangelo',
  art: 'michelangelo',

  musica: 'mozart',
  music: 'mozart',

  filosofia: 'socrate',
  philosophy: 'socrate',

  inglese: 'shakespeare',
  english: 'shakespeare',
};

export function getMaestroForSubject(subject: string): string | null {
  const normalized = subject.toLowerCase().trim();
  return SUBJECT_MAESTRO_MAP[normalized] || null;
}

export function getAllSubjects(): string[] {
  return [...new Set(Object.keys(SUBJECT_MAESTRO_MAP))];
}
```

---

### T-16: Unified Archive Page (#37)

Create `src/components/education/archive-view.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid, List, Search, Star, Calendar, Eye } from 'lucide-react';
import { getMaterials } from '@/lib/storage/materials-db';
import type { ToolType } from '@/types/tools';

type FilterType = 'all' | ToolType;
type SortBy = 'date' | 'rating' | 'views';

export function ArchiveView() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [tools, setTools] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    // Fetch tools from API
    fetch('/api/tools/saved')
      .then(r => r.json())
      .then(data => setTools(data.tools || []));

    // Fetch materials from IndexedDB
    getMaterials().then(setMaterials);
  }, []);

  // Combine and filter results
  const allItems = [
    ...tools.map(t => ({ ...t, source: 'tool' })),
    ...materials.map(m => ({ ...m, source: 'material', type: m.format })),
  ];

  const filtered = allItems
    .filter(item => filter === 'all' || item.type === filter)
    .filter(item =>
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'rating') return (b.userRating || 0) - (a.userRating || 0);
      if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0);
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Archivio</h1>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 w-48"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date"><Calendar className="w-4 h-4 inline mr-1" />Data</SelectItem>
              <SelectItem value="rating"><Star className="w-4 h-4 inline mr-1" />Voto</SelectItem>
              <SelectItem value="views"><Eye className="w-4 h-4 inline mr-1" />Visite</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex border rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2', viewMode === 'grid' && 'bg-slate-100 dark:bg-slate-800')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2', viewMode === 'list' && 'bg-slate-100 dark:bg-slate-800')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList>
          <TabsTrigger value="all">Tutti ({allItems.length})</TabsTrigger>
          <TabsTrigger value="mindmap">Mappe</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="flashcard">Flashcard</TabsTrigger>
          <TabsTrigger value="demo">Demo</TabsTrigger>
          <TabsTrigger value="image">Foto</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : viewMode === 'grid' ? (
            <GridView items={filtered} />
          ) : (
            <ListView items={filtered} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### T-17: Add Demo + Webcam to Maestro Cards (#35)

Modify `src/components/maestros/maestro-card.tsx`:

Add tool buttons below specialty text:

```typescript
import { Brain, HelpCircle, Play, Camera, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

// In component props:
interface MaestroCardProps {
  maestro: Maestro;
  onSelect: (maestro: Maestro) => void;
  onToolRequest?: (maestro: Maestro, tool: ToolType) => void;
  isSelected?: boolean;
}

// After specialty <p>:
{onToolRequest && (
  <div className="flex flex-wrap justify-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={(e) => { e.stopPropagation(); onToolRequest(maestro, 'mindmap'); }}
    >
      <Brain className="w-3 h-3 mr-1" />Mappa
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={(e) => { e.stopPropagation(); onToolRequest(maestro, 'quiz'); }}
    >
      <HelpCircle className="w-3 h-3 mr-1" />Quiz
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={(e) => { e.stopPropagation(); onToolRequest(maestro, 'demo'); }}
    >
      <Play className="w-3 h-3 mr-1" />Demo
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={(e) => { e.stopPropagation(); onToolRequest(maestro, 'webcam'); }}
    >
      <Camera className="w-3 h-3 mr-1" />Foto
    </Button>
  </div>
)}
```

---

### T-18: Persist Tools to Database (#37)

Create `src/lib/tools/tool-persistence.ts`:

```typescript
import { prisma } from '@/lib/db';
import type { ToolType } from '@/types/tools';

export async function saveTool(params: {
  userId: string;
  type: ToolType;
  title: string;
  topic?: string;
  content: unknown;
  maestroId?: string;
  conversationId?: string;
  sessionId?: string;
}) {
  return prisma.createdTool.create({
    data: {
      ...params,
      content: JSON.stringify(params.content),
    },
  });
}

export async function getUserTools(
  userId: string,
  filter?: {
    type?: ToolType;
    isBookmarked?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.createdTool.findMany({
    where: {
      userId,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.isBookmarked && { isBookmarked: true }),
    },
    orderBy: { createdAt: 'desc' },
    take: filter?.limit || 50,
    skip: filter?.offset || 0,
  });
}

export async function deleteTool(id: string, userId: string) {
  return prisma.createdTool.deleteMany({
    where: { id, userId },
  });
}

export async function updateToolRating(id: string, userId: string, rating: number) {
  return prisma.createdTool.updateMany({
    where: { id, userId },
    data: { userRating: rating },
  });
}

export async function toggleBookmark(id: string, userId: string) {
  const tool = await prisma.createdTool.findFirst({ where: { id, userId } });
  if (!tool) return null;

  return prisma.createdTool.update({
    where: { id },
    data: { isBookmarked: !tool.isBookmarked },
  });
}

export async function incrementViewCount(id: string) {
  return prisma.createdTool.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}
```

Create API route `src/app/api/tools/saved/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserTools, saveTool, deleteTool, updateToolRating, toggleBookmark } from '@/lib/tools/tool-persistence';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type');
  const bookmarked = searchParams.get('bookmarked') === 'true';

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const tools = await getUserTools(userId, {
    type: type as ToolType | undefined,
    isBookmarked: bookmarked || undefined,
  });

  return NextResponse.json({ tools });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tool = await saveTool(body);
  return NextResponse.json({ tool });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (!id || !userId) {
    return NextResponse.json({ error: 'id and userId required' }, { status: 400 });
  }

  await deleteTool(id, userId);
  return NextResponse.json({ success: true });
}
```

---

## 📊 PROGRESS SUMMARY

| Phase | Done | Total | Status | Assignee |
|-------|:----:|:-----:|--------|----------|
| Phase 0: Preparation | 0 | 4 | 🟢 READY | CLAUDE 2 |
| Phase 1: Foundation | 0 | 8 | ⏳ NEXT | CLAUDE 2 |
| Phase 2: UI | 0 | 6 | ⏸️ WAITING GATE-1 | CLAUDE 3 |
| Phase 3: Integration & Tests | 0 | 8 | ⏸️ WAITING GATE-2 | CLAUDE 4 |
| **TOTAL** | **0** | **26** | **0%** | |

### Time Tracking

| Phase | Started At | Completed At | Duration |
|-------|------------|--------------|----------|
| Phase 0 | - | - | - |
| Phase 1 | - | - | - |
| Phase 2 | - | - | - |
| Phase 3 | - | - | - |

---

## VERIFICATION CHECKLIST

### Build Verification (OBBLIGATORIO)
```bash
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # 0 errors
npm run build       # success
npm run test:unit   # all pass (dopo T-00b)
```

### Manual Tests (OBBLIGATORIO - con screenshot/video)

| Test | Issue | Expected Result | Proof |
|------|-------|-----------------|-------|
| Click Mappa in conversation | #39, #36 | Tool panel opens, mind map visible | Screenshot |
| Click Quiz in conversation | #39, #36 | Quiz created, can answer questions | Screenshot |
| Click Demo in conversation | #39, #36 | HTML/JS simulation runs in sandbox | Video/GIF |
| Click Cerca in conversation | #39, #36 | Search results appear | Screenshot |
| Click Webcam on maestro card | #35 | Camera opens, photo taken | Screenshot |
| Upload PDF in Materials | #19, #22 | Pages extracted, subject detected | Screenshot |
| Archive page filters | #37 | All tools visible, filters work | Screenshot |
| Subject → Maestro routing | #19 | Correct maestro selected | Screenshot |
| Notification on level up | #14 | Toast appears | Screenshot |
| Tool buttons in conversation | #38 | All buttons visible and clickable | Screenshot |

### Issue Closure (SOLO dopo tutte le prove)

```bash
# PER OGNI ISSUE:
# 1. Verifica funzionalità nell'app
# 2. Cattura screenshot/video
# 3. Solo dopo:
gh issue close 39 --reason completed --comment "✅ Implemented function calling in chat API. Proof: [link to screenshot]"
gh issue close 36 --reason completed --comment "✅ Tool panel with video conference layout. Proof: [link to screenshot]"
# ... etc per ogni issue
```

### Issues da Chiudere (26 task = queste issues)

| Issue | Task | Proof Required |
|-------|------|----------------|
| #39 | T-02 | curl /api/chat with tool response |
| #23 | T-01, T-03, T-04 | Unit test output |
| #36 | T-07 | Screenshot tool panel |
| #38 | T-08 | Screenshot button bar |
| #35 | T-19 | Screenshot maestro card with buttons |
| #37 | T-18, T-20 | Screenshot archive page |
| #22 | T-06 | Console log IndexedDB save |
| #19 | T-16, T-17 | Screenshot materials page |
| #26 | T-15 | SSE event in network tab |
| #14 | T-11 | Screenshot toast notification |
| #33 | T-12 | Screenshot conversazioni page |

---

## DEPENDENCIES

**Already installed:**
- nanoid, framer-motion, lucide-react
- MarkMap, Mermaid, Chart.js

**Need to install:**
```bash
npm install idb
```

---

**Version**: 2.0
**Updated**: 2025-12-30
**GitHub Issues**: #14, #16, #18, #19, #22, #23, #25, #26, #27, #33, #34, #35, #36, #37, #38, #39
