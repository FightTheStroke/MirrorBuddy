# Focus group simulato — REPORT pass #3 (2026-06-13) [SIMULATO]

> ⚠️ **Metodo NON calibrato su utenti reali.** Ogni dato è prodotto da agenti AI
> che interpretano persona DSA sintetiche, non da bambini o ragazzi reali: serve
> a generare ipotesi e trovare difetti di flusso/lessico/percezione, NON a
> misurare gradimento o comprensione reali. n=2 persona (non rappresentativo).
>
> **Modelli**: Partecipanti = Opus (FGOP-12, confermato pass2) · Verifica =
> Regista/ispezione codice (text.json + messages/ + page.tsx, nessuno screenshot
> disponibile) · Sintesi = Regista.
>
> **Superficie**: home intention-based + pagina `/achievements`, branch
> `feat/ux-simplification-intention-based`. **Stimolo T5 da ispezione codice**
> (screenshot assenti — FGOP-10 ancora aperto; artefatti pass2 per s01–s03).
>
> **Persona**: P5 Giulia (autism · Trial · mouse) e P7 Davide (CP/tastiera/TTS ·
> Base). NON eseguite le persona già coperte in pass2 (P1 Marco, P3 Sofia, P4
> Luca, P6 Elena).
>
> **Scopo pass #3**: completare le sessioni di Giulia e Davide non eseguite in
> pass2, con stimolo T5 corretto (FGOP-13 risolto lato metodo), ed esplorare la
> pagina `/achievements` mai testata nelle sessioni precedenti.

---

## 1. Sintesi

Pass #3 ha due scopi: (a) eseguire le ultime due persona rimaste da pass2
(Giulia/autism e Davide/CP-tastiera-TTS); (b) testare per la prima volta la
pagina `/achievements` con uno stimolo T5 corretto.

**FG-13 è chiuso come bug di flusso app**: la navigazione a `/achievements` via
`home-nav-progress` funziona correttamente. La corruzione pass2 era interamente
un artefatto di cattura su dev server (FGOP-13 confermato). Emergono però tre
nuovi finding dalla pagina effettiva: **FG-18** (mismatch semantico "I miei
premi" → "Obiettivi"), **FG-19** (quattro stringhe in inglese in
`it/achievements.json`, estende FG-14), **FG-20** (focus tax sulla griglia
achievement locked per utente tastiera, estende FG-08/DEC-03).

Un finding critico emerge dal passo s03 di Giulia: **FG-22** — il consenso
cookie e il dialog lucchetto risultano aperti simultaneamente (due
`role="dialog"` sovrapposti, verificato in `s03.text.json` P5-giulia),
particolarmente destabilizzante per il profilo autism.

**FG-21** (assenza bottoni TTS sulla pagina achievements) è riportato come
**comportamento verosimilmente intenzionale** (TTS per azioni interattive, non
per statistiche statiche) — richiede conferma design.

Positivi confermati: Tab 1 su "Fare i compiti" (Davide), pattern emoji + TTS
nel picker materie (Davide e Giulia), coerenza strutturale riquadri materia
(Giulia).

---

## 2. Tabella finding

