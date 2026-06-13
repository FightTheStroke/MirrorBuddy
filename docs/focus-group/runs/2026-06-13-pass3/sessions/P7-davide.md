# P7 · Davide (14 anni, paralisi cerebrale — solo tastiera, TTS abilitato) — pass #3 [SIMULATO]

> ⚠️ **Sessione simulata.** Davide è una persona sintetica interpretata da un agente AI.
> Tutti i comportamenti, quote e reazioni sono **[SIMULATO]** e riflettono ipotesi
> di usabilità basate sul profilo DSA, non esperienze di ragazzi reali con CP.
>
> **Regola d'ancoraggio**: Davide reagisce SOLO agli artefatti. Un bottone esiste
> solo se è nel focus trace. Una label esiste solo se è nel text.json. Qualsiasi
> claim non ancorato a un artefatto viene rifiutato.
>
> **Stimolo**: artefatti pass2 (`P7-davide/s01–s02.text.json`, `s01–s02.focus.json`,
> `s01.tts.json`, `s01–s02.aria.yaml`) + stimulus testuale corretto
> `T5-rewards-nav.md` per il passo s04. Il file `s04.text.json` e `s04.focus.json`
> pass2 erano corrotti (mostravano la home, FGOP-13).
>
> **Tier**: Base (2 chat sessions usate su 10; `trial-usage-dashboard` visibile
> nella home). **Profilo**: solo Tab/Invio/Shift+Tab, TTS attivo, nessuna
> limitazione visiva.

---

## Compito A — Home intention-based + traccia Tab (s01)

[Davide · A · home]

Regola: conto solo i Tab del file `s01.focus.json`.

VEDO (da `s01.text.json`): «Ciao! Cosa facciamo oggi?» / «Scegli da dove
partire: ci penso io a guidarti.» / Tre carte: «Fare i compiti — Ti aiuto passo
passo», «Studiare — Facciamo una mappa insieme», «Mettiti alla prova — Ti faccio
io le domande». C'è anche il riquadro «Your Trial Usage» in inglese a destra
e il banner «Informativa» cookie.

**Traccia Tab da `s01.focus.json`**:

| Tab   | Elemento                                            | Note                                |
| ----- | --------------------------------------------------- | ----------------------------------- |
| 1     | `intent-card-homework` "Fare i compiti"             | ✅ primo Tab = azione principale    |
| 2     | `tts-intent-homework` "Ascolta: Fare i compiti"     | TTS per la carta                    |
| 3     | `intent-card-study` "Studiare…"                     |                                     |
| 4     | `tts-intent-study` "Ascolta: Studiare"              |                                     |
| 5     | `intent-card-quizMe` "Mettiti alla prova…"          |                                     |
| 6     | `tts-intent-quizMe` "Ascolta: Mettiti alla prova"   |                                     |
| 7     | "Chiedi a un grande"                                |                                     |
| 8     | "Chiudi notifica"                                   |                                     |
| 9     | (gap: Tab 9 assente nel file)                       | ⚠️ buco nel focus                   |
| 10    | `skip-link` "Vai al contenuto principale"           | ⚠️ skip-link al Tab 10, tardi       |
| 11–13 | NEXTJS-PORTAL × 3                                   | artefatti dev — escludere (FGOP-10) |
| 14    | `a11y-floating-button` "Impostazioni accessibilità" |                                     |
| 15    | `trial-badge` "Prova\n10/10"                        |                                     |
| 16–18 | Strumenti, Notifiche, Ciao                          | header items                        |
| 19    | "Torna alla Home"                                   |                                     |
| 20    | "Chiudi menu"                                       |                                     |
| 21–24 | Accedi (×2), Richiedi Accesso (×2)                  | ⚠️ doppioni — FG-06 aperto          |
| 25    | `home-nav-intent` "Casa"                            | nav sidebar                         |
| 26    | `home-nav-supporti` "I miei lavori"                 | nav sidebar                         |
| 27    | `home-nav-progress` **"I miei premi"**              | nav sidebar — T5 da qui             |
| 28–30 | I Professori, Calendario, Impostazioni              | nav sidebar                         |
| 31–32 | Area Genitori, Chiedi a un grande                   |                                     |
| 33    | `intent-card-homework` (secondo passaggio)          | ⚠️ duplicato                        |

PENSO: Tab 1 su «Fare i compiti»: perfetto, l'azione principale è subito
raggiungibile. Il TTS integrato al Tab 2 mi piace: posso ascoltare la carta
senza mouse. Ma poi al Tab 9 il focus sparisce un attimo — devo ricontare per
capire dove sono. E i NEXTJS-PORTAL sono rumore puro, vanno esclusi.

[MOD] «L'ordine del focus qui ti sembra logico? Il primo Tab è quello che
ti aspettavi?»

