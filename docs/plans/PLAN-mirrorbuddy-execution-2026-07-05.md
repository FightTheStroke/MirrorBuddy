# PLAN — Esecuzione debito residuo MirrorBuddy (2026-07-05)

**Autore:** Claude (Opus 4.8) — sessione delega-totale sul registro del debito.
**Mandato:** Roberto ha delegato TUTTE le decisioni di prodotto/architettura/priorità, incluse quelle ad alto rischio. Questo documento **decide** — non lascia domande aperte, salvo i pochissimi item genuinamente bloccati su un'azione esterna irreversibile (spesa reale, email a utenti reali, restore su DB di produzione, firma legale). Quelli sono elencati esplicitamente in fondo.
**Sorgenti:** `PLAN-mirrorbuddy-release.md` (Appendice D, 73 voci), `AI-ACT-REMEDIATION-TRACKER.md` (P0/P1/P2), verifica a codice fatta in sessione.

## Linea di delega (come ho interpretato il mandato)

Decido la **postura ingegneristica e la roadmap**; NON emetto la conclusione legale. Es.: per l'AI Act decido che il codice smette di autodefinirsi Art. 14 e che i documenti si uniformano alla postura "alto rischio prudenziale" — ma la classificazione formale resta gate legale. Per il watermark decido _defer con motivazione + trigger di riapertura_; per la verifica età decido _mantenere il grown-up gate come mitigazione dichiarata_. La firma legale/Go-No-Go e le operazioni irreversibili su dati/denaro reali restano umane.

## Nota di metodo — attendibilità dello stato

