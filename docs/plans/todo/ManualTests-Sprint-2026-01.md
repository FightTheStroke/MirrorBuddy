# Manual Tests - Sprint 2026-01

**Data**: 2026-01-02
**Prerequisito**: PR #96 merged to main
**Tester**: Roberto
**Ambiente**: localhost:3000 con database popolato

---

## CHECKLIST PRE-TEST

```bash
# 1. Assicurati di essere su main aggiornato
git checkout main && git pull

# 2. Installa dipendenze
npm install

# 3. Avvia il server
npm run dev

# 4. Apri browser su http://localhost:3000
```

---

## TEST 9.08: Keyboard Navigation

**Obiettivo**: Verificare che tutti i nuovi componenti UI siano navigabili da tastiera.

### Componenti da testare:

| Componente | Path | Test |
|------------|------|------|
| Knowledge Hub | `/education` → Knowledge Hub | Tab attraverso tutti gli elementi |
| Tool Selection Dialog | Clicca "Crea Mappa Mentale" | Tab, Enter, Escape funzionano |
| Sidebar Navigation | Knowledge Hub sidebar | Arrow keys, Enter per selezionare |
| Material Cards | Gallery view | Tab, Enter per aprire, Space per selezionare |
| Search Bar | Knowledge Hub header | Focus con Tab, typing, Escape per clear |
| View Switcher | Knowledge Hub header | Tab tra le opzioni, Enter per selezionare |

### Procedura:

1. [ ] Apri Knowledge Hub
2. [ ] Premi Tab ripetutamente - verifica che il focus si sposti visibilmente
3. [ ] Verifica che ogni elemento interattivo sia raggiungibile
4. [ ] Premi Enter sugli elementi - verifica che attivino l'azione
5. [ ] Premi Escape nei dialog - verifica che si chiudano
6. [ ] Usa Arrow keys nella sidebar - verifica navigazione
7. [ ] Verifica focus ring visibile (outline blu/viola)

### Criteri di successo:
- [ ] Tutti gli elementi interattivi raggiungibili con Tab
- [ ] Focus visibile su ogni elemento
- [ ] Enter attiva l'azione appropriata
- [ ] Escape chiude dialog/dropdown
- [ ] Nessun "focus trap" (non rimani bloccato)

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.09: Screen Reader

**Obiettivo**: Verificare compatibilità con screen reader (VoiceOver su Mac).

### Setup:
1. Attiva VoiceOver: `Cmd + F5`
2. Naviga con `VO + Arrow keys`

### Elementi da verificare:

| Elemento | Cosa verificare |
|----------|-----------------|
| Headings | VoiceOver annuncia h1, h2, h3 correttamente |
| Buttons | Annuncia nome e ruolo ("button") |
| Links | Annuncia destinazione |
| Images | Annuncia alt text |
| Forms | Annuncia label dei campi |
| Dialogs | Annuncia titolo quando si apre |
| Lists | Annuncia "list, X items" |

### Procedura:

1. [ ] Apri Knowledge Hub con VoiceOver attivo
2. [ ] Naviga con VO+Right Arrow attraverso la pagina
3. [ ] Verifica che ogni elemento sia annunciato sensatamente
4. [ ] Apri un dialog - verifica annuncio
5. [ ] Compila la search bar - verifica feedback
6. [ ] Seleziona una collection - verifica annuncio

### Criteri di successo:
- [ ] Tutti gli elementi hanno label leggibili
- [ ] Nessun "button" o "link" senza nome
- [ ] I dialog annunciano il loro scopo
- [ ] Le azioni vengono confermate vocalmente

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.10: Search Performance (1000+ materials)

**Obiettivo**: Verificare che la ricerca rimanga fluida con molti materiali.

### Setup:
```bash
# Genera dati di test (opzionale - richiede script)
# npx ts-node scripts/generate-test-materials.ts --count=1000
```

### Procedura:

