# Piano di Esecuzione Sequenziale - 3 Gennaio 2026

**Branch**: `development` (NON cambiare)
**Strategia**: Sequenziale, un task alla volta, verifica dopo ogni fix
**Regola**: Ogni fix deve essere verificato con `npm run typecheck && npm run lint` prima di passare al successivo

---

## FASE 1: ROOT CAUSE FIXES (Sbloccano altri bug)

Questi fix risolvono la causa radice di più bug.

### 1.1 SVGLength Error Fix (BUG 16 → sblocca BUG 5,7,8)
- [ ] Trovare dove SVG markmap viene renderizzato senza dimensioni
- [ ] Aggiungere width/height esplicite al container PRIMA del render
- [ ] Testare che mindmap si carichi senza errore
- [ ] Verificare: `npm run typecheck && npm run lint`

### 1.2 MOCK DATA Removal (BUG 22,23,28 → sblocca dashboard)
- [ ] `src/components/education/parent-dashboard.tsx:40` - rimuovere mock
- [ ] `src/components/education/success-metrics-dashboard.tsx:78` - collegare a API reali
- [ ] Verificare API esistenti o creare
- [ ] Verificare: `npm run typecheck && npm run lint`

### 1.3 PLACEHOLDER Alert Removal (BUG 29 → sblocca riassunti)
- [ ] `src/components/education/summaries-view.tsx:74` - implementare mappa da riassunto
- [ ] `src/components/education/summaries-view.tsx:81` - implementare flashcard da riassunto
- [ ] Rimuovere tutti gli `alert()` placeholder
- [ ] Verificare: `npm run typecheck && npm run lint`

---

## FASE 2: CRITICAL BUGS (P0)

### 2.1 Voice Switching (BUG 1)
- [ ] Analizzare welcome flow in `src/components/onboarding/`
- [ ] Assicurarsi che Melissa (Azure) sia usata per TUTTO il flow
- [ ] Rimuovere fallback a Web Speech durante onboarding
- [ ] Test manuale: welcome in incognito
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.2 Tool Creation Non Visibile (BUG 5)
- [ ] Dopo fix 1.1, verificare se tools appaiono
- [ ] Se no, investigare connessione realtime → UI
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.3 Mindmap Hierarchy (BUG 7)
- [ ] Trovare prompt che genera mindmap
- [ ] Aggiungere istruzioni chiare su parentId
- [ ] Testare: "Crea mappa sulla fotosintesi"
- [ ] Verificare visivamente rami/sottorami
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.4 Layout Switch Fullscreen (BUG 8)
- [ ] `src/components/conversation/conversation-flow.tsx`
- [ ] Quando tool creato → switch a focus layout
- [ ] Sidebar minimizzata, tool 70%, panel 30%
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.5 Conversazione Reset (BUG 11)
- [ ] Investigare state corruption durante tool use
- [ ] Controllare re-render che resettano
- [ ] Controllare WebSocket connection
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.6 Material Save (BUG 13)
- [ ] `src/lib/hooks/use-saved-materials.ts:171`
- [ ] Investigare perché payload è vuoto `{}`
- [ ] Fix API o hook
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.7 Materiali Page (BUG 17,18)
- [ ] Unificare Materiali + Study Kit
- [ ] Creare archivio materiali
- [ ] Integrare upload PDF
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.8 PDF Parsing (BUG 19)
- [ ] Investigare quale API fa parsing
- [ ] Testare con PDF semplice
- [ ] Fix errori
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.9 Riassunti Tool (BUG 26)
- [ ] Dopo fix 1.3, verificare se funziona
- [ ] Se no, investigare rendering
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.10 Navigazione (BUG 27)
- [ ] Aggiungere bottone "indietro" ovunque
- [ ] X per chiudere modal/fullscreen
- [ ] ESC handler per uscire
- [ ] Pattern consistente
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.11 Header Counters (BUG 28)
- [ ] Dopo fix 1.2, controllare se header si aggiorna
- [ ] Se no, collegare store → header component
- [ ] Real-time updates
- [ ] Verificare: `npm run typecheck && npm run lint`

### 2.12 Per-Character History (BUG 32)
- [ ] Separare conversation storage per character ID
- [ ] Melissa = sue conversazioni
- [ ] Andrea = sue conversazioni
- [ ] Zero leak tra personaggi
- [ ] Verificare: `npm run typecheck && npm run lint`

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

### 3.3 Input Bar Fisso (BUG 9)
- [ ] CSS: sticky/fixed per input bar
- [ ] Solo area centrale scrolla
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.4 Demo Accessibility (BUG 10)
- [ ] Applicare settings accessibilità a contenuto generato
- [ ] Font, colori, spacing
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.5 Toast Position (BUG 12)
- [ ] Configurare sonner: position top-right
- [ ] Aggiungere storico notifiche
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.6 Menu Export (BUG 14)
- [ ] Aggiungere `bg-white` al dropdown
- [ ] z-index corretto
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.7 Fullscreen Exit (BUG 15)
- [ ] Fix toggle fullscreen ↔ normale
- [ ] Testare tutti i tools
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.8 Demo Nuova Pagina (BUG 20)
- [ ] `demo-renderer.tsx:89` - implementare iframe/modal
- [ ] NO nuove tab
- [ ] Verificare: `npm run typecheck && npm run lint`

### 3.9 Parent Dashboard Empty State (BUG 21)
- [ ] Dopo fix 1.2, integrare in app
- [ ] Aggiungere empty state informativo
- [ ] Verificare: `npm run typecheck && npm run lint`

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

**Ora sto facendo**: FASE 1.1 - SVGLength Error Fix

**Completati oggi**:
- [x] Browser error logging system (già esisteva)
- [x] Learnings aggiunti a thor e app-release-manager
- [x] Verification process documentato
- [x] Functional E2E tests creati (file esiste, selettori da raffinare)

---

*Creato: 3 Gennaio 2026*
*Branch: development*
