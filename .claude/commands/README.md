# MirrorBuddy Claude Code Commands

Slash commands for systematic task execution with Task Master integration.

## 📋 Task Execution Commands

### `/execute-all-tasks` - Execute All Pending Tasks

**COMANDO PRINCIPALE** per eseguire tutti i task pendenti fino al completamento.

```bash
/execute-all-tasks
```

**Cosa fa:**
- Ottiene il prossimo task disponibile da Task Master
- Analizza la complessità e ESPANDE il task in subtask (con --research)
- Esegue ogni subtask uno per uno
- **BUILD E TEST OBBLIGATORI** (no "dovrebbe funzionare", TEST REALE!)
- Aggiorna SEMPRE la documentazione (CHANGELOG.md, ADRs, commenti)
- Fa un commit Git dopo ogni task completato
- Ripete per il prossimo task fino al completamento

**Garantisce:**
- ✅ Task capiti ed espansi prima dell'esecuzione
- ✅ Build e test prima di ogni commit
- ✅ Documentazione sempre aggiornata
- ✅ Nessun "non fa un cazzo" - tutto testato!
- ✅ Commits granulari dopo ogni task

**Durata stimata:** Ore/giorni (dipende da quanti task pendenti)

---

### `/execute-task <id>` - Execute Single Task

Esegue un singolo task specifico con lo stesso rigore di `/execute-all-tasks`.

```bash
/execute-task 99   # Execute Task 99 (Fix Audio Pipeline)
/execute-task 100  # Execute Task 100 (Voice Persistence)
/execute-task 104  # Execute Task 104 (ContextBanner)
```

**Workflow:**
1. Ottiene dettagli task
2. Analizza complessità e espande con --research
3. Esegue ogni subtask
4. Build e test obbligatori
5. Aggiorna documentazione
6. Commit Git
7. Marca task come done
8. Mostra prossimo task disponibile

**Usa questo quando:**
- Vuoi lavorare su un task specifico invece che sequenziale
- Vuoi testare il workflow su un solo task prima di `/execute-all-tasks`
- Hai task HIGH priority da completare prima

---

### `/review-task <id>` - Review Task Completion

Verifica che un task marcato come "done" funzioni davvero.

```bash
/review-task 91   # Review Task 91 (Extended Voice Recording)
/review-task 99   # Review Task 99 (Audio Pipeline)
```

**Cosa verifica:**
- ✅ Codice compilabile (xcodebuild)
- ✅ Test passano tutti
- ✅ Swift 6 concurrency compliance
- ✅ Nessun force unwrap pericoloso
- ✅ Errori gestiti correttamente
- ✅ Testo in italiano
- ✅ Documentazione aggiornata
- ✅ Commit ben formattato
- ✅ **Feature FUNZIONA nel simulator** (test manuale)

**Esiti possibili:**
- ✅ **PASS** - Task completato correttamente, marca done
- ⚠️ **ISSUES FOUND** - Problemi trovati, marca in-progress, lista fix necessari
- 🚫 **BLOCKED** - Dipendenze mancanti, marca blocked

**Usa questo quando:**
- Hai dubbi che un task funzioni davvero
- Vuoi QA rigoroso prima di chiudere un task
- Hai fatto modifiche manuali fuori dal workflow

---

## 🎯 Workflow Raccomandato

### Per Task Sequenziali (Approccio Standard)

```bash
# 1. Esegui tutti i task pendenti
/execute-all-tasks
```

Questo eseguirà task dopo task fino al completamento totale.

### Per Task Specifici (Approccio Mirato)

```bash
# 1. Vedi quali task sono disponibili
task-master list

# 2. Esegui task HIGH priority
/execute-task 99    # Voice pipeline fix
/execute-task 100   # Voice persistence
/execute-task 101   # Context integration

# 3. Continua con altri task
/execute-task 104   # ContextBanner
```

### Per Quality Assurance

```bash
# 1. Esegui task
/execute-task 99

# 2. Review rigoroso
/review-task 99

# 3. Se PASS, continua al prossimo
/execute-task 100
```

---

## 🚫 Anti-Patterns da Evitare

