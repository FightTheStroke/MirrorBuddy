# PLAN — MirrorBuddy: analisi completa e piano di rilascio

**Data:** 2026-07-02 · **Autore:** Claude (Fable 5) — sessione `claude/mirrorbuddy-voice-issue`
**Base:** audit statico a 5 assi (architettura, core educativo, UX/a11y/i18n, safety/compliance, ops/CI/mobile) su `main` + verifiche runtime fatte in sessione (subsystem voce, gate CI, deploy path).

---

## Come usare questo documento (per l'agente esecutore: Sonnet / Opus)

1. **Leggi prima** `CLAUDE.md` (root), `.claude/rules/*.md`, e i `CLAUDE.md` annidati delle aree che tocchi. Le loro regole VINCONO su questo documento in caso di conflitto.
2. **Disciplina di lavoro** (obbligatoria, dal repo):
   - Mai lavorare su `main`: `/worktree-start` → branch dedicato per ogni task.
   - Prima di ogni commit: `npm run test:unit -- --reporter=dot`. Prima di dichiarare finito: `npm run ci:summary` (o `/verify-done`). Incolla l'output, non riassumerlo.
   - Testo UI nuovo → chiavi i18n IT-first → `npx tsx scripts/i18n-sync-namespaces.ts --add-missing` → `npm run i18n:check`.
   - Conventional commits; una PR per task (o per gruppo coeso); template PR del repo compilato onestamente.
   - Squash merge è DISABILITATO sul repo: usa merge commit. Le PR non si mergiano finché ogni thread di review non è risolto (branch rule).
3. **Ogni task qui sotto ha**: ID, priorità, effort (S ≤ mezza giornata · M ≤ 2 giorni · L > 2 giorni), file con riferimenti, passi, criteri di accettazione (comandi), e il modello suggerito (Sonnet = meccanico/ben specificato; Opus/Fable = giudizio, safety, refactor delicati).
4. **Non fidarti ciecamente dei `file:line`**: il codice evolve; sono ancore, riverifica con grep prima di editare.
5. **Ordine**: le fasi sono in ordine di esecuzione consigliato. Dentro una fase, i P0 prima dei P1.

---

## Executive summary (IT)

MirrorBuddy è più maturo di quanto il gate CI rosso faccia pensare: crittografia PII reale (AES-256-GCM via Prisma extension), scrubbing PII prima degli embedding, endpoint GDPR (delete/export) reali, cron protetti con `timingSafeEqual`, gamification coerente, home "intention-based" ben progettata per bambini DSA, 26 maestri consistenti. **Ma il pattern di rischio dominante, ripetuto in ogni area, è: "implementato e testato, ma non collegato".**

I quattro problemi che DEVONO essere risolti prima di un rilascio pubblico a bambini 8–14:

1. **Safety vocale non applicata** — il contenuto flaggato (input del bambino O output del modello) viene solo loggato; l'audio continua a suonare. `triggerSafetyIntervention` esiste, è testato, e non è mai chiamato (doppia conferma da 2 audit indipendenti).
2. **Escalation di crisi persa sul path streaming della chat** — un bambino che esprime intenti autolesivi sul path streaming riceve il redirect testuale ma **nessuna notifica al genitore e nessuna escalation** (context non passato a `checkInputSafety`).
3. **Il deploy in produzione non passa dal gate** — niente nel repo disabilita l'auto-deploy Vercel `main`→prod; il commento in CI che afferma il contrario è falso. Ogni merge va in produzione ignorando 18 job bloccanti. (Conseguenza positiva: i fix voce/persona già mergiati sono quasi certamente live. Conseguenza negativa: anche qualsiasi regressione lo sarebbe.)
4. **TTS hardcoded in italiano per tutte e 5 le lingue** — la funzione assistiva centrale per dislessia/CP legge inglese/francese/tedesco/spagnolo con fonemi italiani. (Non blocca un rilascio IT-only.)

