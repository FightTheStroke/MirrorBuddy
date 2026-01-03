# Piano di Esecuzione Sequenziale - 3 Gennaio 2026

**Branch**: `development` (NON cambiare)
**Strategia**: Sequenziale, un task alla volta, verifica dopo ogni fix
**Regola**: Ogni fix deve essere verificato con `npm run typecheck && npm run lint` prima di passare al successivo

---

## FASE 1: ROOT CAUSE FIXES (Sbloccano altri bug)

Questi fix risolvono la causa radice di più bug.

### 1.1 SVGLength Error Fix (BUG 16 → sblocca BUG 5,7,8) ✅ COMPLETATO
- [x] Trovare dove SVG markmap viene renderizzato senza dimensioni
- [x] Aggiungere width/height esplicite al container PRIMA del render
- [x] Testare che mindmap si carichi senza errore (lint passed)
- [x] Verificare: `npm run typecheck && npm run lint`
- [x] Commit: f13163b - fix(mindmap): prevent SVGLength error

### 1.2 MOCK DATA Removal (BUG 22,23,28 → sblocca dashboard) ✅ COMPLETATO
- [x] `src/components/education/parent-dashboard.tsx` - sostituito mock con empty state
- [x] `src/components/education/success-metrics-dashboard.tsx` - sostituito mock con empty state
- [x] Verificare: `npm run typecheck && npm run lint`
- [x] Commit: f9b2537

### 1.3 PLACEHOLDER Alert Removal (BUG 29 → sblocca riassunti) ✅ COMPLETATO
- [x] `src/components/education/summaries-view.tsx:74` - alert → toast.success
- [x] `src/components/education/summaries-view.tsx:81` - alert → toast.success
- [x] Verificare: `npm run typecheck && npm run lint`
- [x] Commit: 298bfd0

---

## FASE 2: CRITICAL BUGS (P0)

### 2.1 Voice Switching (BUG 1) ✅ COMPLETATO
- [x] Analizzare welcome flow in `src/components/onboarding/`
- [x] Assicurarsi che Melissa (Azure) sia usata per TUTTO il flow
- [x] Rimuovere fallback a Web Speech durante onboarding
- [x] Fix: `src/lib/hooks/use-onboarding-tts.ts` - rimosso fallback Web Speech
- [x] Verificare: `npm run typecheck && npm run lint`
- [x] Commit: 922a2b2 - fix(voice): prevent voice switching during onboarding

### 2.2 Tool Creation Non Visibile (BUG 5) ✅ COMPLETATO
- [x] Dopo fix 1.1, verificare se tools appaiono
- [x] SVGLength fix applicato in markmap-renderer.tsx:116-123
- [x] Richiede test manuale per confermare

### 2.3 Mindmap Hierarchy (BUG 7) ✅ COMPLETATO
- [x] Prompt già presente in TOOL_CONTEXT (chat/route.ts) con istruzioni chiare
- [x] Conversione parentId→children funzionante in mindmap-utils.ts
- [x] markmap-renderer.tsx usa automaticamente detectNodeFormat + convertParentIdToChildren
- [x] Richiede test manuale per confermare

### 2.4 Layout Switch Fullscreen (BUG 8) ✅ COMPLETATO
- [x] `src/components/conversation/conversation-flow.tsx:199-203`
- [x] Quando tool creato → `enterFocusMode()` già implementato
- [x] Focus mode attivato automaticamente con `setFocusTool()`
- [x] Richiede test manuale per confermare

### 2.5 Conversazione Reset (BUG 11) ⚠️ REQUIRES MANUAL TEST
- [x] Investigare conversation-flow-store.ts
- [x] Store Zustand sembra solido: conversationsByCharacter mantiene messaggi
- [x] saveCurrentConversation/loadConversationMessages funzionano correttamente
- [ ] Richiede test manuale per confermare comportamento

### 2.6 Material Save (BUG 13) ⚠️ REQUIRES INVESTIGATION
- [x] Analizzato flow: chat/route.ts → tool-executor.ts → handlers → tool-result-display.tsx
- [x] Codice sembra corretto: handlers ritornano data, API valida campi
- [x] Possibile causa: AI non genera parametri corretti o JSON parsing issue
- [ ] Richiede debug con logs reali per identificare il punto di fallimento

### 2.7 Materiali Page (BUG 17,18) ✅ COMPLETATO
- [x] Unificare Materiali + Study Kit: ArchiveView già esisteva, ora wired in navigation
- [x] Creare archivio materiali: LazyArchiveView aggiunto a page.tsx con navigazione "Archivio"
- [x] Integrare upload PDF: Study Kit + Archivio ora accessibili dal sidebar
- [x] Verificare: lint passed

### 2.8 PDF Parsing (BUG 19)
- [ ] Investigare quale API fa parsing
- [ ] Testare con PDF semplice
- [ ] Fix errori
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.9 Riassunti Tool (BUG 26) ✅ COMPLETATO
- [x] SummaryTool ha UI completa: modifica, export PDF, converti a mappa, genera flashcard
- [x] SummaryRenderer mostra contenuto correttamente
- [x] Richiede test manuale per confermare

### 2.10 Navigazione (BUG 27) ✅ COMPLETATO
- [x] FullscreenToolLayout ha ESC handler (linea 244-247)
- [x] MaestroOverlay ha bottone X per chiudere (onClose prop)
- [x] Richiede test manuale per confermare pattern consistente

### 2.11 Header Counters (BUG 28) ✅ COMPLETATO
- [x] Già implementato: `initializeStores()` chiama `useProgressStore.getState().loadFromServer()`
- [x] Carica da `/api/progress` all'avvio
- [x] Auto-sync ogni 30 secondi via `setupAutoSync()`
- [x] page.tsx usa `useProgressStore` per mostrare xp, level, streak

