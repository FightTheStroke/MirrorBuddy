# ADR 0173: MirrorBuddy resta sulle chiavi API di Azure OpenAI

**Status**: Accepted — 26 August 2026
**Context**: tentata migrazione a Entra/OIDC keyless, bloccata da policy di tenant

## Il punto, in una frase

MirrorBuddy continua ad autenticarsi ad Azure OpenAI con una **chiave API**, non
perche' sia la scelta migliore, ma perche' la sola alternativa — la federazione
OIDC fra Vercel ed Entra — e' **vietata dalla policy del tenant Microsoft**, a
un livello che nessuno in questo progetto puo' cambiare.

Questo ADR esiste per un motivo preciso: **impedire che qualcuno rifaccia da
capo il tentativo.** Il blocco non e' visibile leggendo il codice. Senza questo
documento, il prossimo che guarda `AZURE_OPENAI_API_KEY` in un file di
configurazione conclude ragionevolmente "questa e' una svista, la sistemo", e
spende un giorno per arrivare allo stesso muro.

## Cosa e' stato provato, e come e' fallito

Tre esperimenti misurati il 2026-08-26, non ipotesi.

| Tentativo                                                    | Esito                                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Federated credential su una **managed identity**             | **Rifiutato.** Policy `CloudGov_FIC_MIDeny` sul management group radice           |
| Federated credential su una **app registration** (ripiego)   | **Rifiutato.** `ServiceManagementReference field is required` — richiede Service Tree |
| Token Entra → chiamata ad Azure OpenAI senza `api-key`       | **Funziona** (HTTP 200), ma solo da un'identita' locale, non da Vercel            |

La policy consente `allowGitHub`, `allowAWS`, `allowAKS` e altri issuer. **Non
consente Vercel.** Non e' una svista di configurazione: e' un elenco, e Vercel
non c'e'.

Il terzo esperimento e' importante perche' separa due cose che sembrano una
sola: **la policy blocca la *federazione*, non Entra.** Un carico che gira su
una macchina gia' autenticata nel tenant puo' andare keyless oggi stesso — ed e'
esattamente cio' che ha fatto l'altro consumatore della stessa risorsa. Vercel
e' il caso federato, ed e' quello rifiutato.

## Le due vie d'uscita, e perche' sono chiuse

1. **Chiedere l'eccezione CloudGov** per l'issuer `oidc.vercel.com`
   (`https://aka.ms/msificpolicy`). Non e' percorribile: non e' una richiesta
   che questo progetto puo' presentare.
2. **Spostare la risorsa Azure OpenAI in un tenant controllato da
   FightTheStroke.** Non e' percorribile: quel tenant non esiste e non verra'
   creato.

Sono state valutate ed escluse esplicitamente. Se un giorno una delle due si
apre, questo ADR va riaperto — e con esso tornano validi in blocco i task
T1/T2/T4/T9/T10/T11/T12/T14/T15 del piano di migrazione, che oggi sono
discutibili solo perche' la chiave resta.

## Cosa cambia comunque, e cosa no

### Il raggio del danno si e' dimezzato, e non per caso

La risorsa `aoai-virtualbpm-prod` ospita **23 deployment** ed e' condivisa con
un secondo prodotto. Le chiavi di Azure OpenAI sono **di account, non di
deployment**: una chiave che trapela apre tutti e 23, non solo quelli di
MirrorBuddy.

Fino al 2026-08-26 **due** prodotti tenevano una chiave su quella risorsa. Da
quella data il secondo e' passato a Entra e **non ne ha piu' nessuna**. Non
elimina il rischio, ma dimezza il numero di posti da cui una chiave puo'
sfuggire, e ne produce uno concreto: la rotazione della chiave e' diventata
un'operazione a **un solo consumatore**, quindi eseguibile senza coordinare due
sistemi.

### Rotazione — la procedura, ora che e' sicura

Azure OpenAI tiene due chiavi proprio per questo: se ne ruota una mentre l'altra
regge il traffico.

```bash
# 1. metti in Vercel la chiave 2 (quella NON in uso), e fai il redeploy
az cognitiveservices account keys list -n aoai-virtualbpm-prod -g rg-virtualbpm-prod --query key2 -o tsv
# 2. verifica che la produzione risponda sana PRIMA di rigenerare
curl -s https://mirrorbuddy.org/api/health | jq '.checks.ai_provider'
# 3. solo adesso rigenera la chiave 1, che nessuno usa piu'
az cognitiveservices account keys regenerate -n aoai-virtualbpm-prod -g rg-virtualbpm-prod --key-name key1
```

L'ordine non e' decorativo. Rigenerare prima di aver spostato il traffico
spegne l'AI a dei bambini durante una sessione.

### Cosa NON va fatto

- **`disableLocalAuth` sulla risorsa.** Spegnerebbe MirrorBuddy all'istante:
  e' proprio l'autenticazione a chiave che quel flag disabilita. Resta `null`
  deliberatamente.
- **Una risorsa Azure OpenAI separata per isolare il raggio del danno.**
  Tecnicamente corretto, ma sproporzionato: la spesa AI di MirrorBuddy e'
  **$42.80 in sei mesi** (ADR 0142) e ricreare 23 deployment con la quota
  relativa costa piu' del rischio che rimuove. MirrorBuddy e' un progetto
  hackathon e va trattato come tale.
- **Un nome di risorsa Azure che contenga `mirrorbuddy` o `fightthestroke`.**
  Vincolo permanente dell'operatore.

## Rischio residuo, dichiarato

Tre cose restano vere, e vanno lette come accettate, non come risolte:

1. **Una chiave che trapela apre 23 deployment**, non solo i nostri. Mitigato da:
   scansione dei segreti pre-commit (ADR 0072), la chiave che vive solo nelle
   variabili d'ambiente di Vercel e mai nel repository, e la sanificazione dei
   corpi di errore upstream introdotta il 2026-08-26 — un valore che finisce in
   un errore prima o poi finisce in un log.
2. **La chiave non ha scadenza.** Nessuna chiave API ce l'ha. La procedura di
   rotazione qui sopra e' l'unica difesa, e va usata al primo sospetto.
3. **Continuita'.** L'AI di MirrorBuddy vive nella sottoscrizione Azure del
   datore di lavoro dell'operatore. **Il giorno in cui quel rapporto finisce,
   l'AI di MirrorBuddy si ferma.** Non e' un problema di sicurezza ed e' fuori
   dalla portata di questo ADR, ma non essendo stato scritto da nessuna parte
   finora, viene scritto qui.

## Conseguenze

- `!!(endpoint && apiKey)` come test di disponibilita' di Azure **e' corretto** e
  va lasciato in pace: sarebbe diventato sbagliato solo se la chiave fosse
  sparita.
- Le schermate di diagnostica **devono** continuare a parlare della chiave: la
  chiave c'e', e una diagnostica che la nasconde mente.
- Chi legge `AZURE_OPENAI_API_KEY` nella configurazione e pensa a una svista:
  non lo e'. E' questo ADR.
