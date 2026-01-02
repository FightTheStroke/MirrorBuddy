# Tests To Be Done ASAP

**Data**: 2026-01-02
**Priorità**: 🔴 **CRITICAL - BLOCCA PR MERGE**
**Tester**: Roberto / E2E Automation
**Ambiente**: localhost:3000

---

## CRITICAL FUNCTIONAL TESTS (FROM VERIFICATION)

### ❌ TEST CRITICAL 1: Tools in Full Screen Mode

**Obiettivo**: Verificare che i tool si carichino correttamente in focus mode
**Origine**: Roberto feedback - "i tool nella modalità full non funzionano"

#### Procedura:
1. [ ] Vai su `/education` → Mappe Mentali
2. [ ] Click "Crea con Professore"
3. [ ] Seleziona maestro (es. Euclide)
4. [ ] Seleziona modalità (Chat o Voce)
5. [ ] Aspetta il caricamento del layout full screen

#### Criteri di successo:
- [ ] Layout si apre con sidebar minimizzata a sinistra
- [ ] Tool area occupa ~70% schermo al centro
- [ ] Maestro panel occupa ~30% a destra
- [ ] Avatar maestro visibile con ring colorato
- [ ] Pulsante voce funzionante
- [ ] Chat input funzionante
- [ ] Il tool viene effettivamente creato quando richiesto

#### Se fallisce:
- Documentare COSA esattamente non funziona (layout? API? tool creation?)
- Screenshot del problema
- Check DevTools console per errori

**Status**: ⬜ Non eseguito | ✅ Passed | ❌ Failed

**Note**:

---

### ❌ TEST CRITICAL 2: Mindmap Hierarchical Structure

**Obiettivo**: Verificare che le mappe mentali siano gerarchiche, NON lineari/flat
**Origine**: Roberto feedback - "le mappe mentali sono ancora lineari!"

#### Procedura:
1. [ ] Entra in focus mode per Mindmap (vedi TEST CRITICAL 1)
2. [ ] Scrivi nella chat: "Crea una mappa mentale sulla fotosintesi"
3. [ ] Aspetta che la mappa sia generata
4. [ ] Ispeziona la struttura generata:
   - Apri DevTools → Network tab
   - Trova la chiamata a `/api/tools/mindmap` o `/api/chat`
   - Guarda il JSON della mappa nel response

#### Criteri di successo:
- [ ] Ci sono nodi con `parentId: null` (root nodes - rami principali)
- [ ] Ci sono nodi con `parentId: "1"`, `parentId: "2"` etc. (child nodes)
- [ ] La mappa ha ALMENO 3 livelli di profondità
- [ ] NON tutti i nodi hanno `parentId: null` (se sì = FLAT/LINEARE = BUG)
- [ ] Visivamente la mappa mostra rami che si espandono dal centro

#### Se fallisce:
- Copia il JSON generato dal tool
- Screenshot della mappa visualizzata
- Check logs server per `Tool context injected` e `Mindmap generated FLAT`

**Status**: ⬜ Non eseguito | ✅ Passed | ❌ Failed

**Note**:

---

### ❓ TEST CRITICAL 3: Full Screen Layout Specification

**Obiettivo**: Verificare che il layout corrisponda alla specifica richiesta
**Origine**: Roberto feedback - "il layout non è quello che avevo chiesto"

#### Specifica richiesta (da MasterPlan):
> "Il layout full screen quando si usano i tool va fatto coerente con la app UI. io ho detto solo di minimizzare la barra di navigazione a sinistra non di toglierla, sulla destra, in stile analogo ai professori e coach etc (quindi stesso avatar, colori etc), per un 30% dello spazio disponibile max, ci deve essere sia la voce che la chat e il resto della pagina deve essere a disposizione del tool"

#### Procedura:
1. [ ] Entra in focus mode per qualsiasi tool
2. [ ] Verifica presenza sidebar a sinistra (minimizzata, icone only)
3. [ ] Verifica sidebar si espande on hover
4. [ ] Misura proporzioni: tool area ~70%, maestro panel ~30%
5. [ ] Verifica maestro panel a destra contiene:
   - [ ] Avatar con ring colorato
   - [ ] Nome maestro
   - [ ] Pulsante voice call (phone style)
   - [ ] Chat input
6. [ ] Verifica colori coerenti con maestro selezionato

#### Criteri di successo:
- [ ] Sidebar minimizzata presente (NON rimossa)
- [ ] Proporzioni 70/30 rispettate
- [ ] Maestro panel stile conversation card
- [ ] Voice + chat entrambi presenti
- [ ] Colori maestro applicati correttamente