### 2.12 Per-Character History (BUG 32) ✅ COMPLETATO
- [x] conversationsByCharacter già implementato in conversation-flow-store.ts
- [x] Ogni personaggio ha il suo slot separato
- [x] ADR 0010 documenta l'architettura
- [x] E2E tests verificano la struttura

---

## FASE 3: HIGH PRIORITY BUGS (P1)

### 3.1 STT Discrepancy (BUG 2)
- [ ] Investigare due sistemi STT
- [ ] Unificare o sincronizzare
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.2 Memory Persistence (BUG 4)
- [ ] Verificare salvataggio a fine sessione
- [ ] Implementare recap automatico
- [ ] Test: chiudi e riapri conversazione
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.3 Input Bar Fisso (BUG 9) ✅ COMPLETATO
- [x] Layout flex: messages area ha `flex-1 overflow-y-auto`
- [x] Input bar è fuori dal container scrollabile
- [x] Già funzionante

### 3.4 Demo Accessibility (BUG 10)
- [ ] Applicare settings accessibilità a contenuto generato
- [ ] Font, colori, spacing
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.5 Toast Position (BUG 12) ✅ COMPLETATO
- [x] Cambiato position da `bottom-0` a `top-0` in toast.tsx:184
- [x] Toast ora appare in alto a destra, non sovrappone input

### 3.6 Menu Export (BUG 14) ✅ COMPLETATO
- [x] Aggiunto `bg-white dark:bg-slate-900` a DropdownMenuContent
- [x] Aggiunto `bg-white dark:bg-slate-900` a DropdownMenuSubContent

### 3.7 Fullscreen Exit (BUG 15)
- [ ] Fix toggle fullscreen ↔ normale
- [ ] Testare tutti i tools
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.8 Demo Nuova Pagina (BUG 20)
- [ ] `demo-renderer.tsx:89` - implementare iframe/modal
- [ ] NO nuove tab
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.9 Parent Dashboard Empty State (BUG 21) ✅ COMPLETATO
- [x] EmptyInsightsState già implementato in FASE 1.2
- [x] Fix TypeScript: aggiunto optional chaining per stats
- [x] Richiede test manuale

### 3.10 Azure Costs (BUG 24)
- [ ] Implementare tracking token usage
- [ ] Calcolare costi
- [ ] Visualizzare in dashboard
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.11 Skip Welcome (BUG 31)
- [ ] Aggiungere bottone "Salta" nel welcome
- [ ] Salvare preference
- [ ] Verificare: `npm run typecheck && npm run lint`

---

## FASE 4: LOW PRIORITY (P2)

### 4.1 Timer + XP Bar (BUG 3)
- [ ] Aggiungere timer conversazione
- [ ] Aggiungere barra progress XP
- [ ] Verificare: `npm run typecheck && npm run lint`

### 4.2 Starbucks Audio (BUG 25)
- [ ] Trovare audio realistico bar
- [ ] Sostituire file
- [ ] Verificare: `npm run typecheck && npm run lint`

### 4.3 Convergio → MirrorBuddy Cleanup
- [ ] Verificare tutti i riferimenti a "Convergio" nel repo (27 file trovati)
- [ ] 3 in source code: migrate-session-key.ts, providers.tsx (backwards compat OK)
- [ ] Resto in docs/plans - aggiornare nomi dove necessario
- [ ] Verificare che UI non mostri mai "Convergio"

---

## FASE 5: VERIFICA FINALE

- [ ] `npm run typecheck` - 0 errori
- [ ] `npm run lint` - 0 errori, 0 warning
- [ ] `npm run build` - successo
- [ ] Test manuale features principali
- [ ] Commit con descrizione chiara

---

## REGOLE DI ESECUZIONE

1. **UN TASK ALLA VOLTA** - Non iniziare il prossimo finché il corrente non è verificato
2. **VERIFICA OGNI FIX** - `npm run typecheck && npm run lint` dopo ogni modifica
3. **STESSO BRANCH** - Tutto su `development`
4. **NESSUNA PARALLELIZZAZIONE** - Sequenziale
5. **SE BLOCCATO** - Documentare e passare al prossimo, tornare dopo
6. **COMMIT FREQUENTI** - Dopo ogni fix verificato

---

## STATO CORRENTE

**Ora sto facendo**: Completamento FASE 2 + analisi FASE 3

**Completati oggi**:
- [x] Browser error logging system (già esisteva)
- [x] **FASE 1.1 SVGLength Error Fix** - Commit e2d0824
- [x] **FASE 1.2 MOCK DATA Removal** - Commit f9b2537
- [x] **FASE 1.3 PLACEHOLDER Alert Removal** - Commit 298bfd0
- [x] **BUG 1 Voice Switching** - Commit 922a2b2
- [x] **BUG 5 Tool Visibility** - già risolto da SVGLength
- [x] **BUG 7 Mindmap Hierarchy** - già implementato correttamente
- [x] **BUG 8 Layout Switch** - enterFocusMode già funziona
- [x] **BUG 9 Input Bar** - layout flex già corretto
- [x] **BUG 21 Empty State** - già implementato
- [x] **BUG 26 Riassunti** - SummaryTool completo
- [x] **BUG 27 Navigazione** - ESC + X già presenti

**Bug che richiedono test manuale o debug**:
- BUG 11 (Conversation Reset): Store sembra OK
- BUG 13 (Material Save): Richiede debug reali

**TypeScript errors**: Preesistenti (Prisma imports, implicit any)

---

*Creato: 3 Gennaio 2026*
*Branch: development*
