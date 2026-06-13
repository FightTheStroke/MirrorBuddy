# T5-rewards-nav — Stimulus passo T5 (corretto) — pass #3 [SIMULATO]

> **FGOP-13 / CORRETTIVO** — nelle catture pass2, il click su `home-nav-progress`
> ("I miei premi") mostrava la home con banner cookie sovrapposto, non la pagina
> `/achievements`. La causa accertata è un artefatto del dev-server: il consent
> wall non era bypassato e il hot-module-reload ha interferito con la navigazione
> durante la cattura (`npm run dev`). Categorizzato FGOP-10 + FGOP-13.
>
> Questo documento sostituisce i file `s04.text.json` corrotti di P5-giulia e
> P7-davide con la descrizione verificata tramite ispezione diretta del codice
> (`apps/web/src/app/[locale]/achievements/page.tsx` +
> `apps/web/messages/it/achievements.json`).
>
> **Nessun screenshot disponibile per pass #3** (FGOP-10 ancora aperto). I
> partecipanti simulati reagiscono a questa descrizione testuale.

---

## 1. Azione del partecipante

Dalla home (s01), il partecipante clicca (o preme Tab + Invio) sul pulsante
`home-nav-progress` con etichetta **"I miei premi"** nella barra laterale.

- **P5 Giulia** (Trial, mouse/tocco): clicca direttamente.
- **P7 Davide** (Base, solo tastiera): Tab fino a `home-nav-progress` (index 35
  nel focus trace s04.focus.json pass2), poi Invio.

---

## 2. URL di destinazione

```
/{locale}/achievements
```

La vista non è parte di `GROWN_UP_VIEWS` (`maestri`, `calendar`, `settings`,
`genitori`): nessun `GrownUpGate` atteso. Se uno appare, è un nuovo bug.

---

## 3. Testo visibile atteso — Trial utente, 0 sessioni (P5 Giulia, Lv.1)

> Verificato su `apps/web/messages/it/achievements.json` +
> `apps/web/src/app/[locale]/achievements/page.tsx`.

```
[heading h1]   Obiettivi
[paragraph]    Traccia il tuo percorso di apprendimento e sblocca ricompense

── Riga 3 card ───────────────────────────────────────────────────────────────

[card] Progresso Livello
       Livello 1
       [barra progresso 0%]
       N MB per Livello 2

[card] Statistiche Studio
       Tempo Totale Studio
       0 minuti
       Questa Settimana
       0 sessioni

[card] Quick Stats          ← ⚠️ stringa IN INGLESE — FG-19
       0 / N sbloccati
       [barra 0%]
       Serie Attuale
       0 🔥

──────────────────────────────────────────────────────────────────────────────

[section heading] Serie di Studio
       [calendario vuoto]
       Studia oggi per mantenere la serie!

[section heading] Achievements   ← ⚠️ stringa IN INGLESE — FG-19
       [filter tabs] Tutti | Primi Passi | Serie | Livelli | Studio |
                     Maestria | Esplorazione | Tempo | Sociale | Indipendenza
       [achievement × N (tutti locked)]
            🔒 [nome achievement]
               Bloccato
               Completa l'obiettivo per sbloccare
```

---

## 4. Testo visibile atteso — Base utente, 2 sessioni (P7 Davide, Lv.1)

Identico a §3, eccetto la card "Statistiche Studio":

```
[card] Statistiche Studio
       Tempo Totale Studio
       N minuti   (proporzionale alle sessioni)
       Questa Settimana
       2 sessioni  (da trial-usage: "2 of used 10 Used")
```

> Il widget `trial-usage-dashboard` ("Your Trial Usage") è presente sulla home di
> Davide (s04.text.json pass2, FG-14) ma **non** è incluso in
> `achievements/page.tsx` → non appare sulla pagina premi.

---

## 5. Discrepanza semantica — FG-18 ★ nuovo

| Punto di accesso | Testo              | Fonte                                     |
| ---------------- | ------------------ | ----------------------------------------- |
| Pulsante sidebar | **"I miei premi"** | `s01.text.json` → `home-nav-progress`     |
| Heading pagina   | **"Obiettivi"**    | `messages/it/achievements.json` → `title` |

"Premi" (prizes/rewards) è concreto e bambino-centrico.
"Obiettivi" (goals/objectives) è astratto e adulto-formale.
Per un bambino con autismo che memorizza le etichette letteralmente, arrivare a
"Obiettivi" dopo aver cliccato "I miei premi" rompe la predittibilità → **FG-18, S2**.

---

## 6. Stringhe in inglese in `it/achievements.json` — FG-19 ★ nuovo (estende FG-14)

| Chiave                             | Valore IT attuale         | Valore IT atteso         |
| ---------------------------------- | ------------------------- | ------------------------ |
| `achievements.quickStats`          | `"Quick Stats"`           | `"Statistiche rapide"`   |
| `achievements.achievementUnlocked` | `"Achievement Unlocked!"` | `"Risultato sbloccato!"` |
| `achievements.closeNotification`   | `"Close notification"`    | `"Chiudi notifica"`      |
| `achievements.achievements`        | `"Achievements"`          | `"Traguardi"`            |

Verifica: **✅ strutturale** (grep diretto su `apps/web/messages/it/achievements.json`).

---

## 7. Focus trace atteso — P7 Davide (keyboard + TTS, Base)

La pagina `/achievements` **non espone bottoni `tts-*`** (verificato in
`achievements/page.tsx`; pattern diverso dalla home-intent che ha
`tts-intent-*` per ogni carta, e dal picker che ha `tts-subject-*` per ogni
materia).

Stop di focus attesi (ordine approssimativo; non verificato con cattura reale):

| Index | Elemento                                  | Note                                     |
| ----- | ----------------------------------------- | ---------------------------------------- |
| 1     | `skip-link` "Vai al contenuto principale" |                                          |
| 2–11  | Filter tab × 10 (Tutti … Indipendenza)    | 1 stop per categoria                     |
| 12–N  | Achievement card × N (locked)             | 1 Tab per card — numero da determinare   |
| N+1…  | Sidebar nav items                         | I Professori, Calendario, Impostazioni … |

Numero totale achievements non ispezionato in questo pass; atteso 20–40
sulla base delle 9 categorie. **Ogni card locked = Tab obbligatorio → FG-20.**
Assenza di TTS su ogni elemento → **FG-21 (❓ intenzionale da confermare).**

---

## 8. Procedura corretta di cattura per run futuri

```bash
# 1. Usa build di produzione — non dev server
npm run build && npm start

# 2. Bypassa il consent wall prima della cattura (vedi focus-group-capture.sh)
./scripts/focus-group-capture.sh http://localhost:3000/it/achievements \
  --persona P5-giulia --step T5

# 3. Output atteso: s04.text.json, s04.aria.yaml, s04.focus.json (per Davide)
```

> **FGOP-10 reminder** — artefatti da escludere se la cattura è ancora su dev:
> stop focus `NEXTJS-PORTAL`, badge `"1 Issue"` (overlay Next.js dev), doppi
> `"Accedi"` / `"Richiedi Accesso"` da layout variant entrambe focusabili.
> Dettaglio criteri: `verification.md` pass2.