### ❌ NON FARE:
```bash
# ❌ Non saltare il testing
# ❌ Non dire "dovrebbe funzionare" senza provare
# ❌ Non skippare la documentazione
# ❌ Non fare commit senza build/test
# ❌ Non marcare done se ci sono errori
```

### ✅ FARE:
```bash
# ✅ Usa i comandi che forzano qualità
/execute-task 99        # Build, test, docs automatici

# ✅ Testa SEMPRE nel simulator
# ✅ Verifica che funzioni con dati reali
# ✅ Testa edge cases (nil, empty, errors)
# ✅ Aggiorna CHANGELOG.md sempre
```

---

## 📊 Task Master Status

Vedi status corrente:
```bash
task-master list                    # Tutti i task
task-master list --status=pending   # Solo pending
task-master list --status=in-progress  # Solo in corso
task-master next                    # Prossimo disponibile
```

Gestione manuale (se necessario):
```bash
task-master set-status --id=99 --status=done
task-master update-task --id=99 --prompt="notes..."
task-master expand --id=99 --research
```

Ma **preferisci i comandi slash** `/execute-task` e `/execute-all-tasks` che fanno tutto automaticamente.

---

## 🎓 Quality Standards Enforced

Ogni task completato DEVE:

**Code Quality:**
- [ ] Swift 6 strict concurrency (@MainActor, nonisolated)
- [ ] SwiftUI + SwiftData best practices
- [ ] Error handling con messaggi user-friendly in italiano
- [ ] No force unwrap senza commenti giustificativi
- [ ] Nomi descrittivi per variabili/metodi

**Testing:**
- [ ] Build succeeds (xcodebuild)
- [ ] All tests pass (se applicabile)
- [ ] Feature testata manualmente in simulator
- [ ] Edge cases testati (nil, empty, errors)
- [ ] VoiceOver funzionante (se UI)

**Documentation:**
- [ ] CHANGELOG.md updated
- [ ] ADR created (se decisione architettuale)
- [ ] API docs (se nuovo servizio/metodo pubblico)
- [ ] Code comments (spiega "why" non "what")

**Git:**
- [ ] Commit message descrittivo con task ID
- [ ] Lista cambiamenti nel commit
- [ ] Testing approach documentato
- [ ] Co-Authored-By: Claude line

---

## 🛠️ Troubleshooting

### Build Fails
```bash
# I comandi si fermano automaticamente se build fallisce
# Fix errori, poi ri-esegui il comando
/execute-task 99  # Riprende da dove si è fermato
```

### Tests Fail
```bash
# I comandi si fermano se i test falliscono
# Fix test, poi ri-esegui
/execute-task 99
```

### "Non fa un cazzo"
```bash
# Se pensi che qualcosa non funzioni:
/review-task 99   # Review rigoroso

# Se trova problemi, fixali:
/execute-task 99  # Re-implementa correttamente
```

### Task Bloccato da Dipendenze
```bash
# I comandi saltano automaticamente task bloccati
# Completa le dipendenze prima:
/execute-task 31  # Dipendenza
/execute-task 99  # Ora può partire
```

---

## 📚 Existing Commands

Altri comandi già disponibili:

- `/work-session` - Workflow più manuale con checkpoints
- `/work-next` - Simile ma senza espansione automatica
- `/orchestrate` - Per parallel agent execution
- Altri agent-specific commands in questa directory

**Raccomandazione:** Usa `/execute-all-tasks` o `/execute-task` per nuovo lavoro perché includono tutte le best practices.

---

## ✅ Success Criteria

Un task è veramente "done" quando:

1. ✅ Build succeeds senza warning
2. ✅ Tutti i test passano
3. ✅ Feature FUNZIONA nel simulator (testata manualmente)
4. ✅ Edge cases gestiti correttamente
5. ✅ Errori mostrano messaggi user-friendly in italiano
6. ✅ Documentazione aggiornata (CHANGELOG.md minimo)
7. ✅ Commit fatto con messaggio descrittivo
8. ✅ Task marcato done in Task Master

**"Non fa un cazzo" è INACCETTABILE.**

Usa questi comandi per garantire qualità dal primo giorno! 🚀