1. [ ] Assicurati di avere 1000+ materiali nel database
2. [ ] Apri Knowledge Hub
3. [ ] Digita nella search bar
4. [ ] Misura il tempo di risposta tra keystroke e risultati

### Criteri di successo:
- [ ] Debounce attivo (non cerca ad ogni tasto)
- [ ] Risultati appaiono in < 300ms dopo debounce
- [ ] UI non si blocca durante la ricerca
- [ ] Typing rimane fluido

### Metriche:
- Tempo primo risultato: ___ ms
- Tempo ricerca completa: ___ ms
- Frame drops durante typing: ___

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.11: Knowledge Hub Load Time

**Obiettivo**: Pagina carica in < 2 secondi.

### Procedura:

1. [ ] Apri DevTools → Network tab
2. [ ] Abilita "Disable cache"
3. [ ] Ricarica Knowledge Hub (Cmd+Shift+R)
4. [ ] Misura tempo fino a LCP (Largest Contentful Paint)

### Criteri di successo:
- [ ] DOMContentLoaded < 1s
- [ ] LCP < 2s
- [ ] No layout shift dopo load
- [ ] Lazy loading attivo per renderers

### Metriche:
- DOMContentLoaded: ___ ms
- LCP: ___ ms
- Total resources: ___ KB

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.12: All 5 Tool Flows

**Obiettivo**: Verificare che tutti i flussi di creazione tool funzionino end-to-end.

### Tool da testare:

#### 1. Mappa Mentale
1. [ ] Vai a Mappe Mentali
2. [ ] Clicca "Crea nuova mappa"
3. [ ] Seleziona maestro nel dialog
4. [ ] Scegli modalità (chat/voice)
5. [ ] Chiedi "Crea una mappa mentale sulla fotosintesi"
6. [ ] Verifica che la mappa venga generata con:
   - [ ] Titolo corretto
   - [ ] Nodi gerarchici
   - [ ] Rendering Markmap funzionante
7. [ ] Salva e verifica in Knowledge Hub

#### 2. Quiz
1. [ ] Vai a Quiz
2. [ ] Clicca "Crea nuovo quiz"
3. [ ] Seleziona maestro
4. [ ] Chiedi "Quiz di 5 domande sulla rivoluzione francese"
5. [ ] Verifica:
   - [ ] 5 domande generate
   - [ ] Opzioni multiple per ogni domanda
   - [ ] Risposta corretta indicata
   - [ ] Spiegazioni presenti
6. [ ] Salva e verifica in Knowledge Hub

#### 3. Flashcards
1. [ ] Vai a Flashcards
2. [ ] Clicca "Crea flashcards"
3. [ ] Seleziona maestro
4. [ ] Chiedi "10 flashcard sui verbi irregolari inglesi"
5. [ ] Verifica:
   - [ ] 10 carte generate
   - [ ] Front/back corretti
   - [ ] Flip animation funziona
6. [ ] Salva e verifica in Knowledge Hub

#### 4. Riassunto
1. [ ] Vai a Riassunti
2. [ ] Clicca "Crea riassunto"
3. [ ] Seleziona maestro
4. [ ] Chiedi "Riassumi il ciclo dell'acqua"
5. [ ] Verifica:
   - [ ] Testo strutturato
   - [ ] Punti chiave evidenziati
6. [ ] Salva e verifica in Knowledge Hub

#### 5. Demo Interattiva
1. [ ] Vai a Demo
2. [ ] Clicca "Crea demo"
3. [ ] Seleziona maestro
4. [ ] Chiedi "Demo interattiva sul sistema solare"
5. [ ] Verifica:
   - [ ] Contenuto HTML generato
   - [ ] Interattività funziona
6. [ ] Salva e verifica in Knowledge Hub

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.13: Voice Mode

**Obiettivo**: Verificare che la modalità voce funzioni correttamente.

### Prerequisiti:
- Azure OpenAI Realtime configurato (AZURE_OPENAI_REALTIME_* env vars)
- Microfono funzionante
- Cuffie consigliate (evita feedback)