#### Se fallisce:
- Screenshot del layout attuale
- Descrivere cosa SPECIFICAMENTE non corrisponde
- Misurare proporzioni effettive (DevTools)

**Status**: ⬜ Non eseguito | ✅ Passed | ❌ Failed

**Note**:

---

### ✅ TEST CRITICAL 4: Voice Onboarding Persistence - FIXED

**Problema**: Durante welcome, Melissa passa alla voce Web Speech "robotica"
**Fix**: Commit 0440672 - Added retry logic with exponential backoff

**Test di verifica fix**:
1. [ ] Apri `/welcome` in incognito (reset completo)
2. [ ] Click "Inizia con voce"
3. [ ] Completa TUTTI gli step dell'onboarding
4. [ ] Ascolta attentamente la voce in ogni step

#### Criteri di successo:
- [ ] La voce inizia come Melissa (voce Azure, naturale)
- [ ] La voce rimane Melissa per TUTTO l'onboarding
- [ ] NON c'è switch a voce robotica Web Speech
- [ ] Se c'è un errore voce, vedi log retry (2s, 4s, 8s delays)
- [ ] Solo dopo 3 retry falliti → fallback a Web Speech

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed (se fallisce = bug nel fix)

**Note**:

---

## E2E AUTOMATED TESTS

### TEST 0: SMOKE TEST AUTOMATICO (OBBLIGATORIO)

**Obiettivo**: Eseguire il test E2E completo che cattura TUTTI gli errori del browser.

```bash
npx playwright test e2e/full-app-smoke.spec.ts --reporter=list
```

Questo test automatico:
- Naviga TUTTE le route dell'app
- Apre tutti i 16 maestri
- Testa tutti i 5 coach e 5 buddy
- Verifica tutti i tool (quiz, flashcard, mindmap, riassunti, demo)
- Testa impostazioni, calendario, progressi, genitori
- Cattura TUTTI gli errori della console browser
- Cattura errori di rete (4xx, 5xx)
- Cattura crash di pagina
- Testa keyboard navigation e responsive resize

#### Criteri di successo:
- [ ] Nessun errore console critico (ignorati: 401, 429, HMR, DevTools)
- [ ] Nessun crash di pagina
- [ ] Tutti i test passano

#### Se fallisce:
1. Leggi l'output per vedere quali errori
2. Aggiungi errori alla sezione "ISSUES FOUND" sotto
3. Fixa gli errori PRIMA di procedere
4. Re-run il test finché non passa

**Status**: ❌ **FAILED - 95/130 passed, 35 failed**

**Output**:
```
Test Results: 95 passed, 35 failed
Duration: 2.2 minutes
Browsers: Chromium (26 passed), Firefox (0 passed, 26 failed), WebKit (issues)

Common errors:
1. Telemetry API failures (ERR_ABORTED)
2. Voice API errors on Firefox/WebKit
3. Network request cancelled errors
```

---

## ISSUES FOUND DURING E2E TESTS

### Issue 1: Telemetry API Failing (ERR_ABORTED)
- **Severity**: Medium
- **Test che ha fallito**: Multiple tests (navigates all main routes, all showcase pages)
- **Errore**: `Network request failed: http://localhost:3000/api/telemetry/events - net::ERR_ABORTED`
- **Browser**: Chromium, Firefox
- **Root cause**: Telemetry events endpoint è cancellato/aborted durante navigazione
- **Fix richiesto**:
  - Check se telemetry service è configurato correttamente
  - Verificare se telemetry flush avviene durante page unload
  - Considera queue telemetry events e flush batch
  - NON blocca funzionalità core (LOW severity per user impact)

**Status**: ⬜ To Fix

**Note**: Errore non critico ma inquina i log. Considerare fix post-merge.

---

### Issue 2: Voice API Error on Firefox - Welcome Page
- **Severity**: High (per Firefox users)
- **Test che ha fallito**: ALL Firefox tests (26/26)
- **Errore**: `[ERROR] [WelcomePage] Voice API error JSHandle@object`
- **Root cause**: Firefox tests vanno SEMPRE su `/welcome` prima di navigare, welcome page cerca `/api/realtime/token`, ma API probabilmente non disponibile in test environment
- **File/Line**: `src/app/welcome/page.tsx:112-127` (fetchConnectionInfo)
- **Fix richiesto**:
  - Mock `/api/realtime/token` nei test E2E
  - OR: Skip voice check in test environment (check `NODE_ENV === 'test'`)
  - OR: Test setup dovrebbe evitare redirect a /welcome su Firefox

**Status**: ⬜ To Fix

**Note**: Blocca TUTTI i test Firefox. Fix urgente se supportiamo Firefox in production.

---

