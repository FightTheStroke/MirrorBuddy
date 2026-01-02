# Test Refactoring Plan

**Data**: 2026-01-02
**Obiettivo**: Audit completo e refactoring dei test (unit + E2E)
**Status**: [x] COMPLETED 2026-01-02

---

## Executive Summary

| Metrica | Valore |
|---------|--------|
| File test totali | 94 |
| Unit tests | 61 |
| E2E tests | 33 |
| **Duplicati confermati** | 4 file da eliminare |
| **Overlap da consolidare** | 2 file |
| **Test validi** | 88 file |

---

## ANALISI DETTAGLIATA DEI DUPLICATI

### 1. intent-detection.test.ts (2 FILE - OVERLAP SIGNIFICATIVO)

**File A**: `src/lib/ai/__tests__/intent-detection.test.ts` (526 righe)
**File B**: `src/lib/ai/intent-detection.test.ts` (439 righe)

| Sezione | File A | File B |
|---------|--------|--------|
| Subject Detection | 5 test dettagliati | 11 test (piu' materie) |
| Emotional Indicators | 6 test | 8 test |
| Crisis Detection | 2 test | 2 test |
| Method Help | 3 test | 3 test |
| Tool Request | 2 test | 4 test + detectToolType |
| Tech Support | 7 test | - |
| Character Routing | 5 test | incluso in altri |
| Edge Cases | 5 test | 5 test |
| detectToolType | - | 6 test |
| Complex Scenarios | - | 3 test |

**DIAGNOSI**:
- File A ha test UNICI per Tech Support (7 test)
- File B ha test UNICI per detectToolType (6 test) e Complex Scenarios (3 test)
- Overlap su: Crisis, Academic, Emotional, Method, Edge Cases

**AZIONE**: CONSOLIDARE in un unico file mantenendo tutti i test unici

---

### 2. Mindmap E2E Tests (3 FILE - 1 OBSOLETO)

**File A**: `e2e/mindmaps.spec.ts` (67 righe, 5 test)
```
- mindmaps page loads correctly
- displays example mindmaps
- mindmap examples are clickable
- mindmap toolbar appears when viewing
- mindmaps have accessible labels
```

**File B**: `e2e/mindmaps-comprehensive.spec.ts` (280 righe, 18 test)
```
- Mindmap Rendering (3 test)
- Mindmap Label Sanitization (3 test)
- Mindmap Interaction (4 test)
- Mindmap Accessibility (3 test)
- Mindmap Loading States (2 test)
- Mindmap Export (1 test)
```

**File C**: `e2e/mindmap-hierarchy.spec.ts` (173 righe, 9 test)
```
- Mindmap Hierarchy (4 test) - ADR 0020 specifici
- Mindmap Data Format (1 test) - API structure
- Mindmap Accessibility (2 test) - DUPLICATO con B
```

**DIAGNOSI**:
- `mindmaps.spec.ts` e' OBSOLETO - tutti i test sono coperti meglio da comprehensive
- `mindmap-hierarchy.spec.ts` ha overlap accessibility/zoom con comprehensive

**AZIONI**:
1. ELIMINARE `e2e/mindmaps.spec.ts`
2. RIMUOVERE test duplicati da `mindmap-hierarchy.spec.ts` (accessibility, zoom)

---

### 3. Voice Session E2E Tests (2 FILE - 1 OBSOLETO)

**File A**: `e2e/voice-session.spec.ts` (109 righe, 9 test)
```
Voice Session:
- clicking maestro opens voice session or shows config needed
- voice session modal has close button
- voice session shows maestro name
- escape key closes voice session
- can open session with different maestro

Voice Session Status:
- session shows Italian status messages

Voice Session Tools:
- tool buttons may be visible in session
```

**File B**: `e2e/voice-session-comprehensive.spec.ts` (437 righe, 21 test)
```
- Voice Session Initialization (5 test) - COPRE TUTTO di A
- Voice Session Status Messages (3 test)
- Voice Session Controls (3 test)
- Voice Session Audio Feedback (2 test)
- Voice Session Multiple Maestri (2 test)
- Voice Session Accessibility (3 test)
- Voice Session Error Recovery (2 test)
- Voice Session Performance (2 test)
```

**DIAGNOSI**:
- `voice-session.spec.ts` e' completamente OBSOLETO
- Tutti i 9 test sono coperti (e meglio) da comprehensive

**AZIONE**: ELIMINARE `e2e/voice-session.spec.ts`

---

### 4. Fix Verification E2E Tests (2 FILE - NON DUPLICATI)

**File A**: `e2e/fix-verification.spec.ts` (459 righe)
- C1: Console.log Production Check
- C3: Delete User Data
- Fix #4: Maestri Character Immersion
- Fix #5: Conversation Memory
- Fix #25: Home Progress Widget
- Fix #26: Libretto View
- Fix #29: Session Grade Display
- Fix #1: Mindmap Labels

**File B**: `e2e/fix-verification-comprehensive.spec.ts` (592 righe)
- C2: Homework Analyze API
- Fix #9, #10, #27-28, #30, #32, #33, #35, #37, #38, #39, #40, #11, #18, #19-21, #22-24
- API Routes: Complete Coverage
- Performance

**DIAGNOSI**: NON sono duplicati - testano fix DIVERSI

**AZIONE**:
- TENERE entrambi
- OPZIONALE: Rinominare per chiarezza (group-a.spec.ts, group-b.spec.ts)

---

### 5. Mindmap Unit Tests (4 FILE - TUTTI NECESSARI)

| File | Righe | Scopo |
|------|-------|-------|
| mindmap-export.test.ts | 394 | Serializzazione (JSON, MD, FreeMind, XMind) |
| mindmap-import.test.ts | 462 | Deserializzazione |
| mindmap-utils.test.ts | 380 | Conversione formato (ADR 0020) |
| mindmap-handler.test.ts | 677 | Handler per creazione |

**DIAGNOSI**: Testano aspetti COMPLEMENTARI, non duplicati

**AZIONE**: NESSUNA - tutti necessari

---

## PIANO DI ESECUZIONE

### FASE 1: Eliminazione File Obsoleti

| # | Azione | File | Motivo |
|---|--------|------|--------|
| 1.1 | ELIMINA | `e2e/mindmaps.spec.ts` | Obsoleto, coperto da comprehensive |
| 1.2 | ELIMINA | `e2e/voice-session.spec.ts` | Obsoleto, coperto da comprehensive |

### FASE 2: Consolidamento intent-detection

| # | Azione | Dettaglio |
|---|--------|-----------|
| 2.1 | LEGGI | Entrambi i file per identificare test unici |
| 2.2 | CREA | Nuovo file consolidato con TUTTI i test unici |
| 2.3 | RIMUOVI | File duplicati |

**Strategia consolidamento**:
```
src/lib/ai/__tests__/intent-detection.test.ts (NUOVO - consolidato)
├── Subject Detection (da File B - piu' completo)
├── Emotional Indicator Detection (merge)
├── Crisis Detection (merge, no duplicati)
├── Method Help Detection (merge)
├── Tool Request Detection (da File B con detectToolType)
├── Tech Support Detection (da File A - UNICO)
├── Character Routing (merge)
├── detectToolType (da File B - UNICO)
├── Helper Functions (merge)
├── Edge Cases (merge, no duplicati)
└── Complex Scenarios (da File B - UNICO)
```

### FASE 3: Pulizia Overlap mindmap-hierarchy

| # | Azione | Dettaglio |
|---|--------|-----------|
| 3.1 | RIMUOVI | Test duplicati accessibility da mindmap-hierarchy.spec.ts |
| 3.2 | VERIFICA | Test rimasti sono specifici per ADR 0020 |

### FASE 4: Verifica Finale

| # | Azione | Comando |
|---|--------|---------|
| 4.1 | RUN | `npm run test:unit` |
| 4.2 | RUN | `npm run test` (E2E) |
| 4.3 | CHECK | `npm run typecheck` |
| 4.4 | CHECK | `npm run lint` |

---

## RISULTATO ATTESO

### Prima del Refactoring
- 94 file totali
- 4 file obsoleti/duplicati
- Overlap intent-detection non risolto

### Dopo il Refactoring
- 91 file totali (-3)
- 0 file obsoleti
- intent-detection consolidato (2 -> 1)
- mindmap E2E pulito (3 -> 2)
- voice-session E2E pulito (2 -> 1)

---

## RISCHI E MITIGAZIONI

| Rischio | Mitigazione |
|---------|-------------|
| Eliminare test che sembrano duplicati ma testano edge case diversi | Lettura completa prima di eliminare |
| Rompere coverage | Verificare coverage prima/dopo ogni fase |
| Test che falliscono dopo merge | Run test dopo ogni singola modifica |

---

## CHECKLIST PRE-ESECUZIONE

- [x] Analisi completa intent-detection
- [x] Analisi completa mindmap E2E
- [x] Analisi completa voice-session E2E
- [x] Analisi completa fix-verification E2E
- [x] Analisi mindmap unit tests
- [x] Piano dettagliato con azioni specifiche
- [ ] Approvazione utente

---

## NOTE

1. **fix-verification files**: Nonostante il nome simile, testano fix DIVERSI. Non consolidare.
2. **mindmap unit tests**: 4 file sono TUTTI necessari - testano export/import/utils/handler separatamente.
3. **Pattern "comprehensive"**: Indica che il file base e' obsoleto, non che sono complementari.

---

## ESECUZIONE

Quando approvato, eseguire le fasi in ordine:
1. FASE 1: Eliminazioni (2 file)
2. FASE 2: Consolidamento intent-detection
3. FASE 3: Pulizia mindmap-hierarchy
4. FASE 4: Verifica finale

Ogni fase deve completare con successo prima di procedere alla successiva.
