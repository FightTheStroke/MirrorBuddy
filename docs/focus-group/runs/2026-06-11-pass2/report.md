# Focus group simulato — REPORT pass #2 (2026-06-11) [SIMULATO]

> ⚠️ **Metodo NON calibrato su utenti reali.** Ogni dato qui è prodotto da agenti AI che interpretano studenti DSA, non da bambini reali: serve a generare ipotesi e trovare difetti di flusso/lessico/percezione, NON a misurare gradimento o comprensione reali. n=4 persona (non rappresentativo).
> **Modelli**: Partecipanti = **Opus** (FGOP-12, riconfermato qui) · Verifica = Regista/Opus (pixel+artefatti) · Sintesi = Regista/Opus. Sintetizzatore Fable rimandato (sintesi fatta dal Regista che aveva già eseguito la verifica).
> **Superficie**: home intention-based, branch `feat/ux-simplification-intention-based` DOPO il fix `05b68563` (sidebar). **Cattura su dev server** (artefatti dev esclusi, FGOP-10).
> **Persona**: P1 Marco (dislessia+ADHD·Trial), P3 Sofia (ipovisione·Base·640px), P4 Luca (motorio-tastiera·Base), P6 Elena (sorda·Base). NON eseguite: P5 Giulia, P7 Davide (stimolo pronto).

## 1. Sintesi

Il pass #2 aveva due scopi: (a) verificare la **regressione** del fix FG-01/FG-02; (b) eseguire il **protocollo completo** (canary + misure) con Partecipanti **Opus**. Entrambi riusciti. **FG-01 (S1) e FG-02 (S2) sono RISOLTI** (verificato ai pixel: a 640px la sidebar è un hamburger e le carte sono leggibili). Il **canary è passato 4/4** (zero confabulazione): Opus regge ancoraggio, registro e capability-check su tutte e 4 le persona, inclusa Elena/sorda — FGOP-12 riconfermato. La cattura del passo "I miei premi" (T5) è risultata **corrotta in modo consistente** (compaiono dialog lucchetto / banner cookie / home invece dei premi): i finding T5 sono scartati, ma emerge un **possibile bug di flusso premi** (FG-13) da verificare. Nuovi finding indipendenti: **"Your Trial Usage" in inglese** (i18n, FG-14, da Elena), lessico adulto "sbloccarlo" (FG-15, Marco), assenza di un bottone "Casa" etichettato (FG-16, Sofia). Confermati ancora aperti: FG-03 (troncamento nomi materia a 130%) e DEC-03 (18 materie).

## 2. Tabella finding