| FG    | Classe                                                                                                                                                                                                    | Persona              | Verifica                                                         | Severità | Dev-art?     | ID masterplan                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------- | -------- | ------------ | ----------------------------- |
| FG-13 | **CHIUSO** — navigazione `/achievements` funziona; corruzione pass2 era artefatto cattura (FGOP-13)                                                                                                       | —                    | ✅ code                                                          | —        | Sì (cattura) | UX-13 → chiudere              |
| FG-18 | "I miei premi" (nav label) → "Obiettivi" (heading pagina): mismatch semantico. "Premi" (concreto, bambino-centrico) ≠ "Obiettivi" (astratto, adulto-formale). Critico per profilo autism/literal thinking | P5 Giulia            | ✅ (`s01.text.json` nav + `messages/it/achievements.json` title) | **S2**   | No           | nuovo **UX-15**               |
| FG-19 | 4 stringhe in inglese in `it/achievements.json`: "Quick Stats", "Achievement Unlocked!", "Close notification", "Achievements" — visibili in UI italiana. Estende FG-14 alla pagina /achievements          | P7 Davide            | ✅ (grep strutturale `messages/it/achievements.json`)            | **S2**   | No           | i18n — estende **UX/i18n-13** |
| FG-20 | Focus tax su griglia achievement: N card locked = N Tab obbligatori senza skip interno. Estende FG-08/DEC-03 alla pagina `/achievements`. Numero esatto da catturare con build prod                       | P7 Davide            | ❓ (stima da 9 categorie; numero achievements non ispezionato)   | S2       | No           | nuovo **A11Y-14**             |
| FG-21 | Nessun bottone `tts-*` sulla pagina achievements (incoerente con home-intent e picker) — **probabile comportamento intenzionale**                                                                         | P7 Davide            | ❓ (ispezione `achievements/page.tsx`: nessun `tts-*`)           | S3       | No           | — (confermare intenzionalità) |
| FG-22 | Doppio dialog overlap: `consent-banner` + `intent-locked-dialog` aperti contemporaneamente (s03). Due `role="dialog"`: focus trap conflittuale, attenzione multipla                                       | P5 Giulia            | ✅ (`s03.text.json` P5-giulia: entrambi i dialog presenti)       | **S2**   | No           | nuovo **UX-16** / **A11Y-15** |
| FG-03 | Troncamento nomi materia a testo 130% — ancora aperto                                                                                                                                                     | P7 Davide            | ✅ (pass2 + pattern picker s02)                                  | S2       | No           | **A11Y-13** (aperto)          |
| FG-08 | 18 materie in fila — ancora aperto                                                                                                                                                                        | P5 Giulia, P7 Davide | ✅                                                               | S2       | No           | **DEC-03** (evidenza)         |
| FG-14 | "Your Trial Usage" in inglese nella home — ancora aperto                                                                                                                                                  | P7 Davide            | ✅ (`s04.text.json` pass2)                                       | S2       | No           | **UX/i18n-13** (aperto)       |
| FG-06 | Doppioni Tab "Accedi"/"Richiedi Accesso" nella home — ancora aperto                                                                                                                                       | P7 Davide            | ✅ (`s01.focus.json` Tab 21-24)                                  | S2       | No           | **A11Y-1x** (aperto)          |

---

## 3. Confermati vs nuovi

### Confermati risolti (da pass2)

- **FG-01/FG-02** (sidebar che copre le carte a 640px): risolti in pass2, non
  rilevanti per Giulia/Davide (profili diversi da ipovisione 640px).

### Confermati aperti (da pass precedenti)

- FG-03 (troncamento a 130%), FG-08 (18 materie/DEC-03), FG-06 (doppioni Tab),
  FG-14 (Trial Usage in inglese).

### Nuovi in pass #3

| FG    | Breve descrizione                                        | Severità | ✅/❓ |
| ----- | -------------------------------------------------------- | -------- | ----- |
| FG-18 | "I miei premi" vs "Obiettivi" — mismatch semantico       | S2       | ✅    |
| FG-19 | 4 stringhe EN in `it/achievements.json`                  | S2       | ✅    |
| FG-20 | Focus tax griglia achievement — numero Tab da verificare | S2       | ❓    |
| FG-21 | No TTS su pagina achievements — forse intenzionale       | S3       | ❓    |
| FG-22 | Doppio dialog overlap (consent + lucchetto)              | S2       | ✅    |

---

## 4. Quote selezionate [SIMULATO]

- **FG-18** — [P5·D] «Ho cliccato su "I miei premi" e mi trovo su una pagina che
  si chiama "Obiettivi". Queste sono due parole diverse. Sono nel posto giusto?»

- **FG-18** — [P5·D] «Il nome era sbagliato. Mi hanno detto "premi" e mi hanno
  portato a "obiettivi". Non è la stessa cosa.» (parola di chiusura: «sbagliato»)

- **FG-19** — [P7·F] «"Quick Stats" e "Achievements" in mezzo alla pagina italiana.
  Il mio TTS li pronuncerà in inglese in mezzo a tutto il resto.»

- **FG-20** — [P7·F] «Stimo 10 filtri + 30 achievement = 40 Tab prima di
  raggiungere di nuovo la sidebar. Non c'è un modo per saltarli in blocco.»

- **FG-21** — [P7·F] «Nella home ogni carta aveva il suo "Ascolta". Qui, sulla
  pagina obiettivi, non c'è nessun "Ascolta". Il pattern TTS non è esteso.»

- **FG-22** — [P5·C] «Due finestre aperte insieme. Regola numero uno per me:
  una cosa alla volta. Non so a quale rispondere.»

- **Positivo** — [P7·A] «Tab 1 su "Fare i compiti": quella è architettura fatta
  bene.» (Again-Again: Sì · parola: «uno»)

- **Positivo** — [P5·B] «Ogni riquadro uguale agli altri — posso fidarmi. E la
  emoji 🔢 la trovo subito.» (Again-Again: Sì · parola: «ordine»)

---

## 5. Misure soddisfazione (Smileyometer · Again-Again · una parola) — ORDINALI

