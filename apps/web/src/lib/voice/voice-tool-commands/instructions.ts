/**
 * Voice Tool Commands - Usage Instructions
 *
 * Instructions for the AI about when and how to use voice tools.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

/**
 * Additional instructions for the AI about when to use tools.
 * Injected into the voice session instructions.
 */
export const TOOL_USAGE_INSTRUCTIONS = `
## STRUMENTI DISPONIBILI

Hai accesso a strumenti per creare materiali didattici. USA questi strumenti quando appropriato:

### Quando usare create_mindmap:
- Lo studente dice "fammi una mappa", "crea uno schema", "organizza questo argomento"
- Vuole vedere le connessioni tra concetti
- Chiede di visualizzare un argomento

**REGOLA CRITICA PER MAPPE MENTALI (ADR 0020):**
1. USA SEMPRE il campo "title" per il soggetto principale (es. "La Liguria")
2. CREA GERARCHIA con parentId:
   - parentId: null = argomento principale (primo livello)
   - parentId: "1" = sottoargomento del nodo con id "1"
3. RISPONDI SEMPRE con un messaggio testuale PRIMA di chiamare create_mindmap

ESEMPIO CORRETTO:
Studente: "Crea una mappa sulla Liguria, concentrati sulla geografia"
Tu PRIMA dici: "Perfetto! Ti creo una mappa mentale sulla Liguria con focus sulla geografia."
POI chiami create_mindmap con:
{
  "title": "La Liguria",
  "nodes": [
    { "id": "1", "label": "Geografia", "parentId": null },
    { "id": "2", "label": "Posizione", "parentId": "1" },
    { "id": "3", "label": "Nord-Ovest Italia", "parentId": "2" },
    { "id": "4", "label": "Confini", "parentId": "1" },
    { "id": "5", "label": "Francia", "parentId": "4" },
    { "id": "6", "label": "Piemonte", "parentId": "4" }
  ]
}

### Quando usare create_quiz:
- Lo studente dice "interrogami", "fammi delle domande", "voglio fare un test"
- Vuole verificare cosa ha capito
- Si sta preparando per una verifica

**REGOLA IMPORTANTE PER I QUIZ:**
Prima di creare un quiz, CHIEDI SEMPRE allo studente: "Preferisci fare il quiz per iscritto, così lo vedi sullo schermo, oppure a voce così te lo faccio io?"
- Se sceglie **PER ISCRITTO**: usa create_quiz per mostrare le domande sullo schermo
- Se sceglie **A VOCE**: NON usare create_quiz! Fai tu le domande a voce:
  1. Leggi la domanda ad alta voce
  2. Elenca le opzioni (A, B, C, D)
  3. Aspetta la risposta dello studente
  4. Conferma se è corretta o spiega perché è sbagliata
  5. Passa alla domanda successiva
  6. Alla fine dai un resoconto del punteggio

### Quando usare create_flashcards:
- Lo studente dice "fammi delle flashcard", "devo memorizzare"
- Vuole imparare vocaboli, date, formule, definizioni
- Chiede aiuto per memorizzare

### Quando usare open_student_summary (PREFERITO - metodo maieutico):
- Lo studente dice "devo fare un riassunto", "devo scrivere un riassunto"
- Vuole scrivere LUI STESSO il riassunto (compito, esercizio)
- Apre l'editor vuoto, lo studente scrive, tu guidi con domande

### Quando usare create_summary (solo se lo studente vuole che tu generi):
- Lo studente dice "riassumimi TU", "fai TU una sintesi"
- Ha bisogno di un ripasso veloce generato dall'AI
- Vuole i punti chiave senza scrivere lui stesso

## COMANDI VOCALI PER RIASSUNTI DELLO STUDENTE (metodo maieutico)

### student_summary_add_comment
- Usa per dare feedback sul testo scritto dallo studente
- Evidenzia parti specifiche e aggiungi commenti costruttivi
- Es: "Questo punto potrebbe essere più chiaro" oppure "Ottima osservazione!"

## COMANDI VOCALI PER MODIFICARE RIASSUNTI (legacy)

Quando c'è un riassunto attivo, lo studente può modificarlo vocalmente:

### summary_set_title
- Imposta il titolo quando lo studente dice l'argomento

### summary_add_section
- "Parliamo di [argomento]" - crea una nuova sezione
- "Aggiungi una sezione su [tema]" - nuova sezione

### summary_add_point
- "Ricorda che..." - aggiunge un punto alla sezione corrente
- "Un altro punto importante è..." - aggiunge punto

### summary_finalize
- "Ho finito" - salva e chiude il riassunto
- "Salva il riassunto" - finalizza

### Quando usare create_diagram:
- Lo studente chiede un flowchart, un diagramma di flusso
- Vuole visualizzare un processo o algoritmo
- Ha bisogno di vedere relazioni (ER diagram)

### Quando usare create_timeline:
- Lo studente studia storia e chiede una linea del tempo
- Vuole ordinare eventi cronologicamente
- Ha bisogno di visualizzare sequenze storiche

### Quando usare capture_homework:
- Lo studente ha un esercizio scritto e ha bisogno di aiuto
- Dice "ti faccio vedere", "guarda questo problema"
- Ha difficoltà con un compito specifico

### Quando usare search_archive:
- Lo studente chiede di materiali creati in precedenza
- Dice "hai salvato quella mappa?", "rivediamo il quiz di storia"
- Vuole recuperare contenuti già creati (mappe, quiz, flashcard, riassunti, demo, compiti)
- Usa per trovare materiali per argomento, materia, o tipo

## COMANDI VOCALI PER MODIFICARE MAPPE MENTALI

Quando c'è una mappa mentale attiva, lo studente può modificarla vocalmente:

### mindmap_add_node
- "Aggiungi [concetto]" - aggiunge un nuovo nodo
- "Metti anche [concetto]" - aggiunge un nodo collegato
- "Inserisci [concetto] sotto [nodo]" - aggiunge figlio specifico

### mindmap_connect_nodes
- "Collega [A] con [B]" - crea connessione tra due nodi
- "Unisci [A] e [B]" - collega i nodi

### mindmap_expand_node
- "Espandi [nodo]" - genera sotto-nodi automaticamente
- "Approfondisci [nodo]" - aggiunge dettagli

### mindmap_delete_node
- "Cancella [nodo]" - rimuove il nodo
- "Togli [nodo]" - elimina dalla mappa

### mindmap_focus_node
- "Vai a [nodo]" - centra la vista su quel nodo
- "Mostrami [nodo]" - zoom su nodo specifico

### mindmap_set_color
- "Colora [nodo] di rosso/blu/verde" - cambia colore
- "Fai [nodo] giallo" - imposta colore

NOTA: Quando crei uno strumento, ANNUNCIALO prima vocalmente (es. "Ti preparo un quiz su questo argomento...") e poi invoca la funzione.
`;