### Issue 3: Telemetry Flush Failed (Console Errors)
- **Severity**: Low
- **Test che ha fallito**: navigates all main routes, showcase pages
- **Errore**: `[ERROR] Telemetry flush failed JSHandle@object`
- **Root cause**: Telemetry service prova a fare flush durante page unload ma fallisce
- **Fix richiesto**:
  - Wrap telemetry flush in try-catch
  - Log solo in debug mode, non in console always
  - Verify telemetry configuration

**Status**: ⬜ To Fix

**Note**: Related to Issue 1. Non blocca funzionalità.

---

### Issue 4: OpenDyslexic Font Download Failed (WebKit)
- **Severity**: Low
- **Test che ha fallito**: all showcase pages load without errors (WebKit)
- **Errore**: `downloadable font: download failed (font-family: "OpenDyslexic") - NS_BINDING_ABORTED`
- **URL**: `https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff`
- **Root cause**: External CDN font non raggiungibile in test environment OR test navigation troppo veloce
- **File/Line**: Accessibility profile configuration
- **Fix richiesto**:
  - Self-host OpenDyslexic font invece di CDN
  - OR: Fallback gracefully se font non disponibile
  - OR: Preload font nei test

**Status**: ⬜ To Fix

**Note**: Impatta accessibility feature. Medium priority.

---

### Issue 5: Page Error - Fetch API Access Control
- **Severity**: Low
- **Test che ha fallito**: navigates all main routes (WebKit)
- **Errore**: `Fetch API cannot load /localhost:3000/api/debug/log due to access control checks`
- **Root cause**: Debug API probabilmente non ha CORS headers corretti
- **Fix richiesto**:
  - Add CORS headers to `/api/debug/log`
  - OR: Disable debug API in production

**Status**: ⬜ To Fix

**Note**: Debug API, non user-facing.

---

## MANUAL TESTS (DA PRECEDENTE MANUALTEST FILE)

### TEST 0.1.5: Tool Creation con 3 Maestri Diversi

**Obiettivo**: Verificare che la creazione di tool funzioni con maestri diversi (non solo Melissa).
**Origine**: MasterPlan WAVE 0 - Bug 0.1.5

#### Procedura:
1. [ ] Apri una conversazione con **Galileo**
2. [ ] Chiedi: "Fammi una mappa mentale del sistema solare"
3. [ ] Verifica: mappa creata da Galileo (non Melissa)
4. [ ] Ripeti con **Marie Curie**: "Fammi un quiz sulla tavola periodica"
5. [ ] Verifica: quiz creato da Marie Curie
6. [ ] Ripeti con **Darwin**: "Fammi delle flashcard sull'evoluzione"
7. [ ] Verifica: flashcard create da Darwin

#### Criteri di successo:
- [ ] Ogni maestro crea il proprio tool (avatar corretto)
- [ ] Nessun fallback silenzioso a Melissa
- [ ] Tool salvati con il maestro corretto

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

### TEST 0.2.5: Memory Persistence

**Obiettivo**: Verificare che i maestri ricordino le conversazioni precedenti.
**Origine**: MasterPlan WAVE 0 - Bug 0.2.5

#### Procedura:
1. [ ] Inizia una conversazione con **Melissa**
2. [ ] Di': "Mi chiamo Marco, ho 15 anni e studio al liceo scientifico"
3. [ ] Chiudi la sessione (termina conversazione o cambia pagina)
4. [ ] Riapri una nuova conversazione con Melissa
5. [ ] Chiedi: "Ti ricordi come mi chiamo?"
6. [ ] Chiedi: "Quanti anni ho?"

#### Criteri di successo:
- [ ] Melissa ricorda il nome
- [ ] Melissa ricorda l'età
- [ ] Non si ripresenta da capo ogni volta

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

### TEST 0.3.5: Demo Interattiva con Galileo

**Obiettivo**: Verificare che le demo interattive vengano create dinamicamente con un maestro.
**Origine**: MasterPlan WAVE 0 - Bug 0.3.5

#### Procedura:
1. [ ] Apri una conversazione con **Galileo**
2. [ ] Chiedi: "Crea una demo interattiva sul sistema solare"
3. [ ] Attendi generazione (può richiedere 30-60 secondi)
4. [ ] Verifica che la demo si carichi
5. [ ] Verifica interattività (pianeti cliccabili, animazioni)

#### Criteri di successo:
- [ ] Demo generata senza errori
- [ ] Sandbox CSP permette immagini
- [ ] Demo è interattiva (non statica)
- [ ] Galileo (non Melissa) è il creatore

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

### TEST 9.08: Keyboard Navigation