Ogni cluster dichiara se lo stato è **[VERIFICATO]** (grep/lettura fatti ora) o **[DA TABELLA]** (mi fido del registro; l'esecutore riverifica prima di editare).

**Correzione post-scrittura (2026-07-05, verificata da un secondo passaggio a codice contro `origin/main` aggiornato):** questo documento, come scritto dall'agente Opus di consolidamento, conteneva due errori fattuali, entrambi dovuti a un checkout locale non aggiornato al momento dell'analisi:

1. **C1 (D-70/D-71/D-72) era già RISOLTO**, non aperto. `git log origin/main` conferma PR #504 (D-70/D-71, commit `7bb42964`) e PR #506 (D-72, commit `e06fbc84`) già mergiate. `prisma.config.ts` legge già `DEV_DATABASE_URL` con precedenza; il contrasto colore su "Fare i compiti" era un falso positivo di timing axe (Framer Motion, non un bug di contrasto reale — confermato dallo screenshot post-fallimento); l'hreflang su `/terms` era un altro falso positivo di timing (`waitForTimeout` fisso vs `useEffect` post-idratazione). Nessuna azione residua su C1 — **saltare interamente**.
2. **C2 è fattualmente sbagliato nella sua premessa "traffico reale".** Verificato: `getActiveProvider()` in `apps/web/src/lib/ai/providers/config.ts` (il vero selettore usato da `/api/chat`) ha logica "Azure se configurato, altrimenti Ollama" — **Claude non compare in questo percorso**. `AIProviderRouter`/`router.ts` (con `ClaudeProvider` nel `fallbackOrder`) è un modulo separato il cui unico consumer reale è `checkAllHealth()` in `/api/health/ai-providers` — non instrada mai traffico di generazione reale. La raccomandazione di rimuovere `ClaudeProvider` da `router.ts` resta valida (è comunque un'inadempienza documentale/dead-code da chiudere, ed è comunque prudente non lasciarlo lì), ma la cornice "gap di compliance live, elevato a P0" è sovrastimata — declassare a P2 originale, stessa priorità/effort ma senza l'urgenza "M1-blocking" attribuita sopra.

---

## Ordine di priorità dei cluster (rischio reale → sforzo → dipendenze)

| #       | Cluster                                                                  | Blocca            | Rischio          | Effort | Modello                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------ | ----------------- | ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~C1~~  | ~~Bug verificati ship-first (D-70, D-71, D-72)~~                         | —                 | —                | —      | **GIÀ RISOLTO — PR #504/#506 già mergiate, saltare**                                                                                                          |
| ~~C2~~  | ~~Cleanup codice: rimuovere provider Claude morto da router.ts (P2-4)~~  | —                 | —                | —      | **GIÀ RISOLTO — `claude.ts`/`ClaudeProvider` rimossi, router.ts solo Azure+Ollama. Reperto collaterale D-74 (Ollama mai registrato) tracciato separatamente** |
| C3      | Onboarding capture + age-gating knot (D-22, D-73) — **eseguire dopo C6** | M1                | Alto             | M      | Opus                                                                                                                                                          |
| C4      | Safety parity streaming (D-06, D-08 resto)                               | M1                | Alto             | M      | Opus                                                                                                                                                          |
| C5      | Compliance docs alignment (D-51, P0-3, P1-1..7, P2-3)                    | Messa in servizio | Alto (doc)       | M      | Opus                                                                                                                                                          |
| C6      | Funnel/landing consolidation (D-19..21,23..28)                           | M1                | Medio            | L      | Opus+Sonnet                                                                                                                                                   |
| C7      | Education core correctness (D-29..34)                                    | M1                | Medio            | L      | Opus+Sonnet                                                                                                                                                   |
| C8      | i18n/locale UX (D-12,14,15,16)                                           | M1(IT)+M2         | Medio            | M      | Sonnet                                                                                                                                                        |
| C9      | Accessibility behavior (D-17,18,52)                                      | M1                | Medio            | M      | Opus+Sonnet                                                                                                                                                   |
| C10     | Parent-visibility honesty (D-13)                                         | M1                | Medio            | S      | Opus                                                                                                                                                          |
| C11     | Dead-code purge (D-36,37,39,58,66,38)                                    | qualità           | Basso            | L      | Sonnet+Opus                                                                                                                                                   |
| ~~C12~~ | ~~Tier cleanup DEC-06 (D-35)~~                                           | —                 | —                | —      | **GIÀ RISOLTO — ADR 0168, `maestriLimit`/`maxMaestri` rimossi ovunque. Reperto collaterale D-75 (2 script seed duplicati) tracciato separatamente**           |
| C13     | Route hardening + config hygiene (D-40,41,42,43)                         | sicurezza         | Medio            | L      | Opus+Sonnet                                                                                                                                                   |
| C14     | Observability & ops (D-44,45,46,47,48,53,54)                             | rilascio          | Medio            | M      | Opus+Sonnet                                                                                                                                                   |
| C15     | Alto-rischio prodotto: watermark + age-verify (P2-1, P2-2)               | compliance        | Alto (decisione) | S      | Opus                                                                                                                                                          |
| C16     | Release-readiness ops (D-55, D-56) — human-gated                         | rilascio          | Alto (prod)      | M      | umano+Sonnet                                                                                                                                                  |
| C17     | Mobile post-M1 (D-49, D-50)                                              | M3                | Medio            | L      | Opus+Sonnet                                                                                                                                                   |
| C18     | Needs-scoping/human (D-67, D-68, TC.3)                                   | —                 | —                | —      | vedi sotto                                                                                                                                                    |

---

## C1 — Bug verificati, ship-first

**Voci:** D-70, D-71, D-72. **Stato:** [VERIFICATO] tutti e tre **APERTI e reali** (il brief li dava per risolti/falsi-positivi: sbagliato).

- **D-72 — `prisma.config.ts` ignora l'override locale.** Confermato: `effectiveUrl = process.env.DIRECT_URL || databaseUrl`, `databaseUrl = process.env.DATABASE_URL || …`. Nessuna precedenza a `DEV_DATABASE_URL`. Chiunque lavori in un worktree con DB locale può colpire il Supabase condiviso (near-miss già registrato). **Priorità #1 assoluta.**
  - **Azione:** in `prisma.config.ts` far vincere l'env locale: `const url = process.env.DEV_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL`. Test: con `DEV_DATABASE_URL` esportato, `effectiveUrl` = quello locale. Aggiornare commento e `CLAUDE.md` §Local Postgres.
  - **Modello:** Sonnet. **Rischio/reversibilità:** basso, reversibile. Riduce un rischio di _distruzione dati prod_ → fare per primo.
- **D-70 — Contrasto insufficiente card home "Fare i compiti".** [VERIFICATO] `src/app/[locale]/home-intent-chooser.tsx` (ultimo commit `31cc7e29`, 2026-06-12, non toccato in sessione) usa coppie `text-slate-600 dark:text-slate-300` ecc. Il registro riporta 1.37–1.55:1 in light mode. È la **prima schermata del bambino** per un'audience DSA → priorità alta.
  - **Azione:** far girare axe (`home-intent-a11y.spec.ts`, `home-intent-dsa-a11y.spec.ts`) per isolare le classi che falliscono; scurire i token light (`text-slate-600`→`text-slate-700`, verificare bg card) fino a ≥4.5:1; non toccare i pairing `dark:`. Screenshot before/after.
  - **Modello:** Sonnet (bug meccanico ma con verifica axe). **Rischio:** basso, reversibile.
- **D-71 — hreflang mancante su `/terms`.** [VERIFICATO] esistono sia `src/app/terms/page.tsx` sia `src/app/[locale]/terms/page.tsx`; grep non trova `alternates/languages` nel secondo. Le altre pagine dello spec passano → bug localizzato.
  - **Azione:** aggiungere `alternates.languages` in `generateMetadata` di `[locale]/terms/page.tsx` copiando il pattern di una pagina che passa (es. privacy); verificare che la route `src/app/terms/` senza locale non sia un doppione morto (se lo è, confluisce in C11).
  - **Modello:** Sonnet. **Rischio:** basso.

---

## C2 — Gap di compliance nel codice: disattivare il provider Claude

**Voce:** AI-Act **P2-4**. **Stato:** [VERIFICATO, corretto post-scrittura] — la bozza originale di questo cluster affermava che il router seleziona Claude "per traffico reale di generazione" quando Azure è down. **Verificato falso**: il vero selettore usato da `/api/chat` è `getActiveProvider()` in `apps/web/src/lib/ai/providers/config.ts`, con logica "Azure se configurato, altrimenti Ollama" — Claude non compare in questo percorso. `AIProviderRouter`/`router.ts` (con `ClaudeProvider` nel `fallbackOrder`) è un modulo separato il cui unico consumer reale è `checkAllHealth()` in `/api/health/ai-providers` — non instrada mai traffico di generazione. **Resta comunque debito reale da chiudere** (dead code + contraddizione con `.env.example` "Never use Anthropic"), ma è igiene/P2, non un gap di compliance live.

- **DECISIONE:** **Rimuovere** (unwire), non cablare. Cablare imporrebbe: aggiungere Anthropic come sub-processor in DPIA/DATA-FLOW, un parere legale, e ribaltare un divieto esplicito già scritto. Nessuna di queste è giustificata per un semplice fallback.
- **Azione:** togliere `"claude"` da `fallbackOrder` (→ `["ollama"]`), rimuovere `this.providers.set("claude", …)` e l'import; rimuovere `"claude"` dai type union se non usato altrove; eliminare `providers/claude.ts` (o lasciarlo con `@deprecated` + nessun import — preferisco eliminarlo per debito zero). Aggiornare i doc P2-4 (DATA-FLOW, MODEL-CARD, LEGAL-REVIEW) a "Azure primario + Ollama fallback, unici processori attivi". Test: `selectProvider` con Azure down → Ollama, mai Claude.
- **Tradeoff dichiarato:** con Azure down il fallback diventa **solo Ollama** (locale). Accettabile: Ollama copre già il fallback; Claude non era mai stato validato per traffico minori.
- **Modello:** Opus (tocca superficie AI + compliance). **Rischio/reversibilità:** medio, reversibile (git revert), ma è una _riduzione_ di rischio → procedere.

---

## C3 — Onboarding capture + age-gating (il nodo falso-verde)

**Voci:** D-22 (TJ.4), D-73. **Dipendenza critica con T1.10/D-10 (age-gating), marcato RISOLTO.** **Stato:** [VERIFICATO] esistono `onStartWithVoice`/`onStartWithoutVoice` in `quick-start.tsx` e `onSkip`/`hasCompletedOnboarding` nel flusso; esiste anche un **doppione** `src/app/welcome/` vs `src/app/[locale]/welcome/` (confluisce in C6).

**Il problema reale:** D-10 collega l'age-gating al prompt usando l'età del profilo, ma il CTA primario "Prova gratis" chiama `onSkip` e POSta `hasCompletedOnboarding:true` **senza mai raccogliere nome+età** → per i nuovi utenti Trial l'adattamento per età **non ha input e resta inerte**. Un cluster che "chiude" T1.10 senza sistemare la cattura è un **falso verde**.

- **DECISIONE (allinea D5 già accettato):** **un solo flusso di onboarding**, con **1 step obbligatorio (nome + età)**; la voce è una **modalità opzionale _dentro_ lo step**, non un percorso separato. I due pulsanti "con/senza voce" non sono flussi divergenti da tenere entrambi: diventano un toggle di modalità sopra lo stesso step. "Prova gratis" **non** può marcare `hasCompletedOnboarding:true` saltando la cattura; se l'utente salta gli step opzionali lo stato è `skipped` esplicito, ma nome+età sono raccolti sempre. Elimina il dead code dei due handler biforcati.
- **Azione:** ridisegnare `quick-start.tsx`/`landing-page.tsx` (nella copia viva post-C6): step 1 obbligatorio con toggle voce/testo → `/api/onboarding` con `{name, age, hasCompletedOnboarding:false, status:'in_progress'|'skipped'}`; mai `true` fasullo. E2E: trial → valore in ≤3 interazioni CON nome+età in DB; poi verificare che l'age-gating (D-10) ora riceva l'età e produca prompt diversi per età diverse.
- **Modello:** Opus. **Rischio/reversibilità:** medio; nessun dato prod toccato; reversibile. **Ordine:** dopo C6 (una sola landing) o coordinato con esso.

---

## C4 — Parità safety sul path streaming + compliance-check reale

**Voci:** D-06 (T1.3 STEM + T1.4 bias su streaming), D-08 resto (T1.8). **Stato:** [DA TABELLA] — D-06 aperto; D-08 parziale (i 2 path stantii sono corretti, ma i check restano presenza-statica). Coordinare con C13/T4.7 (refactor `chat/route.ts`): **prima il wiring safety, poi lo split**.

- **Azione D-06:** eseguire `checkSTEMSafety` sull'input in `stream/route.ts` pre-stream; `detectBias`+sanitize sull'output nel flush finale; su `hasBias && !safeForEducation` → rigenera o fallback educativo (non solo `log.warn`). Test: query STEM pericolosa bloccata su entrambi i path; output biased mockato non servito.
- **Azione D-08 resto:** convertire i check safety da `fileExists`/`fileContains` a test d'integrazione vitest con assertion di call-site (T1.1–T1.5); criterio: un revert temporaneo di un wiring fa fallire il check (dimostrarlo).
- **Modello:** Opus (safety, giudizio sul compromesso streaming). **Rischio:** medio; migliora la safety → procedere.

---

## C5 — Allineamento documenti compliance (AI Act consistency)

**Voci:** D-51 (T1.12/TC.2) + AI-Act **P0-3, P1-1, P1-2, P1-3, P1-4, P1-5, P1-6, P1-7, P2-3**. **Stato:** [DA TABELLA] doc. Una **PR unica "AI Act consistency"**.

- **DECISIONE (postura codice/doc, non conclusione legale):**
  1. Il codice **smette di autodefinirsi Art. 14** (`api/admin/safety/route.ts:5`); si allinea alla postura **alto rischio prudenziale** (P1-1). La classificazione formale = **gate legale** (D6).
  2. Correggere: base legale Annex III(3)(b) al testo vigente (P1-2); STT/TTS ≠ biometria (P1-3); DPIA "Not Collected" allineato al DB reale — `Profile.name`, `GoogleAccount.*`, IP in `CoppaConsent`/`TosAcceptance` (P1-4); stati aspirazionali marcati "pianificato/in corso/non ancora" (P1-5); fascia età **8–18** ovunque, coerente con P1-6 già uniformato (P1-6); Q48 salute/diagnosi → "nessuna diagnosi clinica; profili a11y = proxy su consenso, potenzialmente art. 9" (P1-7).
  3. P0-3 (monitoraggio emotivo da testo `emotionalVentCount`): documentare in DPIA/risk-register come misura di sicurezza/benessere con base giuridica; copertura eccezione art. 5(1)(f) = conferma legale.
  4. P2-3: creare `docs/compliance/DATA-GOVERNANCE-SOP.md` con provenienza/licenze delle 26 knowledge base.
  5. D-51 PMM: rimuovere l'overclaim "moderazione umana/dashboard realtime" (post D-07 già su store durevoli); allineare PMM/POST-MARKET.
- **Modello:** Opus. **Rischio:** i testi sono doc; la sola parte che richiede firma umana è la **conclusione di classificazione legale** — flaggata come gate, non come blocco alla PR (la PR rende i doc _coerenti e onesti_, non emette il verdetto legale).

---

## C6 — Funnel e landing: una sola strada

**Voci:** D-19 (TJ.1 route conflict), D-20 (TJ.2 tre landing), D-21 (TJ.3 gate morti), D-27 (TJ.3 invite dup), D-28 (TJ.3 waitlist vestigiale), D-26 (TJ.8 PII sidebar), D-24 (TJ.6 sessione scaduta), D-25 (TJ.7 SSO), D-23 (TJ.5 handoff genitore). **Stato:** [VERIFICATO parziale] esiste `[locale]/(marketing)/page.tsx` + doppione `src/app/welcome` vs `[locale]/welcome`.

- **DECISIONI:**
  - **D-19/TJ.1:** eliminare il gruppo `(marketing)` da `/[locale]` (una sola page per `/[locale]` = home bambino); il marketing, se serve, va su path reale `/scopri`. _(Opus, dopo build-check di chi vince.)_
  - **D-20/TJ.2:** consolidare su **una** landing pubblica; `/welcome` = solo onboarding; il fallback provider diventa `/service-unavailable`. Rimuovere il doppione `src/app/welcome` non-locale.
  - **D-21/D-27/D-28/TJ.3:** eliminare `TosGateProvider`, `TrialConsentGate`, `CookieConsentWall` (vive solo `UnifiedConsentWall`), il duplicato `invite/request`, e le vestigia waitlist/coming-soon; correggere ADR 0098 e il CHANGELOG (redirect `/coming-soon` mai esistito). _(Sonnet.)_
  - **D-26/TJ.8:** spostare la CTA "Richiedi accesso" (form PII) dietro il grown-up gate nell'area genitori; nella sidebar bambino solo "Chiedi a un grande" senza form. _(Sonnet.)_
  - **D-24/TJ.6:** route `AUTH_ONLY` senza sessione → **sempre `/login`**, mai downgrade a trial. _(Sonnet.)_
  - **D-25/TJ.7 — DECISIONE (D4 accettato):** **potare** le route SSO MS365/Google-Workspace/OIDC (nessun entry-point UI, nessun tenant); documentare Google = solo Drive; si riaggiungono quando c'è un tenant reale. _(Sonnet.)_
  - **D-23/TJ.5:** aggiungere branch post-primo-login genitore → form adulto profilo figlio → schermata handoff "Passa il dispositivo a {nome}" → home bambino. _(Opus.)_
- **Modello:** Opus per TJ.1/TJ.5, Sonnet il resto. **Rischio:** medio (routing pubblico) ma reversibile; nessun dato prod. **Ordine:** C6 prima di C3 (l'onboarding vive nella landing consolidata).

---

## C7 — Correttezza del core educativo

**Voci:** D-29 (T3.1 FlashcardProgress), D-30 (T3.2 FSRS), D-31 (T3.3 renderer), D-32 (T3.4 voice RAG), D-33 (T3.5 mini-KB), D-34 (T3.6 data-retention). **Stato:** [VERIFICATO] FSRS: `packages/education/src/fsrs/core.ts` (morto) vs `components/education/flashcards-view/utils/fsrs.ts:fsrs5Schedule` (vivo).

- **DECISIONI:**
  - **D-30 — FSRS:** tenere il **vivo** (`fsrs5Schedule`), consolidarlo in `@/lib/education/fsrs`, **eliminare** `packages/education/src/fsrs` (documentato ma morto a runtime), migrare i test, aggiornare CLAUDE.md. _(Opus.)_
  - **D-29:** POST per-card a `/api/flashcards/progress` (route esistente inutilizzata) oltre al salvataggio materiale → scheduler e dashboard smettono di girare su tabella vuota. Test: 3 review = 3 righe `FlashcardProgress`. _(Opus.)_
  - **D-31:** aggiungere i case renderer mancanti (timeline live + canvas chart/formula/calculator/demo/timeline + calculator archive) riusando i renderer esistenti; matrice tipi×superfici in `docs/UX-STATES.md`. _(Sonnet.)_
  - **D-32 — voice RAG:** aggiungere retrieval maestro-knowledge nel builder instructions voce (`session-config.ts`), con troncamento che dà priorità al safety. **Se costo/latenza non valgono** (budget T5.4): documentare la divergenza in CLAUDE.md e chiudere **ACCETTATO** invece di forzare. _(Opus, decide sul budget.)_
  - **D-33:** interpolare i 4 `*_MINI_KB` mancanti (cassese, ippocrate, lovelace, simone); riconciliare mascetti/amici-miei. _(Sonnet.)_
  - **D-34 — data-retention:** chiarire il delta tra cron reale e service "stub"; implementarlo o eliminare lo stub e correggere i claim F-02. _(Opus.)_
- **Rischio:** medio; nessun dato prod distrutto (le migrazioni vanno su DB locale — vedi C1/D-72). Reversibile.

---

## C8 — i18n e UX locale

**Voci:** D-12 (T2.1 TTS multilingua), D-14 (T2.3 errors.json), D-15 (T2.4 [TRANSLATE]+voice parity), D-16 (T2.5 date it-IT). **Stato:** [DA TABELLA].

- **Azioni:** passare il locale attivo a `speak()` + voce per prefisso lang (D-12); risanare struttura `errors.json` (ADR 0104/0091), copy child-tone, completare tedesco (D-14); rimuovere `[TRANSLATE]`, riconciliare `voice.json` (it -9 ns), rendere `i18n:check` **bidirezionale** (D-15); `useFormatter()` next-intl al posto di `it-IT` hardcoded + estendere `no-hardcoded-italian` (D-16). Sempre: IT-first → `i18n-sync-namespaces.ts --add-missing` → `i18n:check`.
- **Modello:** Sonnet (meccanico, ben specificato). **Rischio:** basso. **Nota:** D-12/D-15 (TTS+parity) sbloccano M2; D-14/D-16 sono GA-IT.

---

## C9 — Comportamento accessibilità

**Voci:** D-17 (T2.6 DSA profile stacking), D-18 (T2.9 syncWithSystem), D-52 (T2.7 stati loading/error/empty). **Stato:** [DA TABELLA].

- **D-17:** reset a `defaultAccessibilitySettings` prima di applicare un profilo (per bimbi autistici/ADHD la prevedibilità È la feature), preservando esplicitamente le preferenze non-profilo. Test: ADHD→Visual non lascia `adhdMode` attivo. _(Opus — invariante trasversale.)_
- **D-18:** implementare `syncWithSystem` reale (mappa reduced-motion/contrast) + nudge dismissibile una-tantum; persistenza cookie/DB (no localStorage). _(Sonnet.)_
- **D-52 — DECISIONE (normalizzazione stati):** pattern unico per ogni superficie child-facing — loading/error/empty **calmi, i18n, con azione chiara** ("Riprova" / "Chiama un grande"), **TTS-leggibili**; lo stato d'errore non resta mai muto (il caso "Caricamento..." bloccato = CSP deve dirlo in linguaggio da bambino). Censimento in `docs/UX-STATES.md`; E2E per i 3 stati sulla chat. _(Opus.)_
- **Rischio:** basso/medio, reversibile.

---

## C10 — Onestà "i genitori vedono"

**Voce:** D-13 (T2.2). **Stato:** [DA TABELLA]. **DECISIONE (D1(b) già accettato):** copy onesto ("un adulto di fiducia può vedere un riassunto di ciò di cui parliamo") in `safety-prompts-core.ts` §8.3, allineato alla parent dashboard che mostra aggregati; test aggiornati. Roadmap transcript opzionale come feature futura, non promessa ora. **Modello:** Opus (copy safety). **Rischio:** basso.

---

## C11 — Purge del codice morto

**Voci:** D-36 (T4.1 varianti UI), D-37 (T4.2 orfani), D-39 (T4.4 embeddings/debug — potrebbe essere già in corso), D-58 (T4.4 flag census), D-66 (tier overlay dead), D-38 (T4.3 packages). **Stato:** [VERIFICATO parziale]:

- D-39: `src/app/api/embeddings/route.ts` esiste (stub retired); `api/debug`, `api/debug-env`, `api/debug-cert`, `api/test` presenti → env-gate OFF in prod o eliminare.
- D-66: [VERIFICATO] `LockedFeatureOverlay`/`UpgradePromptModal` in `components/tier/` referenziati **solo** da `.example.tsx` → dead code confermato. **Nota override:** il brief di sessione lo dava per risolto (PR #509); il codice mostra i componenti ancora presenti → l'esecutore verifichi se #509 è stato mergiato o ha toccato file diversi. Trattato qui come APERTO in base al codice.
- D-38: 14 packages; 7 mai importati (`maestri, safety, tier, ai-providers, accessibility` + parte di `db`). **Attenzione:** `packages/db` contiene `pii-middleware.ts` VIVO — verifica import per import prima di toccare.

- **DECISIONI:** D-36 eliminare le varianti `maestro-session-*` morte (v1-v4/proposal/header-variants) + `PROPOSALS_README.md`, tenere `maestro-session.tsx` vivo. D-66 eliminare l'overlay Pro-only mai collegato. D-37 archiviare `backend/`, `testingcase/`, `reports/route-inventory.json`; `load-tests` si RIATTIVA in C16, `grafana`/`monitoring` verificati con C14. D-58 tabella flag→consumer in `docs/ops/FLAGS.md`, rimuovere flag senza consumer. **D-38 (D2 accettato):** archiviare gli shell dei 7 packages inutilizzati, dichiarare `apps/web/src/lib` la casa, aggiornare CLAUDE.md e import-map.
- **Modello:** Sonnet (D-36/37/39/58/66), **Opus** per D-38 (rischio import trasversali). **Rischio:** basso salvo D-38 (medio, mitigato da verifica import-per-import). Reversibile. **Ordine:** demolizioni prima (riducono superficie di tutto il resto).

**Correzione post-scrittura (D-37, verificata a codice prima di eseguire):** `testingcase/` NON va archiviato — è attivamente documentato e usato dall'agente `studygenerator` (`.claude/agents/studygenerator.md` lo referenzia esplicitamente come la sua directory di lavoro per generare PDF accessibili). Lasciato intatto. `backend/` invece confermato genuinamente morto (zero riferimenti in Dockerfile/docker-compose/CI — solo un puntatore stantio in `README.md`) — rimosso. `reports/route-inventory.json`/`full-test-report.html` erano tracciati in git nonostante `/reports` sia in `.gitignore` — rimossi dal tracking. D-36: le varianti originariamente descritte (`maestro-session-v1..v4`, `PROPOSALS_README.md`) non esistono più nell'albero; trovato invece un cluster diverso dello stesso genere (`voice-panel-proposal2/`), rimosso. D-58 eseguito: censimento in `docs/ops/FLAGS.md`, rimosso `coming_soon_overlay` (zero consumer).

**Correzione post-scrittura (D-38, la più severa di questa sessione):** la decisione "D2 accettata" sopra ("archiviare gli shell dei 7 packages inutilizzati, dichiarare `apps/web/src/lib` la casa") è **sbagliata e NON va eseguita**. Verificato a codice: i 5 package a zero import reali (`accessibility`, `ai-providers`, `maestri`, `safety`, `tier` — non 7, gli altri 2 non confermati) sono **"reversed shim" deliberati per una migrazione monorepo "W3" già in corso**, documentati esplicitamente in `CONTRIBUTING-MONOREPO.md` §Test-arch (issue #365), con issue di estrazione già aperte e numerate (tier #358, safety #356, ai-providers #357, maestri #361). Ogni file sorgente è un one-liner `export * from '../../../apps/web/src/lib/X'` con un commento che dice testualmente "Canonical implementation lives at src/lib/X during W3 migration". Zero import è lo stato atteso in questa fase della migrazione, non abbandono. Eseguire la decisione originale avrebbe **invertito silenziosamente una decisione architetturale deliberata e tracciata su GitHub** — l'errore più grave tra i 4 già corretti in questa sessione (C1, C2, D-37/testingcase, ora D-38). D-38 dichiarato CHIUSO come non-debito, nessun file toccato.

---

## C12 — Tier cleanup: chiudere DEC-06

**Voce:** D-35. **Stato:** [VERIFICATO] `maestriLimit` presente in `tier-seed.ts` (3/25/26), `tier-fallbacks.ts`, `types.ts`; unico consumer `tier-helpers.ts:56` (`maxMaestri`), che **non è letto in runtime** (confermato: nessun consumer di `maxMaestri` fuori dai test).

- **DECISIONE (D3 accettato — DEPRECARE):** il modello intent-based ha reso il cap per-Maestro semanticamente obsoleto (il Maestro è auto-selezionato). Rimuovere `maestriLimit` dai `features` JSON, dai seed, dai tipi `TierFeatures`/`TierLimits`, e `maxMaestri` da `tier-helpers.ts`; aggiornare i test. Chiudere DEC-06 con **mini-ADR** che documenta la deprecazione (non enforcement cieco — avrebbe rotto l'auto-selezione Trial).
- **Modello:** Sonnet. **Rischio:** basso, reversibile. **Accettazione:** `grep maestriLimit = 0`, `prisma migrate diff` vuoto, ADR DEC-06 chiuso.

---

## C13 — Hardening route + igiene config

**Voci:** D-40 (T4.5 route pubbliche mutanti), D-41 (T4.6 engines/pin/SENTRY_DSN), D-42 (T4.6 eslint-disable/any), D-43 (T4.6+T4.7 file-line + top-5 monstre). **Stato:** [DA TABELLA].

- **D-40:** verificare `withRateLimit`+Zod su `homework/analyze`, `search`, `contact`, `waitlist/signup`, `realtime/sdp-exchange`; estendere `compliance-check --category api` (ogni route mutante ha auth O rate-limit+validazione O firma webhook O cron secret); il check fallisce su una route nuda aggiunta ad arte. _(Opus.)_
- **D-41:** `engines.node` in package.json; verificare i pin pnpm sospetti con install pulita; `SENTRY_DSN` in `.env.example`. _(Sonnet.)_
- **D-42:** ratchet in CI (nessun file nuovo oltre soglia, nessun peggioramento); sweep `eslint-disable`/`@ts-ignore` (fix o giustificazione); `:any` prod → 0; tipizzare fixture/mock condivise. _(Sonnet.)_
- **D-43/T4.7:** split dei top-5 monstre (`tier-service.ts`, `chat/route.ts`, `user-trash-service.ts`, `campaign-service.ts`, `compliance-audit-service.ts`) per responsabilità, **zero cambi di comportamento**; per `chat/route.ts` fare **PRIMA** il wiring safety (C4), POI lo split. _(Opus.)_
- **Rischio:** medio (refactor ampio); mitigato da "test invariati prima/dopo". Reversibile.

---

## C14 — Observability e performance

**Voci:** D-44 (T5.1 alerting channel), D-45 (T5.2 bundlewatch/lhci), D-46 (T5.3 Sentry sampling), D-47 (T0.4 uptime), D-48 (T0.5 cron), D-54 (T5.4 SLO voce). **Stato:** [DA TABELLA].

- **DECISIONE D-44:** implementare il notifier reale (Resend già in stack, o Slack webhook) con dedupe, consumato da uptime (D-47), decrypt-failure (T1.11), SLO (D-54). _(Opus.)_ — le notifiche vanno a **canali del maintainer**, non a utenti reali → non è un gate umano.
- **D-45:** step bundlewatch reale, rimuovere `|| echo` da lhci; se i budget sono sforati tarare a valore+10% e stringere. _(Sonnet.)_
- **D-46:** sampling Sentry 1.0 → 0.1-0.2 con `tracesSampler` a 1.0 sulle route critiche; `SENTRY_DSN` in `.env.example`; triage top-20 (richiede il token read-only TV.7, che è un input umano ma il triage è agentico → apre issue GitHub, non tocca prod). _(Sonnet.)_
- **D-47:** poll schedulato 5-10 min con notifica (pattern Resend esistente). _(Sonnet.)_
- **D-48:** correggere schedule `nightly-benchmark`; dare schedule o rimuovere i 2 cron orfani. _(Sonnet.)_
- **D-53 — funnel non misurato (TJ.9):** definire i 5 eventi chiave (landing*view, trial_start, first_message, first_tool, return_visit), verificare che il tracking `lib/funnel` spari davvero (oggi mockato negli E2E), creare dashboard minima (Grafana in stack) per i target ≤3/≤2 interazioni; eventi in `docs/analytics/FUNNEL.md`. Vive accanto a D-54 (stesse serie Grafana). *(Sonnet.)\_
- **D-54:** definire SLO misurabili (health, p75 first-response chat, success-rate voce, p75 connect→greeting) e collegarli all'alert. _(Opus.)_
- **Rischio:** basso/medio. Reversibile.

---

## C15 — Decisioni ad alto rischio prese (watermark + verifica età)

**Voci:** AI-Act **P2-1** (watermark), **P2-2** (verifica età Trial). **Stato:** [DA TABELLA]. Il mandato chiede _decisione di prodotto_; io decido **la postura ingegneristica e la roadmap**, non la conclusione legale.

- **P2-1 watermark — DECISIONE: DEFER, con trigger di riapertura.** L'art. 50(2) (marcatura machine-readable dei contenuti sintetici) mira principalmente a immagini/video/audio deepfake che impersonano persone reali. MirrorBuddy genera **solo testo conversazionale + audio TTS** (voce sintetica dichiarata, non impersonazione). La **disclosure leggibile** già presente (banner "stai interagendo con un'IA") soddisfa la trasparenza 50(1)/(9). **Motivazione:** implementare provenance/marcatura su testo+audio conversazionale ha costo alto e beneficio legale incerto finché non c'è generazione di media sintetici. **Trigger di riapertura:** (a) il prodotto aggiunge generazione immagini/video, oppure (b) il parere legale sullo scope 50(2) per testo/audio dice che è richiesto. Documentare la postura in `AI-POLICY.md`. **Milestone di revisione:** M3 o al primo feature generativo-media.
- **P2-2 verifica età Trial — DECISIONE: mantenere il grown-up gate come mitigazione dichiarata; NON costruire hard age-verification ora.** Meccanismi forti (documento d'identità, carta di credito) sono **ostili all'audience DSA di minori** e **peggiorano la privacy** (raccolgono PIÙ PII di minori). **Motivazione:** per un prodotto per bambini, l'auto-dichiarazione + grown-up gate + disclosure onesta è la mitigazione proporzionata; irrobustire richiede prima una necessità regolatoria dimostrata. **Azione:** formalizzare in DPIA il grown-up gate + disclosure come mitigazione accettata, con nota esplicita del limite (non è consenso genitoriale verificabile ex art. 8 GDPR/COPPA/L.132). **Gate legale:** l'_adeguatezza legale_ di questa mitigazione resta conferma del legale — io ho deciso la postura tecnica, non emesso il verdetto di conformità.
- **Modello:** Opus. **Rischio/reversibilità:** le decisioni sono _documentali + roadmap_, pienamente reversibili; nessun codice irreversibile.

---

## C16 — Release-readiness ops (parzialmente human-gated)

**Voci:** D-55 (TV.8 backup/restore), D-56 (TR.4 load-tests). **Stato:** [DA TABELLA].

- **D-56 load-tests:** riattivare `load-tests/` (k6, congelato PR #348), scenario minimo su **staging** (50 utenti su home+chat), verificare rate-limit e degradazione. _(Sonnet — staging, non prod → agentico.)_
- **D-55 backup/restore:** l'agente **scrive** il runbook `docs/ops/RUNBOOK-RESTORE.md` e la procedura su progetto scratch; la **prova di restore effettiva** su infrastruttura Supabase reale è **gate umano** (accesso + operazione su dati reali). Vedi lista bloccati.
- **Rischio:** D-56 basso (staging); D-55 la parte operativa è alta → umano.

---

## C17 — Mobile (post-M1)

**Voci:** D-49 (T6.1 iOS plist), D-50 (T6.2 backend shell). **Stato:** [DA TABELLA].

- **D-49:** aggiungere `NSMicrophoneUsageDescription`/`NSCameraUsageDescription` (purpose string child-appropriate IT+EN); `npm run ios:check` verde. _(Sonnet.)_
- **D-50:** scegliere shell remota (`server.url`→prod) o base `NEXT_PUBLIC_APP_URL` con `Capacitor.isNativePlatform()`; risolvere cookie/CSRF cross-origin. _(Opus.)_
- **Rischio:** medio; post-M1, non blocca GA-IT. La submission store (D-49/D-50 → TestFlight) tocca account developer reali → coordinamento umano al momento del submit.

---

## C18 — Needs-scoping / decisioni prese vs genuinamente umane

- **D-67 — Buddy avatar masking in-sessione. DECISIONE PRESA (era needs-scoping):** mascherare **solo l'identità visiva** (nome/avatar → "Buddy") durante la sessione; **mantenere voce/persona reale del Maestro e l'indirizzo formale ADR-0064** (Lei/Sie/Vous per figure storiche) — la voce/persona È il valore pedagogico, mascherarla romperebbe il prodotto. Il banner di handoff annuncia "Buddy". Risolve le 3 domande aperte dell'issue #436. _(Opus, reversibile, rischio basso.)_
- **TC.3 — Revisione età-appropriatezza dei 26 maestri:** agentica — `compliance-check --category characters` + revisione LLM documentata con lente 8-18 DSA; report per maestro in `docs/EXPECTATIONS-CONTRACT.md`. _(Opus.)_
- **D-68 — Calibrazione focus-group su utenti reali (VAL-01..07): GENUINAMENTE BLOCCATO.** Richiede esperti di dominio reali (logopedista, insegnante di sostegno, adulti Sordi/CP/dislessici/ADHD) e un protocollo etico per test con minori disabili (DPIA + assenso + reclutamento indipendente). **Nessuna azione di codice possibile** — resta il caveat "[SIMULATO], non calibrato" finché non risolto da persone reali.

---

## Item genuinamente bloccati su azione esterna irreversibile (NON eseguibili da un agente da solo)

Pochi, e solo questi:

1. **D-55 (parte operativa)** — prova di restore su **Supabase di produzione**: operazione su dati reali con accesso privilegiato. L'agente scrive il runbook; l'esecuzione la fa un umano.
2. **D-68** — validazione con **utenti umani reali** (minori disabili + esperti): richiede reclutamento, assenso, protocollo etico. Nessun codice.
3. **Conclusioni legali** (non i doc, che l'agente allinea): classificazione formale AI Act (D6/P1-2), adeguatezza legale della verifica età (P2-2), scope art. 50(2) testo/audio (P2-1), base giuridica art. 5(1)(f) per P0-3. L'agente decide la **postura tecnica/documentale**; la **firma legale** è umana.
4. **Submission store reale** (D-49/D-50 → TestFlight/Play): pubblicazione a nome dell'account developer.
5. **TR.6 Go/No-Go finale** — firma del maintainer.

Tutto il resto (≈48 voci) è **deciso ed eseguibile in autonomia** secondo i cluster sopra.