| FG       | Classe                                                                                                         | Persona     | Verifica                                                                                                              | Severità      | Dev-art? | ID masterplan                                             |
| -------- | -------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | --------------------------------------------------------- |
| FG-01/02 | **RISOLTI** — sidebar non copre più le carte a 640px                                                           | P3          | ✅ pixel                                                                                                              | — (era S1/S2) | No       | **A11Y-12 ☑** `05b68563`                                  |
| FG-13    | Navigazione "I miei premi" non porta ai premi: in cattura compaiono lucchetto/cookie/home (consistente su 4/4) | P1,P3,P4,P6 | ❓ (stimolo corrotto; gli E2E esistenti navigano ai premi con successo → PROBABILE artefatto di cattura, non bug app) | S2            | parz.    | nuovo UX-13 + FGOP-13; **verificare flusso reale**        |
| FG-14    | Riquadro «Your Trial Usage» in **inglese** in mezzo alla UI italiana                                           | P6 Elena    | ✅ (testo inglese presente)                                                                                           | S2            | No       | i18n — namespace `analytics`/trial dashboard (UX/i18n-13) |
| FG-15    | «sbloccarlo» fuori dal registro di un 9enne dislessico (dialog lucchetto)                                      | P1 Marco    | ❓ esperienziale (parola presente; manca lista lessicale per età)                                                     | S3            | No       | UX-12 (lessico, contiguo a FG-10)                         |
| FG-16    | Nessun bottone «Casa» etichettato per tornare alla home (solo hamburger)                                       | P3 Sofia    | ❓ (assenza nell'artefatto)                                                                                           | S2            | No       | nuovo UX-14 (wayfinding)                                  |
| FG-17    | L'icona altoparlante copre l'ultima lettera del nome materia troncato                                          | P3 Sofia    | ✅ (s02.png)                                                                                                          | S3            | No       | dentro A11Y-13 (FG-03)                                    |
| FG-03    | Nomi materia troncati a testo 130% — ANCORA APERTO                                                             | P3          | ✅ pixel                                                                                                              | S2            | No       | A11Y-13 (aperto)                                          |
| FG-08    | 18 materie in fila (Matematica Tab 14) — ANCORA APERTO                                                         | P1,P3,P4    | ✅                                                                                                                    | S2            | No       | DEC-03 (evidenza)                                         |

## 3. Quote selezionate [SIMULATO]

- [P3·E] «Volevo i premi e mi ritrovo i cookie.» (FG-13)
- [P1·D] «Quando schiaccio sui premi mi deve far vedere i premi, non un'altra volta il lucchetto.» (FG-13)
- [P6·B] «C'è di nuovo il riquadro inglese "Your Trial Usage" a destra: stona.» / «"ti porto il professore giusto" — spero sia chat scritta, non un professore che parla, perché allora io non lo sento.» (FG-14 + voice-first)
- [P1·C] «"Sbloccarlo". È lunga, è una parola da grandi. Non so bene cosa vuol dire... forse aprire?» (FG-15)
- [P3·E] «Un bottone "Casa" scritto, grande e giallo, mi servirebbe.» (FG-16)
- [P3·B] «Le emoji a colori sono il salvataggio: 🔢 la trovo subito. Senza, sarei in difficoltà.» (positivo)
- [P4·A] «Tab 1 su "Fare i compiti": 1 Tab, non si può fare meglio.» (positivo)

## 4. Misure soddisfazione (Smileyometer · Again-Again · una parola) — ORDINALI, non assolute

| Persona | Task                       | Faccina | Again-Again | Parola    |
| ------- | -------------------------- | ------- | ----------- | --------- |
| Marco   | trovare matematica         | 🙂      | Forse       | «tante»   |
| Marco   | dialog lucchetto           | 🙁      | No          | «chiuso»  |
| Sofia   | cercare matematica         | 🙂      | Sì          | «emoji»   |
| Sofia   | (premi — stimolo corrotto) | 😣      | No          | «coperto» |
| Luca    | Matematica (14 Tab)        | 🙁      | Forse       | «lontana» |
| Luca    | (premi — stimolo corrotto) | 😣      | No          | «vuota»   |
| Elena   | app in generale            | 😐      | Forse       | —         |

> Caveat §4.5: le misure "premi" riflettono uno stimolo corrotto → scartare. Le altre valgono solo come confronto ordinale tra task/run a parità di modello (Opus).

## 5. Cosa funziona (positivi verificati — proteggere da regressioni)

- **Carte intento leggibili a 640px** dopo il fix (regression guard già in `home-intent-dsa-a11y.spec.ts`).
- **Emoji a colori come ancora di navigazione** (Marco e Sofia la citano come "la cosa fatta meglio"): blocco di colore riconoscibile senza leggere.
- **Parola scritta accanto a ogni emoji** (no icone-sole): cruciale per Elena (sorda/L2) e Sofia.
- **1 Tab per "Fare i compiti"** (Luca): percorso primario ottimale da tastiera.
- **Materie etichettate in testo** (Elena): nessuna informazione solo-iconica.

## 6. Proposte regression test E2E

- FG-14: test i18n/E2E — nessun testo inglese hard-coded nel pannello trial usage in locale `it` (cerca "Your Trial Usage"/"Trial Usage").
- FG-13: E2E flusso — `home-nav-progress` → la vista premi monta (heading premi visibile), nessun consent wall né dialog lucchetto residuo.
- FG-03/FG-17: E2E — a fontSize 1.3 nessun nome materia troncato (scrollWidth ≤ clientWidth della casella) e l'icona TTS non sovrappone il testo.
- FG-16: E2E — esiste un controllo "torna alla home" etichettato e raggiungibile da tastiera dalle viste figlie.

## 7. Appendice — limiti del run

- **n=4**, 2 persona non eseguite (Giulia/autism, Davide/cerebral — stimolo pronto in `stimulus/`).
- **Stimolo T5 (premi) corrotto** → FGOP-13; cattura ancora su **dev server** → FGOP-10 (badge "1 Issue", NEXTJS-PORTAL esclusi).
- **Misure di soddisfazione** = giudizio del modello-persona, non emozione reale; solo ordinali.
- **Sintesi fatta dal Regista** (non dal Sintetizzatore Fable) per espediente, avendo il Regista già eseguito la verifica ai pixel.
- **Canary 4/4 ok** mitiga ma non sostituisce la calibrazione su utenti reali (§5.5, VAL-06).