**Obiettivo**: Verificare che tutti i nuovi componenti UI siano navigabili da tastiera.

#### Componenti da testare:
| Componente | Path | Test |
|------------|------|------|
| Knowledge Hub | `/education` → Knowledge Hub | Tab attraverso tutti gli elementi |
| Tool Selection Dialog | Clicca "Crea Mappa Mentale" | Tab, Enter, Escape funzionano |
| Sidebar Navigation | Knowledge Hub sidebar | Arrow keys, Enter per selezionare |
| Material Cards | Gallery view | Tab, Enter per aprire, Space per selezionare |
| Search Bar | Knowledge Hub header | Focus con Tab, typing, Escape per clear |
| View Switcher | Knowledge Hub header | Tab tra le opzioni, Enter per selezionare |

#### Criteri di successo:
- [ ] Tutti gli elementi interattivi raggiungibili con Tab
- [ ] Focus visibile su ogni elemento
- [ ] Enter attiva l'azione appropriata
- [ ] Escape chiude dialog/dropdown
- [ ] Nessun "focus trap" (non rimani bloccato)

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

### TEST 9.12: All 5 Tool Flows

**Obiettivo**: Verificare che tutti i flussi di creazione tool funzionino end-to-end.

#### Tool da testare:

**1. Mappa Mentale**
- [ ] Creazione con maestro
- [ ] Nodi gerarchici (NON flat)
- [ ] Rendering Markmap funzionante
- [ ] Salvataggio in Knowledge Hub

**2. Quiz**
- [ ] 5 domande generate
- [ ] Opzioni multiple per ogni domanda
- [ ] Risposta corretta indicata
- [ ] Spiegazioni presenti

**3. Flashcards**
- [ ] Carte generate
- [ ] Front/back corretti
- [ ] Flip animation funziona

**4. Riassunto**
- [ ] Testo strutturato
- [ ] Punti chiave evidenziati

**5. Demo Interattiva**
- [ ] Contenuto HTML generato
- [ ] Interattività funziona

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

### TEST 9.13: Voice Mode

**Obiettivo**: Verificare che la modalità voce funzioni correttamente.

#### Prerequisiti:
- Azure OpenAI Realtime configurato
- Microfono funzionante
- Cuffie consigliate (evita feedback)

#### Criteri di successo:
- [ ] Connessione stabile
- [ ] Riconoscimento vocale accurato
- [ ] Risposta vocale fluida
- [ ] UI controls funzionanti (Mute, End Call)
- [ ] Nessun crash o freeze

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

### TEST 9.15: Memory Context in Conversation

**Obiettivo**: Verificare che i maestri ricordino le conversazioni precedenti.

#### Procedura:
1. [ ] Inizia conversazione con maestro
2. [ ] Digli qualcosa di personale: "Mi chiamo Marco e studio biologia"
3. [ ] Crea un tool
4. [ ] Termina sessione
5. [ ] Nuova conversazione con STESSO maestro
6. [ ] Chiedi: "Ti ricordi come mi chiamo?"

#### Criteri di successo:
- [ ] Maestro ricorda il nome
- [ ] Maestro ricorda il contesto
- [ ] Memoria persiste tra sessioni

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## RIEPILOGO

### Critical Tests (BLOCKING)
| Test | Status | Blocker |
|------|--------|---------|
| CRITICAL 1: Full Screen Mode Tools | ⬜ | YES |
| CRITICAL 2: Mindmap Hierarchy | ⬜ | YES |
| CRITICAL 3: Layout Specification | ⬜ | YES |
| CRITICAL 4: Voice Onboarding | ⬜ | NO (fixed) |
| TEST 0: E2E Smoke Test | ⬜ | YES |

### Manual Tests
| Test | Status |
|------|--------|
| 0.1.5 Tool Creation 3 Maestri | ⬜ |
| 0.2.5 Memory Persistence | ⬜ |
| 0.3.5 Demo Galileo | ⬜ |
| 9.08 Keyboard Navigation | ⬜ |
| 9.12 Tool Flows | ⬜ |
| 9.13 Voice Mode | ⬜ |
| 9.15 Memory Context | ⬜ |

**Critical tests passed**: ⬜ No - BLOCCA PR MERGE
**All manual tests passed**: ⬜ No

---

## AZIONI POST-TEST

Quando tutti i CRITICAL tests sono ✅:

1. Fix tutti gli issues trovati
2. Re-run E2E smoke test fino a PASS
3. Aggiorna `MasterPlan-Sprint-2026-01.md` con risultati
4. Approva PR merge development → main

---

**Creato**: 2026-01-02
**Last updated**: 2026-01-02
**Autore**: Claude Sonnet 4.5