**Raccomandazione strategica:** rilascio **IT-first** (l'app è nata IT-default). Questo sposta quasi tutta la Fase 2-i18n fuori dal percorso critico e concentra il GA su: Fase 0 (deploy onesto) + Fase 1 (safety) + il sottoinsieme IT della Fase 2. Le locale en/fr/de/es si attivano in una release successiva quando TTS e traduzioni sono a posto.

**Stato già sistemato in questa sessione** (mergiato su `main`): fix voce `capture_homework` che ammutoliva i professori (#449, incluso invio della foto compiti al modello e recovery su eccezioni), fix persona/greeting (#452), rimozione specs E2E morti `/coming-soon` (#453, in merge).

---

## Definizione di rilascio (go/no-go)

**GA web (IT-first)** richiede TUTTI i seguenti:

- [ ] Fase 0 completa: gate CI autoritativo (o decisione esplicita e documentata di tenere l'auto-deploy), `main` E2E verde, uptime monitor attivo.
- [ ] Fase 1 completa: tutti i P0/P1 safety collegati e coperti da test d'integrazione; `voice_transcript_safety` verificato ON in prod; run di `scripts/compliance-check.ts` aggiornato che fallirebbe se il wiring regredisse.
- [ ] Fase 2 (sottoinsieme IT): promessa "dashboard genitori" resa vera o copy corretto; error copy child-friendly IT; date/orari via formatter.
- [ ] Nessun P0 aperto in questo documento.
- [ ] Verifiche runtime della sezione "Verifiche manuali" fatte e annotate.

**Release multilingua** = GA + Fase 2 completa (TTS multilingua, de/errors, [TRANSLATE] sweep, parity voice namespace).
**Release iOS** = Fase 6 completa (traccia separata, post-GA web).

---

# FASE 0 — Integrità del deploy e verità del CI
*Obiettivo: quello che il CI dice deve essere vero; quello che va in prod deve passare dal gate. Senza questa fase, tutte le altre garanzie sono decorative.*

### T0.1 — Rendere il Deployment Gate autoritativo su Vercel — **P0 · S · Sonnet + decisione umana**
- **Problema:** `vercel.json` non contiene `ignoreCommand` né config `git`; `.vercelignore` contiene solo `feature/`. Il commento in `.github/workflows/ci.yml:1900` ("Auto-deploy is disabled via ignoreCommand in vercel.json") è **falso**. Con Git integration default, ogni push su `main` deploya in produzione bypassando gate e promote workflow.
- **Passi:**
  1. (Umano, 1 min) Verifica su Vercel dashboard: Settings → Git → Production Branch e Ignored Build Step per il progetto `mirrorbuddy`.
  2. Aggiungi a `vercel.json`: `"ignoreCommand": "exit 0"` — così i build Git-triggered vengono saltati e SOLO `deploy-to-staging` (CI) + `promote-to-production.yml` possono deployare. **Attenzione:** verifica che `vercel deploy --prebuilt` (ci.yml:1962) non sia affetto dall'ignoreCommand (non lo è: l'ignore vale per i build Git-triggered, non per deploy CLI prebuilt) — testa su un branch prima.
  3. Correggi il commento in `ci.yml:1900` per riflettere la realtà.
  4. In alternativa (se si preferisce mantenere l'auto-deploy): rimuovi il gate/promote workflow e documenta che prod = `main`. **Una delle due; lo stato attuale (entrambi, con il gate ignorato) è il peggiore dei mondi.**
- **Accettazione:** push di un commit banale su un branch di test mergiato su `main` NON produce un deployment production su Vercel; il promote workflow sì. Commento CI corretto.

### T0.2 — Portare `main` E2E al verde: fix dei 10 test `home-intent*` — **P0 · M · Opus**
- **Contesto (verificato in sessione):** su `main` falliscono 18 spec E2E: 8 in `coming-soon.spec.ts` (pagina rimossa in #430 — spec eliminati con PR #453) e **10 tra `home-intent.spec.ts`, `home-intent-a11y.spec.ts`, `home-intent-dsa-a11y.spec.ts`, `home-intent-dsa-personas.spec.ts`**. I testid usati dagli spec esistono in `src/app/[locale]/home-intent-chooser.tsx`, quindi non sono spec obsoleti: la home non raggiunge lo stato atteso nel build prod in CI (fallimenti runtime, sopravvivono a 3 retry). NON sono flake e NON è il rumore `duplicate key User_pkey` nei log Postgres (quello è gestito da `session-auth.ts` con upsert+P2002-catch).
- **Passi:**
  1. Esegui localmente: `npx playwright test apps/web/e2e/home-intent.spec.ts --project=chromium` contro build prod (`npm run build && npm start`) — richiede rete per `prisma generate` (nel sandbox della sessione precedente era bloccata: `binaries.prisma.sh`; assicurati che l'ambiente esecutore la raggiunga).
  2. Diagnosi probabile da verificare: mock mancanti in `e2e/fixtures/api-mocks.ts` per API che la home ora chiama al mount (l'elenco dei mock si ferma a ~14 route; confronta con le fetch reali della home), oppure race sul tier-loading che lascia le card in stato disabled.
  3. Fixa la causa (mock o componente), NON allentare le assertion a11y: quelle proteggono i profili DSA.
  4. Se un singolo spec è genuinamente irreparabile in tempi brevi: `test.fixme()` + issue GitHub (policy flake del repo, `e2e/CLAUDE.md`), MA i test axe/persona DSA non si quarantinano senza issue motivata.
- **Accettazione:** run CI su `main` (o PR) con `e2e-tests` e `mobile-e2e` verdi; Deployment Gate verde end-to-end; `deploy-to-staging` esegue.

### T0.3 — Uptime monitor su produzione — **P1 · S · Sonnet**
- **Problema:** `/api/health` è chiamato solo post-deploy (`promote-to-production.yml:103`, `ci.yml:1971`); `infra-monitor.yml` è settimanale e non tocca la prod.
- **Passi:** aggiungi un workflow schedulato (ogni 5-10 min, `schedule:` cron) che fa GET su `https://mirrorbuddy.org/api/health` e manda email via Resend (pattern già in `infra-monitor.yml`) su fallimento; oppure configura un monitor esterno (Better Uptime / Vercel Monitoring) — in tal caso documentalo in `SETUP-PRODUCTION.md`.
- **Accettazione:** interruzione simulata (o health check su URL sbagliato in un test del workflow) produce una notifica.

### T0.4 — Correggere le bugie minori del CI — **P2 · S · Sonnet**
- `nightly-benchmark.yml` gira trimestralmente (`0 2 1 */3 *`), non nightly: correggi schedule o nome. Cron orfani senza schedule in `vercel.json`: `api/cron/hierarchical-summary`, `api/cron/waitlist-cleanup` → aggiungi schedule o rimuovi le route.
- **Accettazione:** ogni cron route ha schedule o non esiste; nomi workflow veritieri.

---

# FASE 1 — Safety per bambini: collegare ciò che esiste
*Obiettivo: chiudere il gap "defined-but-not-invoked". Ogni task qui produce anche un test d'integrazione che fallirebbe se il wiring regredisse. Modello consigliato: **Opus/Fable per tutti i task di questa fase** (safety-critical). Fai girare `npx tsx scripts/compliance-check.ts --category safety` prima e dopo per documentare che il check statico NON coglieva i gap (motivazione di T1.8).*

### T1.1 — Collegare l'intervento safety nel path vocale — **P0 · M**
- **Problema (doppia conferma):** `apps/web/src/lib/hooks/voice-session/event-handlers.ts:170-180` (transcript utente) e `:225-239` (transcript assistente) eseguono i check ma su flag/`reject` fanno solo `logger.warn/error` (commenti "T2-06 will wire"). `triggerSafetyIntervention` (`safety-intervention.ts:114`) è implementato, testato, mai chiamato. Un bambino che dice contenuti di crisi in voce, o il modello che produce contenuto rejected, non viene interrotto.
- **Passi:**
  1. In `event-handlers.ts`, caso `conversation.item.input_audio_transcription.completed`: se `safetyResult.actionTaken !== 'allow'` → chiama `triggerSafetyIntervention(...)` passando il data channel (`deps.webrtcDataChannelRef.current`), che deve fare `response.cancel` + iniettare messaggio di redirect + audit. Segui la firma esistente della funzione.
  2. Caso `response.output_audio_transcript.done`: se `actionTaken === 'reject'` → stop playback (pattern barge-in già presente a `:116-129`: `response.cancel`, clear audio queue, stop scheduled sources) + escalation ad admin audit.
  3. Collega l'escalation di crisi vocale allo stesso percorso della chat non-streaming (`escalateCrisisDetected` + `notifyParentOfCrisis` — vedi `app/api/chat/route.ts:294-342` come riferimento): serve probabilmente una route API chiamata dal client, perché il voice gira nel browser (valuta `POST /api/safety/escalate` con `withAuth`+`withCSRF`).
  4. Unit test sul nuovo wiring in `event-handlers` (mock del data channel, come i test esistenti in `__tests__/`) + test che il flusso NON scatta per `actionTaken === 'allow'`.
- **Accettazione:** test unit/integrazione verdi che dimostrano: transcript utente flaggato → `response.cancel` inviato sul data channel + redirect + audit; transcript assistente rejected → playback fermato + escalation. `npm run test:unit -- voice-session --reporter=dot` verde.

### T1.2 — Ripristinare l'escalation di crisi sul path chat streaming — **P0 · S**
- **Problema:** `app/api/chat/stream/route.ts:176` chiama `checkInputSafety(lastUserMessage.content)` **senza** il context; il blocco di escalation in `stream/helpers.ts:193-223` è gated su `if (... && context)` → sul path streaming: redirect sì, ma **niente notifica genitori né escalation**.
- **Passi:** passa `{ userId, conversationId, maestroId, locale }` alla chiamata in `stream/route.ts:176` (i valori sono già disponibili nello scope della route — verifica). Aggiungi un test d'integrazione: input con keyword di crisi sul path streaming → `escalateCrisisDetected` e `notifyParentOfCrisis` invocati (mock).
- **Accettazione:** test verde; parità di comportamento crisi tra `/api/chat` e `/api/chat/stream`. **Determina e documenta quale path usa la UI di default** (grep dei call-site client: `csrfFetch('/api/chat'` vs `'/api/chat/stream'`) — annotalo nel PR body.

### T1.3 — Parità safety sul path streaming: STEM + bias + sanitizer — **P1 · M**
- **Problema:** `checkSTEMSafety` (`chat/route.ts:357`) e `detectBias` (`:578-586`) esistono SOLO sul path non-streaming; lo streaming applica solo input-filter + `StreamingSanitizer`.
- **Passi:** esegui `checkSTEMSafety` sull'input in `stream/route.ts` prima di aprire lo stream (è un check sull'input: nessun problema di streaming). Per il bias sull'output streamato: applica `detectBias` + `sanitizeOutput` nel flush finale (o su buffer completo a fine stream con sostituzione dell'ultimo chunk se flaggato) — documenta il compromesso scelto.
- **Accettazione:** test: query STEM pericolosa → bloccata su entrambi i path; output con bias rilevato → non servito invariato sul path non-streaming (vedi T1.4).

### T1.4 — Il bias detection deve avere effetto, non solo log — **P1 · S**
- **Problema:** `chat/route.ts:578-586`: `detectBias` → solo `log.warn`, il contenuto arriva comunque al bambino.
- **Passi:** su `hasBias && !safeForEducation` → sostituisci con risposta rigenerata o messaggio di fallback educativo (esiste già pattern di redirect nel content filter). Mantieni il log per l'audit.
- **Accettazione:** unit test con output biased mockato → il bambino non lo riceve.

### T1.5 — Attivare il jailbreak detector nei request path — **P1 · M**
- **Problema:** `detectJailbreak` / `escalateRepeatedJailbreak` (in `lib/safety/jailbreak-detector/`) hanno **zero call-site** nei percorsi live.
- **Passi:** invoca `detectJailbreak` sull'input utente in `/api/chat`, `/api/chat/stream` e nel check transcript voce (`transcript-safety.ts`); su detection ripetuta, `escalateRepeatedJailbreak`. Attenzione ai falsi positivi con bambini: usa la soglia "obvious" (`isObviousJailbreak`) per il blocco duro e log-only per il resto, poi calibra.
- **Accettazione:** test con prompt-injection nota → redirect + evento audit; frase innocua di un bambino → passa.

### T1.6 — Blocco server-side dei minori sul checkout Stripe — **P1 · S**
- **Problema:** il grown-up gate è client-only (`grown-up-gate-state.ts:6-9`, sessionStorage + sfida aritmetica); `/api/checkout/route.ts:24-51` ha `withAuth` + kill-switch ma **nessun check età/consenso** → un account minore può POSTare `priceId` e ottenere una sessione Stripe.
- **Passi:** in `/api/checkout` e `/api/billing/portal`: verifica server-side che l'account non sia flaggato minore senza consenso genitoriale (il modello dati ha `CoppaConsent` — usa quello; in assenza di segnale, nega con 403 e messaggio che rimanda al genitore). Aggiorna i test della route.
- **Accettazione:** test: utente con profilo minore senza consenso → 403 su checkout; adulto/consenso → 200.

### T1.7 — Dashboard admin safety: leggere dal DB, non da buffer volatili — **P1 · M**
- **Problema:** `/api/admin/safety` legge array in-memory (`escalation-service.ts:43,272-281`; `compliance-audit-service.ts:26,233,284`) che su Vercel serverless si azzerano per istanza → la console di "human oversight" (Art. 14) mostra dati parziali/vuoti. I percorsi durevoli esistono già (`escalation/db-storage.ts`, tabella `ComplianceAuditEntry` usata correttamente da `/api/compliance/audit-log/route.ts:141`).
- **Passi:** ripunta le letture di `/api/admin/safety` alle fonti DB; mantieni i buffer come cache locale se utile. Verifica che le SCRITTURE persistano già su DB (se anche le scritture sono solo-buffer, collegale a `db-storage`).
- **Accettazione:** test API con Prisma mock: eventi scritti → visibili da una "istanza" pulita (nuovo import del modulo).

### T1.8 — `compliance-check.ts`: da presenza statica a verifica di wiring — **P1 · M**
- **Problema:** i check fanno `fileExists`/`fileContains` (`compliance-checks/safety-systems.ts:12-124`) → avrebbero dato PASS con T1.1/T1.2/T1.5 rotti. Alcuni path controllati sono stantii (es. `content-filter/patterns.ts` vs reale `content-filter-patterns.ts`) → possibili falsi PASS/FAIL.
- **Passi:** (1) correggi i path stantii; (2) aggiungi assertion di call-site: grep che `triggerSafetyIntervention` è invocato in `event-handlers.ts`, che `checkInputSafety` riceve context in `stream/route.ts`, che `detectJailbreak` ha call-site nei request path; (3) meglio ancora, aggiungi test d'integrazione vitest che importano le route e verificano il comportamento (i grep sono fallback).
- **Accettazione:** `npx tsx scripts/compliance-check.ts --category safety` fallisce se uno qualsiasi dei wiring di T1.1-T1.5 viene rimosso (dimostralo con un revert locale temporaneo).

### T1.9 — Consolidare i moduli safety "gemelli" — **P1 · M** *(struttura, prerequisito di manutenibilità della fase)*
- **Problema:** 4 moduli esistono in doppia copia con vincitori INCOERENTI: content-filter → flat vivo/subdir morto; age-gating → flat vivo/subdir morto; output-sanitizer → subdir vivo/flat morto; jailbreak-detector → subdir vivo/flat morto (~1.571 LOC morte; evidenza in `lib/safety/index.ts`). Chi fa manutenzione può editare il gemello morto di una guardrail per bambini.
- **Passi:** per ciascun modulo: identifica il vivo (dai barrel import di `safety/index.ts` + grep call-site), migra eventuali differenze utili dal morto, elimina il morto, ripunta i test. Rimuovi anche gli alias `_legacy` in `safety/index.ts` se i caller sono migrati.
- **Accettazione:** un solo file/dir per modulo; `npm run test:unit -- safety --reporter=dot` verde; grep dei nomi morti = 0.

### T1.10 — Collegare l'age-gating per fascia d'età — **P2 · M**
- **Problema:** `checkAgeGate`/`filterForAge` definiti+testati, mai chiamati; l'unico controllo runtime è il blocco COPPA <13.
- **Passi:** applica `getAgeGatePrompt`/`filterForAge` con l'età del profilo nel prompt-build di chat e voce (per la voce: `session-config.ts` assembla le instructions — aggiungi lì).
- **Accettazione:** unit test: stessa domanda, età diverse → prompt istruzioni diverse.

### T1.11 — Verifiche runtime safety (umano o agente con accesso prod) — **P0 (verifica) · S**
- [ ] `voice_transcript_safety` flag: ON in produzione? (Se OFF, la voce non ha NESSUN filtro contenuti — nemmeno log.) Con l'admin: `/admin` feature flags, o via DB.
- [ ] Quale path chat usa la UI (streaming o no) — determina la severità effettiva di T1.2 (comunque da fixare).
- [ ] `/api/admin/safety` mostra dati reali su istanza fredda (post T1.7).
- [ ] Tasso di `[decryption-failed]`: verifica `lib/security/key-rotation.ts` e aggiungi alert se il rate di decrypt-failure supera soglia (il placeholder silenzioso maschererebbe una rotazione chiavi errata — `pii-middleware.ts:190-196`).

### T1.12 — Allineare i documenti compliance alla realtà — **P2 · S · umano+agente**
- `POST-MARKET-MONITORING-PLAN.md:85,125,242` promette moderatori umani e dashboard realtime (← buffer volatili, T1.7); il doc classifica il sistema "limited-risk Art. 52" (`:13`) mentre `api/admin/safety/route.ts:5` cita Art. 14 high-risk. Per un prodotto educativo usato da minori la classificazione va decisa con consulenza legale (Annex III). Aggiorna i doc DOPO T1.7 e la decisione.

---

# FASE 2 — Accessibilità, i18n e fiducia per l'audience DSA
*Il sottoinsieme marcato **[GA-IT]** blocca il rilascio italiano; il resto blocca solo il multilingua.*

### T2.1 — TTS multilingua — **P0 (multilingua) · S · Sonnet**
- **Problema:** `components/accessibility/accessibility-provider.tsx:189-198`: `utterance.lang = "it-IT"` hardcoded + selezione voce solo italiana. I profili CP/visual auto-attivano TTS (`accessibility-store/profiles.ts:48,106`) → per bambini en/fr/de/es la feature assistiva primaria è inutilizzabile.
- **Passi:** passa il locale attivo (`useLocale()` di next-intl) in `speak()`; seleziona la voce per prefisso `lang`; fallback ragionevole se nessuna voce disponibile. Unit test del mapping locale→lang.
- **Accettazione:** test verdi; verifica manuale su 2 locale.

### T2.2 — [GA-IT] Mantenere la promessa "i genitori vedono" — **P0 · decisione + M · Opus**
- **Problema:** il safety prompt dice al bambino *"Tutto ciò che scriviamo qui è visibile ai tuoi genitori nella dashboard"* e *"Non posso mantenere segreti dai tuoi genitori"* (`lib/safety/safety-prompts-core.ts:220-222`), ma la parent dashboard (`app/[locale]/parent-dashboard/`, `components/profile/parent-dashboard/`) mostra solo aggregati (sessioni, quiz, streak, strategie, crisis alert) — **nessun transcript**. Promessa di sicurezza falsa = difetto di fiducia, e un deterrente anti-segretezza che il bambino può scoprire essere finto.
- **Decisione per il maintainer (scegliere UNA):**
  - **(a)** Aggiungere vista conversazioni/transcript alla parent dashboard (più forte per la safety; attenzione privacy-by-design: solo account genitore verificato).
  - **(b)** Ammorbidire il copy del prompt: "un adulto di fiducia può vedere un riassunto di ciò di cui parliamo" (più rapido; coerente con ciò che la dashboard fa davvero).
- **Passi (per (b), il default se non deciso):** aggiorna §8.3 in `safety-prompts-core.ts` (e gemelli, post T1.9); aggiorna i test safety che citano il copy.
- **Accettazione:** copy e realtà coincidono; test aggiornati verdi.

### T2.3 — [GA-IT] Error copy child-friendly + namespace `errors` risanato — **P1 · M · Sonnet**
- **Problemi:** (1) copy tecnico-adulto anche in IT ("Timeout richiesta", "Non autorizzato" — `messages/it/errors.json:3-9`); (2) struttura corrotta in tutte le locale: chiavi generiche annidate DENTRO `validation` (`it/errors.json:29-49`, con "Not Found" inglese dentro l'IT); (3) `de/errors.json` in gran parte inglese con perfino un residuo italiano (`"clear":"Cancella"`).
- **Passi:** risana la struttura (sposta le chiavi mal annidate; rispetta ADR 0104 wrapper key e ADR 0091 camelCase); aggiungi varianti child-tone per gli errori child-facing ("Ops! Qualcosa non ha funzionato. Riproviamo insieme?") e usale nei componenti child-space; completa il tedesco; `npx tsx scripts/i18n-sync-namespaces.ts --add-missing` → `npm run i18n:check`.
- **Accettazione:** `npm run i18n:check` verde; grep di "Not Found" nei json IT = 0; screenshot (o test) di un errore chat child-space con il nuovo copy.

### T2.4 — Sweep `[TRANSLATE]` + parity namespace `voice` — **P1 · S · Sonnet**
- **Problemi:** `messages/fr/home.json` → `"requestFullAccess":"[TRANSLATE] Clicca..."` visibile in UI francese. `it/voice.json` ha 115 chiavi vs 125 delle altre locale: mancano 9 sotto-namespace (`accessibility, chatUI, confirmations, errors, help, permission, settings, status, trialLimits`) — o l'IT (locale default!) è bucato a runtime, o le altre 4 hanno chiavi orfane. E il pre-commit `i18n:check` non l'ha colto: capire perché.
- **Passi:** grep `\[TRANSLATE\]` su tutto `messages/` e traduci; riconcilia `voice.json` (determina con grep dei call-site `useTranslations('voice')` quali chiavi sono referenziate); investiga e fixa il buco di `i18n:check` (probabile che confronti solo le chiavi presenti in IT → le eccedenze delle altre locale non fanno fallire: aggiungi check bidirezionale).
- **Accettazione:** zero `[TRANSLATE]`; parity 5-locale su `voice`; `i18n:check` esteso che fallisce su chiavi orfane (dimostralo).

### T2.5 — [GA-IT] Date/orari localizzati (e conformi alle regole del repo) — **P2 · S · Sonnet**
- `components/profile/parent-dashboard/recent-sessions-list.tsx:22-25` ("Oggi"/"Ieri"/`toLocaleDateString("it-IT")`) e `components/chat/shared/message-bubble.tsx:122` (`toLocaleTimeString('it-IT')`) → usa `useFormatter()` di next-intl. Verifica perché la regola ESLint `no-hardcoded-italian` non li becca (stringhe in TS non-JSX?) e, se possibile, estendila.
- **Accettazione:** lint + test verdi; nessun `it-IT` hardcoded nei componenti UI.

### T2.6 — Profili DSA mutuamente esclusivi allo switch — **P1 · S · Opus**
- **Problema:** `lib/accessibility/accessibility-store/profiles.ts`: ogni `apply*Profile` fa spread dei settings correnti senza azzerare i flag del profilo precedente → ADHD poi Visual = stato sovrapposto imprevedibile che nessun profilo descrive. Per bambini autistici/ADHD la prevedibilità È la feature.
- **Passi:** reset a `defaultAccessibilitySettings` prima di applicare il profilo (preservando esplicitamente le preferenze utente non-profilo, es. `voicePreference` se voluto — decidi e documenta); unit test: ADHD→Visual non lascia `adhdMode`/`distractionFreeMode` attivi.
- **Accettazione:** test dello store verdi (`npm run test:unit -- accessibility --reporter=dot`).

### T2.7 — Onboarding: "salta e prova subito" — **P2 · M · Opus**
- **Problema:** 5 step vocali sequenziali (welcome→info→principles→maestri→ready, `lib/stores/onboarding-types.ts:26-32`) con redirect forzato (`page.tsx:56-60`); solo `info` è skippabile. Latenza-al-valore alta proprio per i profili ADHD.
- **Passi:** aggiungi CTA "Salta e prova subito" dal primo step che porta alla home intent con defaults sicuri (profilo minimale, onboarding riprendibile dopo); rendi `principles`/`maestri` opzionali. Coordina col flusso Melissa (`create-onboarding-melissa.ts`).
- **Accettazione:** E2E: nuovo utente → home intent in ≤2 interazioni; onboarding riprendibile da settings.

### T2.8 — `syncWithSystem` reale + suggerimento profilo — **P2 · M · Sonnet**
- `lib/accessibility/browser-detection.ts:41-57` mappa solo reduced-motion/contrast; `syncWithSystem()` è uno stub vuoto (`accessibility-provider.tsx:128-137`). Implementa il sync e un nudge non invasivo al primo accesso ("Ho notato che preferisci meno animazioni — vuoi il profilo calmo?").
- **Accettazione:** unit test del mapping; nudge dismissibile e ricordato (no localStorage: cookie/DB come da regole).

---

# FASE 3 — Correttezza del core educativo
*Feature promesse che oggi mentono silenziosamente.*

### T3.1 — Persistere il progresso flashcard (FSRS) — **P1 · M · Opus**
- **Problema:** il review flow salva l'intero deck come JSON in `/api/materials` (`components/education/flashcards-view/hooks/use-flashcards-view.ts:97-110,122-154`) e non scrive MAI `FlashcardProgress` → `api/scheduler/check-due/route.ts:76-84` (notifiche push "Flashcard pronte!") e `api/dashboard/fsrs-stats/route.ts:25-89` (analytics admin) girano su tabella vuota per sempre.
- **Passi:** dal review flow, POST per-card a `/api/flashcards/progress` (route già esistente e inutilizzata) oltre al salvataggio materiale; oppure (alternativa documentata) ripunta scheduler+dashboard allo store materiali. Prima opzione preferita: la tabella è progettata per questo.
- **Accettazione:** test d'integrazione: review di 3 carte → 3 righe `FlashcardProgress` (Prisma mock); scheduler con carta due → notifica candidata.

### T3.2 — Un solo FSRS — **P1 · M · Opus**
- **Problema:** due implementazioni divergenti: `packages/education/src/fsrs/core.ts` (documentata in CLAUDE.md, morta a runtime) vs `components/education/flashcards-view/utils/fsrs.ts:17` (`fsrs5Schedule`, quella vera).
- **Passi:** scegli FSRS-5 (la live); sposta/consolida in `@/lib/education/fsrs` (o nel package se si decide la direzione package-first, vedi T4.3); elimina la morta; aggiorna CLAUDE.md; i test della morta migrano sulla viva.
- **Accettazione:** un'unica implementazione; grep dell'altra = 0; test verdi.

### T3.3 — Renderer mancanti: timeline live + tool canvas completo + calculator archive — **P1 · M · Sonnet**
- **Problemi:** timeline → JSON grezzo in chat inline (`components/tools/tool-content-renderers.tsx:73-141`, manca il case) e nel tool canvas (`tool-canvas/components/tool-renderer.tsx:121-131` fall-through); il canvas copre solo 5 tipi (mancano chart, formula, calculator, demo, timeline); calculator senza renderer archive (`knowledge-hub/renderers/index.tsx:52-84` senza chiave `calculator`) e senza plugin (`plugins/index.ts`).
- **Passi:** aggiungi i case mancanti riusando i renderer esistenti (TimelineRenderer è già usato dall'archive: `renderers/index.tsx:69`); aggiungi `calculator` a `rendererImports`; valuta plugin calculator (bassa priorità, esegue già via Map-shim `tool-executor.ts:137`).
- **Accettazione:** unit/snapshot test per ogni tipo nel canvas e nella chat inline: nessun tipo registrato renderizza JSON grezzo. E2E dove possibile.

### T3.4 — Parità RAG voce/chat — **P1 · M · Opus**
- **Problema:** la chat inietta memoria + RAG maestro-knowledge (`app/api/chat/context-builders.ts:7,12-14,219`); la voce solo summary/keyFacts (`lib/hooks/voice-session/memory-utils.ts:36-110`) → in voce il maestro non è grounded sul suo mini-KB/RAG.
- **Passi:** nel builder delle instructions voce (`session-config.ts`, fetch parallela già presente a T1-10 style), aggiungi una chiamata a una route che espone `retrieveMaestroKnowledge` per subject/argomento corrente (attenzione al budget di lunghezza instructions — c'è già un limite; tronca con priorità al safety). Se il costo/latency non vale: documenta la divergenza intenzionale in CLAUDE.md e chiudi.
- **Accettazione:** log/test che mostrano il KB nel prompt voce; latenza connessione voce non peggiorata oltre soglia (usa i timing log già presenti).

### T3.5 — Mini-KB coerenti per tutti i maestri — **P2 · S · Sonnet**
- `cassese.ts`, `ippocrate.ts`, `lovelace.ts`, `simone.ts` non interpolano il proprio `*_MINI_KB` (pattern corretto: `curie.ts:7,87`); `mascetti` registrato ma i suoi asset KB si chiamano `amici-miei-*` (orfani). Interpola i 4; rinomina/collega gli asset mascetti.
- **Accettazione:** test di consistenza (già esiste una suite characters in compliance-check: `--category characters`) verde; grep: ogni maestro con mini-kb file lo importa.

### T3.6 — Data-retention: cron vero, service stub — riconciliare — **P2 · M · Opus**
- **Stato contraddittorio:** `api/cron/data-retention/route.ts` è reale e multi-fase (audit safety), ma `lib/privacy/data-retention-service.ts:13` si autodefinisce stub (mancano migrazioni: UserPrivacyPreferences, `markedForDeletion`, modello Embedding). Chiarisci cosa copre il cron e cosa lo stub avrebbe dovuto aggiungere; implementa il delta o rimuovi lo stub e aggiorna i claim F-02 nei doc.
- **Accettazione:** nessun modulo che si dichiara stub in produzione; doc compliance coerenti.

---

# FASE 4 — Igiene del codice e del repo
*Tutta roba a rischio zero di regressione funzionale, alto valore di manutenibilità. Modello: Sonnet. Ideale come primo gruppo di PR per "scaldare" l'esecutore.*

### T4.1 — Eliminare le varianti UI morte (4.102 LOC) — **P1 · S**
- 12 file `maestro-session-*` (v1-v4, proposal1/2, header+session) + `header-variants/` (a-e) + `PROPOSALS_README.md`: referenziati solo dal README. Il vivo è `maestro-session.tsx` (importato da `maestro-session-page.tsx:4`, `home-lazy.tsx`).
- **Accettazione:** `npm run ci:summary` verde; grep dei nomi eliminati = 0 (fuori da git history).

### T4.2 — Archiviare gli orfani: `backend/`, `testingcase/`, `reports/` stantio — **P1 · S**
- `backend/` (FastAPI azure_costs, zero referenze da web), `testingcase/` (6 script Python PDF standalone), `reports/route-inventory.json` (generato 2026-01-19, obsoleto). Sposta in `docs-archive/` o elimina (decisione maintainer: proponi eliminazione, il git history conserva). Se `backend/` serve a qualcuno fuori repo, documentalo in README prima di toccarlo — chiedi al maintainer.
- **Accettazione:** root del repo senza directory morte non documentate.

### T4.3 — Decidere la direzione dei workspace packages — **P1 · decisione + L**
- 7/14 packages mai importati dal web (`maestri, safety, tier, ai-providers, accessibility` + parte di `db`) e DUPLICANO logica viva in `apps/web/src/lib/*`. Due copie di logica safety/tier = rischio di editare quella morta (già successo coi gemelli safety).
- **Opzioni:** (a) migrare web a consumare i packages (grosso, ma pulito per un futuro multi-app); (b) archiviare i package-shell e dichiarare `apps/web/src/lib` come home (rapido, onesto per una single-app). **Raccomando (b) fino a quando non esiste una seconda app.**
- **Accettazione:** una sola copia per dominio; CLAUDE.md aggiornato.

### T4.4 — Route igiene: endpoint ritirati e debug — **P2 · S**
- Elimina `api/embeddings/route.ts` (stub "retired", unico mutante senza `pipe()`); verifica che `debug/`, `debug-cert/`, `debug-env/`, `test/` siano env-gated OFF in prod (o eliminali).
- **Accettazione:** grep + test; nessuna route debug raggiungibile in prod build.

### T4.5 — Hardening route pubbliche mutanti — **P1 · M · Opus**
- `homework/analyze/route.ts:24` e `search/route.ts:96` (POST con solo `withSentry`), più `contact`, `waitlist/signup`, `realtime/sdp-exchange`: verifica UNA per UNA che abbiano `withRateLimit` + validazione input (Zod); aggiungi dove manca. Estendi `compliance-check --category api` per asserire: ogni route mutante ha auth O (rate-limit + validazione) O firma webhook O cron secret. Verifica anche i 33 senza CSRF elencabili con grep (la maggior parte esente legittimamente — documenta le esenzioni nel check).
- **Accettazione:** `npx tsx scripts/compliance-check.ts --category api` esteso, verde, e che fallisce se una route mutante nuda viene aggiunta (dimostralo).

### T4.6 — Config igiene — **P2 · S**
- Aggiungi `engines.node` a package.json; correggi il pin pnpm `lodash 4.18.1` (versione inesistente upstream — verifica resolution con install pulita) e verifica gli altri pin "futuristici" (`vite 8.0.16`, `eslint-plugin-react-hooks 7.0.1`); aggiungi `SENTRY_DSN` a `.env.example`; decidi sul limite file-line (245 violazioni del limite 250: o si applica in CI su nuovi file soltanto, o si alza a un valore onesto — proponi: enforcement solo su file nuovi/toccati).
- **Accettazione:** install pulita OK; `validate-pre-deploy.ts` aggiornato se necessario.

### T4.7 — Refactor dei top-5 file monstre — **P2 · L · Opus** *(post-GA)*
- `lib/tier/tier-service.ts` (713), `app/api/chat/route.ts` (711), `lib/admin/user-trash-service.ts` (700), `lib/email/campaign-service.ts` (650), `lib/safety/audit/compliance-audit-service.ts` (630). Split per responsabilità, zero cambi di comportamento, test invariati prima/dopo.

---

# FASE 5 — Observability e performance con i denti
*Modello: Sonnet, tranne T5.1.*

### T5.1 — Collegare l'alerting a un canale reale — **P1 · M · Opus**
- `lib/alerting/go-nogo-alerting.ts` calcola go/no-go ma non spedisce nulla (campi `webhookUrl`/`emailRecipients`/`slackChannel` in `types.ts:75-77` inutilizzati; history in-memory max 500). Implementa un notifier (Resend è già in stack per `infra-monitor.yml`; o Slack webhook) con dedupe/rate-limit degli alert; oppure elimina i campi morti e documenta che l'alerting è demandato a Sentry+uptime (T0.3). Decidi in coerenza con T1.11 (alert su decrypt-failure) e T1.7.
- **Accettazione:** alert di test recapitato al canale scelto; runbook in `docs/`.

### T5.2 — Budget di performance reali in CI — **P1 · S**
- `bundlewatch.config.json` (limiti 250/50/150KB) non è mai invocato; il job CI fallisce solo su singolo chunk >2MB (`ci.yml:1639-1646`); `lhci autorun || echo` (`ci.yml:1684`) non può fallire. Aggiungi step `bundlewatch` reale; rimuovi il `|| echo` (gate sulle assertion di `lighthouserc.js`). Se all'attivazione i budget sono già sforati: prima tara i budget ai valori attuali+10%, poi stringi.
- **Accettazione:** PR che gonfia artificialmente un bundle fallisce il CI (dimostralo e reverta).

### T5.3 — Sentry: sampling e triage — **P1 · S + accesso**
- `tracesSampleRate: 1.0` client+server e `replaysOnErrorSampleRate: 1.0` esauriranno la quota a scala: porta a 0.1-0.2 con `tracesSampler` che tiene 1.0 su route critiche (voice, chat, checkout). **Triage errori prod:** richiede `SENTRY_AUTH_TOKEN` read-only (org `fightthestroke`, project `mirrorbuddy`) — task esplicitamente bloccato su credenziale dal maintainer; quando disponibile: esporta top-20 issue per volume, classifica (bug reale / rumore / già fixato da #449-#452), apri task puntuali.
- **Accettazione:** sampling deployato; report di triage in `docs/plans/` con issue GitHub per i bug reali.

---

# FASE 6 — Traccia mobile/iOS (post-GA web)

### T6.1 — Info.plist: permessi microfono/camera — **P0(mobile) · S · Sonnet**
- `ios/App/App/Info.plist` NON contiene `NSMicrophoneUsageDescription` né `NSCameraUsageDescription` (grep=0) → `getUserMedia` fallisce silenzioso in WKWebView e Apple rigetta. Aggiungi le purpose string (in italiano+inglese, child-appropriate: "MirrorBuddy usa il microfono per farti parlare con i professori").
- **Accettazione:** `npm run ios:check` verde; plist contiene le chiavi.

### T6.2 — Backend per la shell nativa — **P0(mobile) · M · Opus**
- `next.config.mobile.ts:19` è `output:'export'` ed esclude i route handler (`:22-40`); `capacitor.config.ts:7-11` ha `server.url` commentato; nessuna base URL assoluta nel layer fetch → nell'app nativa TUTTE le API 404ano. Scegli: (a) `server.url` → prod (shell remota, più semplice, richiede rete); (b) base `NEXT_PUBLIC_APP_URL` per le fetch quando `Capacitor.isNativePlatform()`. Poi verifica cookie/CSRF cross-origin (le API usano cookie httpOnly: servirà `credentials: 'include'` + CORS o la shell remota (a) che li evita).
- **Accettazione:** app su simulatore: login, chat, un tool E2E.

### T6.3 — Voce su iOS reale + submission — **P1(mobile) · L · umano+Opus**
- WebRTC/getUserMedia in WKWebView: fattibile su iOS moderno ma da verificare SU DISPOSITIVO (nessun modo statico). Poi: `ios-release-check.sh` fixato per il version-check off-macOS (`:66`, `$(MARKETING_VERSION)` letterale), fastlane, store-metadata review, TestFlight.

---

## Verifiche manuali richieste al maintainer (non automatizzabili da qui)

| # | Cosa | Dove | Perché |
|---|------|------|--------|
| V1 | Production Branch + Ignored Build Step | Vercel → Settings → Git | Conferma P0 T0.1 (gate decorativo) |
| V2 | Ultimo deployment Production = `main` di oggi? | Vercel → Deployments | Conferma che #449/#452 sono live |
| V3 | Flag `voice_transcript_safety` ON in prod | /admin feature flags o DB | Se OFF: voce senza alcun filtro (T1.11) |
| V4 | Token Sentry read-only | sentry.io org fightthestroke | Sblocca T5.3 (triage errori prod) |
| V5 | Quota Sentry attuale | sentry.io | Dimensiona T5.3 sampling |
| V6 | Monitor uptime esterno esistente? | provider/dashboard | Evita doppione con T0.3 |
| V7 | Decisione T2.2 (transcript genitori vs copy) | — | Sblocca T2.2 |
| V8 | Decisione T4.3 (packages: consumare o archiviare) | — | Sblocca T4.3 |
| V9 | DEC-06: `maestriLimit` deprecare o enforce | `.claude/rules/tier.md` | Debito decisionale aperto nel repo |
| V10 | Classificazione AI Act (limited vs high-risk) con legale | docs/compliance | Incoerenza doc vs codice (T1.12) |

---

## Sequenza consigliata e stima

| Fase | Contenuto | Effort totale stimato | Gate |
|------|-----------|----------------------|------|
| 0 | Deploy integrity + E2E verde + uptime | ~3-5 giorni-agente | Blocca GA |
| 1 | Safety wiring completo | ~6-9 giorni-agente | Blocca GA |
| 2 (IT) | T2.2, T2.3, T2.5, T2.6 | ~3-4 giorni-agente | Blocca GA-IT |
| 4 (quick) | T4.1, T4.2, T4.4, T4.6 | ~2 giorni-agente | Consigliato pre-GA |
| **→ GA web IT-first** | | **~2-3 settimane-agente** | |
| 2 (resto) | TTS multilingua, [TRANSLATE], voice parity, onboarding | ~4 giorni | Multilingua |
| 3 | FSRS, renderer, RAG voce, mini-KB | ~6-8 giorni | Qualità prodotto |
| 5 | Alerting, perf gates, Sentry | ~3 giorni | Robustezza |
| 4 (resto) | Packages, refactor monstre | ~1-2 settimane | Manutenibilità |
| 6 | iOS | ~1-2 settimane + device | Store |

Parallelizzabile: Fase 0 e Fase 1 su worktree separati; Fase 4-quick in qualsiasi momento.

---

## Appendice A — Stato verificato in questa sessione (non ripetere questo lavoro)

- **Fix già mergiati su `main`:** #449 (voce: `capture_homework` senza handler ammutoliva il maestro; foto compiti ora inviata come `input_image`; recovery `function_call_output` su qualsiasi eccezione del tool handler), #452 (persona: `GREETING_PERSONA_DIRECTIVE` per-locale + guardia in `buildCharacterInstruction` — il maestro si presenta col suo nome, niente "compagno di viaggio senza occhi né mani"), #453 (rimozione spec E2E `/coming-soon` morti — verificare che sia mergiata, era in auto-merge).
- **Il rumore `duplicate key User_pkey` nei log Postgres dei job E2E è GESTITO** (`session-auth.ts` upsert + P2002 catch + refetch): non è la causa dei fallimenti E2E, non "fixarlo".
- **CI del repo:** 3 retry Playwright + wrapper retry già presenti; `trace: on-first-retry`; gli spec falliti sopravvivono ai retry (non flake). Nessun artifact con report Playwright viene caricato: valuta di aggiungere `reporter: [['html']]` + upload artifact nel job E2E (aiuterà T0.2).
- **Sandbox limits incontrati:** `binaries.prisma.sh` e `mirrorbuddy.org` bloccati dall'egress della sessione remota — l'esecutore di questo piano deve avere rete per `prisma generate` e Playwright.

## Appendice B — Cose sane da NON toccare (conferme degli audit)

Crittografia PII (pii-middleware) · scrubbing RAG (privacy-aware-embedding) · GDPR delete/export · cron `withCron` fail-closed · gamification loop · learning-path e method-progress (vivi) · buddy/coach (vivi, non leftover) · env hygiene (91 var documentate, solo `SENTRY_DSN` mancante) · rate-limit fail-closed in prod · home intent chooser (design a11y solido) · separazione spazio bambino/adulto con grown-up gate (lato UI).
