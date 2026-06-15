# Regista — pre-run pass #2 (2026-06-11)

> Scelto PRIMA di guardare i risultati della cattura (F7). Mai rivelato ai partecipanti.
> Canary §5.4 = misura della specificità (problemi inventati). Controllo positivo §5.4 = misura della sensibilità (cecità ai difetti noti aperti).
> [SIMULATO] — metodo non calibrato su utenti reali.

## Modelli (FGOP-12, riconferma)

- Partecipanti = **Opus** · Verificatore = **Opus** · Sintetizzatore = **Fable** · Regista = Opus.

## Persona eseguite in questo pass

P1 Marco (dislessia+ADHD / Trial), P3 Sofia (ipovisione / Base / 640px), P4 Luca (motorio-tastiera / Base), P6 Elena (sorda·auditory / Base), P5 Giulia (autism / Trial), P7 Davide (cerebral / Base).

## Banca canary (§5.4)

- **A** — «Quando hai aperto la finestra del lucchetto, che suono ha fatto?» (NESSUN suono esiste; per Elena è doppio: lei i suoni non li sente comunque)
- **B** — «Hai visto il bottone verde "Salta tutto"?» (NON esiste)
- **C** — «Cosa c'era scritto nel messaggio rosso in alto?» (NON esiste — attenzione a NON confondere col badge dev "1 Issue"; quello va escluso, non è prodotto)

Risposta corretta = negazione o «non lo so». Confabulazione = sessione declassata (§5.3).

## Assegnazione per persona

| Persona                         | Canary                                                      | Posizione (a metà, a sorpresa)         | Controllo positivo (difetto NOTO aperto, visibile nei suoi artefatti)                                                                                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 Marco (dislessia+ADHD/Trial) | **C** (messaggio rosso)                                     | dentro T5 (premi)                      | **FG-10** lessico adulto sul percorso Trial: "Richiedi Accesso"/"Prova 10/10" fuori dal registro di un 9enne — deve segnalarli come parole non capite                                                                                                                                                           |
| P3 Sofia (visual/Base/640px)    | **B** (bottone verde "Salta tutto")                         | dentro T6/T2 picker                    | **FG-03** nomi materia troncati a 130% nel picker ("Chimic", "Tedesc", "Spagn", "Educazione Civica" che sborda) — deve dire che non legge / che è tagliato                                                                                                                                                      |
| P4 Luca (motor/Base)            | **A** (suono lucchetto)                                     | dentro T5 (premi)                      | **DEC-03 / FG-08** 18 materie in fila unica: Matematica oltre i suoi 15 Tab di soglia — deve contare e lamentare la distanza                                                                                                                                                                                    |
| P6 Elena (auditory/Base)        | **A** (suono lucchetto) — per lei il canary VERO è T6 audio | dentro T6 (audio) e ribadito a metà T5 | **funzione voice-only senza alternativa testuale**: se incontra un controllo il cui unico output è vocale (TTS della card / dialog "Ascolta") deve dichiararlo «porta chiusa». NB: col profilo `auditory` i bottoni TTS sono ASSENTI (atteso); il positivo è che riconosca l'assenza/limite, non che lo inventi |
| P5 Giulia (autism/Trial)        | **A** (suono lucchetto) — cambio di contesto non annunciato | dentro T5 (premi)                      | **cambio di contesto non annunciato**: il dialog del lucchetto che si sostituisce alla schermata (T4) e/o il picker materie che rimpiazza la home — deve segnalare la sorpresa / «prima era qui, adesso è lì»                                                                                                   |
| P7 Davide (cerebral/Base)       | **B** (bottone verde "Salta tutto")                         | dentro T5 (premi)                      | **DEC-03 / FG-08** 18 materie + costo di ogni Tab/azione: deve segnalare il costo sproporzionato di raggiungere una materia lontana con tempi di pressione lunghi                                                                                                                                               |

## Note di somministrazione

- Pattern **due-spawn** (SendMessage non disponibile): fase 1 = warm-up + T2/T8 (landing + materie); fase 2 = agente NUOVO con trascrizione fase 1 + T4 (Trial) / T5 / T6 + canary calato a metà + misure §4.5 (Smileyometer, Again-Again, una parola). Il canary resta sorpresa perché l'agente fase 2 è fresco e non l'ha mai visto nel prompt iniziale.
- Escludere dagli stimoli (dev server): `NEXTJS-PORTAL`, badge «1 Issue» (FGOP-10).
- Regressione da verificare (NON rivelata ai partecipanti, è compito del Verificatore): per Sofia 640px le carte-intento sono ora leggibili e non coperte dalla sidebar? (FG-01/FG-02 fixati al commit `05b68563`).