| Persona | Task                                   | Faccina | Again-Again                | Parola        |
| ------- | -------------------------------------- | ------- | -------------------------- | ------------- |
| Giulia  | Home — carte intento                   | 😐      | Sì (solo "Fare i compiti") | «due»         |
| Giulia  | Picker materie                         | 🙂      | Sì                         | «ordine»      |
| Giulia  | Dialog lucchetto + overlap cookie      | 😣      | No                         | «due»         |
| Giulia  | "I miei premi" → Obiettivi             | 😐      | Forse                      | «sbagliato»   |
| Davide  | Home + Tab 1                           | 🙂      | Sì                         | «uno»         |
| Davide  | Picker materie (Tab 26 per matematica) | 😐      | Sì                         | «prevedibile» |
| Davide  | Pagina Obiettivi / premi               | 🙁      | Forse                      | «inglese»     |

> Misure = giudizio del modello-persona, non emozione reale. Solo ordinali;
> non confrontare tra persona diverse o con misure di pass precedenti.

---

## 6. Cosa funziona (positivi verificati — proteggere da regressioni)

| Positivo                                                                        | Persona   | Evidenza                                                    | Verifica |
| ------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------- | -------- |
| **Tab 1 su "Fare i compiti"** — azione primaria al primo Tab                    | P7 Davide | `s01.focus.json` index 1 = `intent-card-homework`           | ✅       |
| **TTS per ogni carta intento** (Tab n, n+1) e **per ogni materia** (Tab m, m+1) | P7 Davide | `s01.focus.json`, `s02.focus.json`                          | ✅       |
| **Pattern emoji + parola** nel picker — trova Matematica senza leggere tutto    | P5 Giulia | `s02.text.json`: emoji presente su ogni materia             | ✅       |
| **Struttura omogenea** riquadri materia — predittibilità per profilo autism     | P5 Giulia | `s02.text.json`: pattern uniforme                           | ✅       |
| **Navigazione `/achievements` funzionante** — FG-13 chiuso                      | —         | `achievements/page.tsx` + `home-nav-progress` attivo in nav | ✅       |

---

## 7. Proposte regression test E2E

### FG-18 — mismatch semantico nav / heading

```ts
// Sentinel: failing test che documenta l'inconsistenza fino a UX-15.
test('nav label and achievements page heading share child register', async ({ page }) => {
  await page.goto('/it/achievements');
  const h1 = await page.getByRole('heading', { level: 1 }).textContent();
  // Update assertion once UX-15 copy fix is merged.
  expect(h1?.toLowerCase()).toContain('premi'); // currently fails: h1 = "Obiettivi"
});
```

### FG-19 — stringhe EN in `it/achievements.json`

```ts
test('no English strings visible on Italian achievements page', async ({ page }) => {
  await page.goto('/it/achievements');
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Quick Stats');
  expect(body).not.toContain('Achievement Unlocked');
  expect(body).not.toContain('Close notification');
});
```

### FG-20 — focus tax griglia achievement

```ts
test('achievements page: sidebar nav reachable within tab budget', async ({ page }) => {
  await page.goto('/it/achievements');
  const MAX_TABS = 20;
  let tabCount = 0;
  while (tabCount < MAX_TABS) {
    await page.keyboard.press('Tab');
    tabCount++;
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    if (focused === 'home-nav-intent') break;
  }
  expect(tabCount).toBeLessThan(MAX_TABS);
});
```

### FG-22 — doppio dialog overlap

```ts
test('only one dialog open at a time: consent + lock dialog cannot coexist', async ({ page }) => {
  // First visit (consent not yet accepted) + click locked intent card.
  await page.goto('/it');
  await page.locator('[data-testid="intent-card-quizMe"]').click();
  const visibleDialogs = page.locator('[role="dialog"]:visible');
  await expect(visibleDialogs).toHaveCount(1);
});
```

---

## 8. Appendice — limiti del run

- **n=2** persona (Giulia e Davide). Non rappresentativo statisticamente; utile
  per completamento copertura persona e generazione ipotesi.
- **Stimolo T5 da ispezione codice** — nessuno screenshot per `/achievements`
  (FGOP-10 ancora aperto su dev server). FG-18 e FG-19 sono **✅ strutturali**
  (verificabili da grep). FG-20 e FG-21 sono **❓ esperienziali** (numero esatto
  Tab non catturato; intenzionalità TTS non confermata dal design team).
- **Canary non somministrato** — FGOP-12 già riconfermato 4/4 in pass2; n=2 non
  giustifica la procedura completa.
- **FG-13 chiuso** — le persona pass2 avevano reagito onestamente allo stimolo
  corrotto: ulteriore evidenza di ancoraggio FGOP-12, non un loro errore.
- **FG-21 sospeso** — richiedere conferma al design team prima di aprire ticket.
- **Prossimo passo**: catturare `s04.text.json` e `s04.focus.json` reali su
  build di produzione per verificare FG-20 con Tab count preciso.
