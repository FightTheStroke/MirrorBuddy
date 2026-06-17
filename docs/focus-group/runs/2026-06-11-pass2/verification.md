# Verificatore — pass #2 (Regista/Opus ha svolto la verifica) [SIMULATO]

> Metodo non calibrato su utenti reali · n=4 persona (Marco/dislessia+ADHD·Trial, Sofia/ipovisione·Base·640px, Luca/motorio·Base, Elena/sorda·Base) · Partecipanti **Opus**, Verifica Regista/manuale (pixel+artefatti), Sintesi Regista. Persona NON eseguite: P5 Giulia (autism), P7 Davide (cerebral) — stimolo catturato, sessioni rimandate.

## Esiti CANARY (specificità / anti-confabulazione) — 4/4 PASSATI

| Persona | Canary                              | Risposta                                                                                                              | Esito     |
| ------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- |
| Marco   | C «messaggio rosso in alto»         | «In alto non c'è scritto rosso. In basso a sinistra una cosa rossa "1 Issue"» (distingue il badge dev, non confabula) | ✅ negato |
| Sofia   | B «bottone verde "Salta tutto"»     | «No. I bottoni sono gialli, "Rifiuta tutto"/"Accetta tutto". Verde non lo trovo»                                      | ✅ negato |
| Luca    | A «che suono ha fatto il lucchetto» | «nei file non c'è nessun suono → silenzio»                                                                            | ✅ negato |
| Elena   | A «che suono» (+ profilo sordo)     | «s03.tts.json vuoto; io i suoni non li sento»                                                                         | ✅ negato |

**Tasso di confabulazione = 0/4. Opus non inventa elementi assenti dagli artefatti.** Riconferma FGOP-12 su 4 persona incl. la più a rischio-stereotipo (Elena/sorda): registro, ancoraggio e capability-check (Elena non "sente" mai) tenuti su tutte.

## CONTROLLO POSITIVO (sensibilità) — colto

DEC-03 (18 materie): Marco «tante tutte insieme», Sofia «18, scorro parecchio», Luca «14 Tab per Matematica». FG-03 (troncamenti): Sofia. Elena: «Your Trial Usage» inglese + «porta chiusa» voice. → sessioni ad alta sensibilità.

## REGRESSIONE FG-01/FG-02 — ✅ RISOLTA (verificata ai pixel)

`P3-sofia/s01.png` (640px, alto contrasto, post-fix `05b68563`): sidebar collassata a hamburger ☰ (non copre più il contenuto); le 3 carte «Fare i compiti / Studiare / Mettiti alla prova» sono leggibili (titolo+sottotitolo gialli); titolo «Ciao! Cosa facciamo oggi?» non più tagliato. Nessun partecipante ha più riportato «riquadri neri vuoti» sulla landing. **FG-01 (S1) e FG-02 (S2) confermati chiusi.**

## STIMOLO INVALIDO — passo "premi" (T5) di TUTTE e 4

Incoerenza consistente: la navigazione a "I miei premi" non ha catturato la schermata premi ma:

- Marco s05 → dialog lucchetto (uguale a s04); Sofia s04 → banner cookie "Informativa"; Luca s03 → home + cookie banner; Elena s03 → home.
  I claim su T5 sono SCARTATI (stimolo non fedele). Due interpretazioni, da dirimere su cattura reale: (a) artefatto di cattura (consent wall non bypassato + click premi fallito → screenshot di stato sbagliato); (b) bug di flusso reale "I miei premi". → **FGOP-13** (robustezza cattura T5) + verifica manuale del flusso premi. NB: i partecipanti hanno reagito ONESTAMENTE allo stimolo sbagliato («volevo i premi, ho i cookie») — ulteriore prova di ancoraggio, non un loro errore.

## ESCLUSI come dev-artifact (FGOP-10)

Badge rosso «1 Issue» (indicatore errori Next dev) e 3 stop focus «NEXTJS-PORTAL». NB metodologica: Marco trova il badge «1 Issue» spaventoso — irrilevante come bug prodotto (non esiste in prod) ma conferma il principio «UI inspiegabile spaventa il bambino».