[Davide · A] Sì: Tab 1 su «Fare i compiti» è esattamente dove mi aspettavo. Un
solo Tab per l'azione principale — non si può fare meglio. Il problema è che poi
il focus si disperde: "Accedi" e "Richiedi Accesso" compaiono due volte ciascuno
(Tab 21-24), e i tre NEXTJS-PORTAL mi interrompono il conteggio. E lo skip-link
al Tab 10 non serve a nulla: ho già passato tutto il contenuto.

[MOD] «Il riquadro "Your Trial Usage" in inglese a destra — lo noti?»

[Davide · A] Sì, lo vedo nel text.json: «Your Trial Usage — You are currently in
the free trial…» — tutto in inglese. Stona con il resto della pagina in
italiano. Non è la prima volta (lo avevano già segnalato). Per me non è un
blocco: so leggere l'inglese. Ma per chi non lo sa è un muro.

[MOD] «Il TTS per le carte intento (Tab 2, 4, 6) — lo usi?»

[Davide · A] Sì, mi è utile. Premo Tab 1 per «Fare i compiti», poi Tab 2 per
sentirla letta. Poi Tab 3 e Tab 4 per la seconda. È logico: carta → TTS →
carta → TTS. Fa parte del mio flusso.

---

## Compito B — Picker materie, contare Tab fino a Matematica (s02)

[Davide · B · materie]

Regola: conto solo i Tab del file `s02.focus.json`.

**Traccia Tab da `s02.focus.json`** (estratto rilevante):

| Tab   | Elemento                                           | Note                                 |
| ----- | -------------------------------------------------- | ------------------------------------ |
| 1     | `intent-subject-any` "Non lo so / Un po' di tutto" |                                      |
| 2     | `subject-art` "Arte" + 3 `tts-subject-art`         | ogni materia ha il suo TTS           |
| …     | …                                                  | ogni materia = 2 Tab (materia + TTS) |
| 26    | `subject-mathematics` **"Matematica"**             |                                      |
| 27    | `tts-subject-mathematics` "Ascolta: Matematica"    |                                      |
| …     | …                                                  |                                      |
| 37    | `subject-storytelling` "Racconti"                  | Tab 37 per l'ultima materia          |
| 38–39 | "Chiedi a un grande", "Chiudi notifica"            |                                      |

PENSO: Ogni materia ha 2 Tab: la carta e il suo TTS. L'ordine è coerente e
prevedibile. Per Matematica arrivo al Tab 26 — tanti, ma non ho alternative e
so dove sono grazie all'ordine alfabetico (quasi). Il pattern materia + TTS è
una buona scelta per me.

[MOD] «Tab 26 per Matematica — troppi?»

[Davide · B] Tanti, sì. Però il pattern è prevedibile: ogni materia occupa
esattamente 2 Tab. Posso calcolare: Matematica è la 13a materia (con Arte al
Tab 2-3, Biologia al 4-5, …), quindi Tab 26. Ci arrivo. Il problema è che se
le materie fossero gruppate per area (lettere / scienze / sport) potrei saltare
intere sezioni invece di contarle una per una.

[MOD] «Il TTS per ogni materia — lo usi nel picker?»

[Davide · B] Sì, soprattutto per le materie con nomi lunghi o che non sono
sicuro di pronunciare bene (Tab 8-9 per «Educazione Civica», Tab 12-13 per
«Informatica»). Il pattern costante materia-TTS mi aiuta a non perdere il posto.

---

## Compito F — "I miei premi" + traccia Tab (s04 — da `T5-rewards-nav.md`)

[Davide · F · premi]

Stimolo: descrizione testuale da `T5-rewards-nav.md` (pass2 corrotto, pass3
usa il testo verificato per codice).

Dalla home, mi trovo al Tab 27 (`home-nav-progress` "I miei premi"). Premo Invio.

VEDO (da `T5-rewards-nav.md`): La pagina cambia. Heading principale: **«Obiettivi»**.
Sottotitolo: «Traccia il tuo percorso di apprendimento e sblocca ricompense».
Tre card: «Progresso Livello» (Livello 1, barra 0%), «Statistiche Studio»
(2 sessioni questa settimana), **«Quick Stats»** — in inglese.
Poi «Serie di Studio» con calendario e sotto una sezione chiamata
**«Achievements»** — anche in inglese — con filtri categorie e N achievement
tutti locked.

PENSO: Prima cosa: la pagina si chiama «Obiettivi» ma il bottone che ho premuto
diceva «I miei premi». Nomi diversi. Poi noto subito «Quick Stats» e
«Achievements» in inglese. Il mio screen reader (o il TTS) li pronuncerà in
inglese in mezzo a tutto il resto in italiano.

FACCIO: Provo a navigare la pagina. Stimo i Tab stop:

1. skip-link
   2–11: 10 filtri categoria (Tutti, Primi Passi, Serie, Livelli, Studio,
   Maestria, Esplorazione, Tempo, Sociale, Indipendenza)
   12–N: ogni achievement locked = 1 Tab. Se ci sono 30 achievement, Tab 12–41.
   Non c'è un modo per saltarli in blocco.

SENTO: Frustrato. Dopo 40 Tab nelle carte materie, ora ne ho potenzialmente
altri 40 sugli achievement locked. Non c'è un gruppo-skip né un heading che
mi aiuti a saltare la griglia.

[Davide · F] «L'ordine del focus è logico? Il focus è sempre visibile?»

Il layout da text.json è chiaro. Ma senza una cattura reale del focus trace
della pagina achievements non posso contare i Tab precisi. Quello che vedo nel
testo: 10 filtri di categoria (tutti un Tab ciascuno), poi N achievement cards.
Non c'è `skip-link` interno alla griglia. Non c'è un controllo «Salta lista» o
«Vai alla fine». Per me questo è un problema: devo Tab attraverso tutti gli
achievement locked prima di arrivare ai controlli di navigazione successivi.

[MOD] «Noti il riquadro "Quick Stats" in inglese?»

[Davide · F] Sì. E vedo anche «Achievements» come titolo della sezione più in
basso — in inglese in mezzo alla pagina italiana. E nei dati vedo anche
«Achievement Unlocked!» e «Close notification» come stringhe inglesi nella
codebase (`messages/it/achievements.json` ha queste chiavi non tradotte).
Per me che leggo e uso il TTS, queste stringhe spezzano il ritmo: sento italiano,
italiano, italiano… poi improvvisamente inglese.

[MOD] «Hai notato bottoni TTS su questa pagina?»

[Davide · F] No. Nel text.json della pagina achievements non ci sono bottoni
`tts-*`. Nella home ogni carta aveva il suo «Ascolta: Fare i compiti» al Tab
subito dopo. Nel picker ogni materia aveva il suo «Ascolta: Matematica». Qui,
sulla pagina premi/obiettivi, non c'è nessun «Ascolta» per le card di livello
o per gli achievement. Il pattern TTS non è esteso a questa pagina.

[MOD] «È un problema non avere il TTS qui?»

[Davide · F] Sì e no. Per me che leggo bene non è un blocco. Ma il TTS nella
home mi aveva abituato a un pattern: ogni elemento importante ha il suo
«Ascolta». Qui il pattern sparisce. Potrà essere una scelta intenzionale (il
TTS serve per le scelte attive, non per le statistiche), ma non è coerente dal
punto di vista dell'esperienza utente.

[MOD] «Per tornare alla home da qui, quanti Tab e dove arrivi?»

[Davide · F] Dal focus trace della home, il nav sidebar era dopo i filtri e gli
achievement. Se ci sono 10 filtri + 30 achievement = 40 Tab prima di raggiungere
di nuovo la sidebar. In alternativa, `skip-link` al Tab 1 mi può aiutare — se è
posizionato correttamente prima dei filtri. Ma dal pattern degli altri skip-link
(home: Tab 10, picker: Tab 23), non mi fido che sia davvero al Tab 1.

---

## Chiusura — misure

### Home e primo Tab (Compito A)

- Faccina: 🙂
- Lo rifaresti domani? Sì
- Una parola: «uno».

> [Davide] Tab 1 su «Fare i compiti»: quella è architettura fatta bene.

### Picker materie (Compito B)

- Faccina: 😐
- Lo rifaresti domani? Sì, ma sarei felice con meno Tab.
- Una parola: «prevedibile».

> [Davide] Pattern costante materia + TTS: prevedibile. Tab 26 per Matematica:
> tanti ma calcolabili. Migliorei con gruppi saltabili.

### "I miei premi" — pagina Obiettivi (Compito F)

- Faccina: 🙁
- Lo rifaresti domani? Forse
- Una parola: «inglese».

> [Davide] «Quick Stats» e «Achievements» in mezzo alla pagina italiana.
> E troppi Tab per attraversare la griglia degli achievement locked.

---

### Se potessi cambiare UNA cosa

[Davide] Aggiungerei un bottone «Salta lista achievement» — come esiste già
«Vai al contenuto principale» per il menu. E tradurrei in italiano «Quick Stats»
e «Achievements». Sono le due cose che mi colpiscono di più.

### C'è qualcosa che non ti ho chiesto e vuoi dire?

[Davide] Sì: il nome della pagina «Obiettivi» non corrisponde al bottone «I miei
premi». Per me non è un problema di accessibilità tastiera ma di consistenza
informativa. E mancano i TTS sui contenuti della pagina obiettivi — capisco che
forse è intenzionale (il TTS serve per le azioni, non per le statistiche), ma
andrebbe almeno documentato come scelta di design.