### Procedura:

1. [ ] Vai a qualsiasi tool (es. Mappe Mentali)
2. [ ] Clicca "Crea nuova mappa"
3. [ ] Nel dialog, seleziona modalità "Voce"
4. [ ] Verifica connessione WebSocket (proxy.ready)
5. [ ] Parla: "Crea una mappa mentale sulla cellula"
6. [ ] Verifica:
   - [ ] Voce riconosciuta (transcript visibile)
   - [ ] Maestro risponde vocalmente
   - [ ] Tool viene creato
7. [ ] Testa pulsante Mute
8. [ ] Testa pulsante End Call
9. [ ] Verifica livelli audio visibili

### Criteri di successo:
- [ ] Connessione stabile
- [ ] Riconoscimento vocale accurato
- [ ] Risposta vocale fluida
- [ ] UI controls funzionanti
- [ ] Nessun crash o freeze

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.14: Knowledge Hub Search

**Obiettivo**: Verificare funzionalità di ricerca nel Knowledge Hub.

### Procedura:

1. [ ] Assicurati di avere materiali salvati
2. [ ] Apri Knowledge Hub
3. [ ] Digita nella search bar un termine presente in un titolo
4. [ ] Verifica risultati filtrati
5. [ ] Digita un termine nel contenuto (non titolo)
6. [ ] Verifica fuzzy matching (es. "fotosintes" trova "fotosintesi")
7. [ ] Clear search e verifica tutti i materiali tornano
8. [ ] Testa filtri per tipo (mindmap, quiz, etc.)
9. [ ] Testa filtri per collection

### Criteri di successo:
- [ ] Ricerca per titolo funziona
- [ ] Ricerca nel contenuto funziona
- [ ] Fuzzy matching attivo
- [ ] Filtri combinabili
- [ ] Clear ripristina vista completa

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## TEST 9.15: Memory Context in Conversation

**Obiettivo**: Verificare che i maestri ricordino le conversazioni precedenti.

### Procedura:

1. [ ] Inizia una conversazione con un maestro
2. [ ] Digli qualcosa di personale: "Mi chiamo Marco e studio biologia"
3. [ ] Chiedi di creare un tool qualsiasi
4. [ ] Termina la sessione
5. [ ] Inizia una NUOVA conversazione con lo STESSO maestro
6. [ ] Chiedi: "Ti ricordi come mi chiamo?"
7. [ ] Chiedi: "Cosa studio?"
8. [ ] Verifica che ricordi le info precedenti

### Criteri di successo:
- [ ] Maestro ricorda il nome
- [ ] Maestro ricorda il contesto (cosa studi)
- [ ] Memoria persiste tra sessioni
- [ ] Memoria specifica per utente (non condivisa)

**Status**: ⬜ Non testato | ✅ Passed | ❌ Failed

**Note**:

---

## RIEPILOGO

| Test | Status | Tester | Data |
|------|--------|--------|------|
| 9.08 Keyboard Navigation | ⬜ | | |
| 9.09 Screen Reader | ⬜ | | |
| 9.10 Search Performance | ⬜ | | |
| 9.11 Load Time | ⬜ | | |
| 9.12 Tool Flows | ⬜ | | |
| 9.13 Voice Mode | ⬜ | | |
| 9.14 Knowledge Hub Search | ⬜ | | |
| 9.15 Memory Context | ⬜ | | |

**Tutti i test passati**: ⬜ No

---

## AZIONI POST-TEST

Quando tutti i test sono ✅:

1. Aggiorna `MasterPlan-Sprint-2026-01.md` con i risultati
2. Sposta questo file in `docs/plans/done/`
3. Merge PR #96 to main (se non già fatto)
4. Crea tag release `v2026.01`

---

**Versione**: 1.0
**Creato**: 2026-01-02
**Autore**: Claude Opus 4.5
