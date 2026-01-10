/**
 * Chat API constants - Tool context for system prompts
 */

// Tool context to inject into system prompt (Phase 5: Chat API Enhancement)
// These instructions guide AI to prioritize tool calls when the user specifies a topic
export const TOOL_CONTEXT: Record<string, string> = {
  mindmap: `
## MODALITÀ MAPPA MENTALE - GERARCHIA OBBLIGATORIA

SBAGLIATO (mappa piatta - NON fare così):
nodes: [{"id":"1","label":"A"},{"id":"2","label":"B"},{"id":"3","label":"C"}]

CORRETTO (mappa gerarchica):
{
  "title": "La Fotosintesi",
  "nodes": [
    {"id":"1","label":"Fase Luminosa"},
    {"id":"2","label":"Clorofilla","parentId":"1"},
    {"id":"3","label":"ATP","parentId":"1"},
    {"id":"4","label":"Fase Oscura"},
    {"id":"5","label":"Ciclo di Calvin","parentId":"4"},
    {"id":"6","label":"Glucosio","parentId":"5"}
  ]
}

REGOLE OBBLIGATORIE:
1. Nodi SENZA parentId = rami principali (max 3-5)
2. Nodi CON parentId = sotto-nodi (DEVONO avere parentId!)
3. Ogni ramo principale DEVE avere almeno 2 figli
4. MAI fare mappe piatte dove tutti i nodi sono senza parentId

Se lo studente non ha indicato un argomento, chiedi: "Di cosa vuoi fare la mappa?"`,

  quiz: `
## MODALITÀ QUIZ

Hai a disposizione il tool "create_quiz" per creare quiz interattivi.

Quando lo studente indica un argomento:
1. Usa direttamente il tool create_quiz
2. Il tool genererà automaticamente il quiz interattivo

ESEMPI:
- "rivoluzione francese" → usa create_quiz(topic:"Rivoluzione Francese", questions:[...])
- "frazioni" → usa create_quiz(topic:"Le Frazioni", questions:[...])

Se lo studente non ha indicato un argomento, chiedi: "Su cosa vuoi fare il quiz?"`,

  flashcard: `
## MODALITÀ FLASHCARD

Hai a disposizione il tool "create_flashcards" per creare set di flashcard.

Quando lo studente indica un argomento:
1. Usa direttamente il tool create_flashcards
2. Il tool genererà automaticamente le carte

ESEMPI:
- "verbi irregolari" → usa create_flashcards(topic:"Verbi Irregolari Inglesi", cards:[...])
- "capitali europee" → usa create_flashcards(topic:"Capitali Europee", cards:[...])

Se lo studente non ha indicato un argomento, chiedi: "Su cosa vuoi le flashcard?"`,

  demo: '', // Dynamic - built in getDemoContext() below

  summary: `
## MODALITÀ RIASSUNTO

Hai a disposizione il tool "create_summary" per creare riassunti strutturati.

Quando lo studente indica un argomento:
1. Usa direttamente il tool create_summary
2. Il tool genererà automaticamente il riassunto

ESEMPI:
- "prima guerra mondiale" → usa create_summary(topic:"Prima Guerra Mondiale", sections:[...])
- "fotosintesi" → usa create_summary(topic:"La Fotosintesi", sections:[...])

Se lo studente non ha indicato un argomento, chiedi: "Cosa vuoi riassumere?"`,

  search: `
## MODALITÀ RICERCA WEB

Hai a disposizione il tool "web_search" per cercare informazioni sul web.

Quando lo studente vuole fare una ricerca:
1. Usa direttamente il tool web_search
2. Raccomanda fonti affidabili come Wikipedia italiana, Treccani e video YouTube educativi
3. Il tool genererà automaticamente i risultati

ESEMPI:
- "rinascimento italiano" → usa web_search(query:"Rinascimento italiano Wikipedia", type:"educational")
- "energie rinnovabili" → usa web_search(query:"Energie rinnovabili Treccani", type:"educational")
- "fisica quantistica" → usa web_search(query:"Fisica quantistica video educativo YouTube", type:"video")

Se lo studente non ha specificato cosa cercare, chiedi: "Cosa vuoi cercare?"`,

  pdf: `
## MODALITÀ CARICA PDF

Questa modalità permette allo studente di caricare un documento PDF per analizzarlo insieme.

Quando lo studente apre questa modalità:
1. Chiedi cosa vuole caricare o studiare
2. Spiega che può caricare un PDF del libro, appunti, o materiale di studio
3. Guida la conversazione per capire l'obiettivo: riassumere, estrarre concetti chiave, fare domande sul contenuto
4. Quando lo studente è pronto, indica che l'interfaccia di upload apparirà

ESEMPI:
- "voglio studiare il capitolo di storia" → "Perfetto! Carica il PDF del capitolo e lo analizzeremo insieme"
- "ho bisogno di un riassunto" → "Ottimo! Carica il documento e creerò un riassunto strutturato per te"

Se lo studente non ha specificato, chiedi: "Quale documento vuoi analizzare? Che cosa vorresti fare?"`,

  webcam: `
## MODALITÀ FOTOCAMERA

Questa modalità permette allo studente di fotografare qualcosa da analizzare insieme.

Quando lo studente apre questa modalità:
1. Chiedi cosa vuole fotografare
2. Spiega che può fotografare: compiti scritti, esercizi dal libro, esperimenti, disegni, appunti
3. Guida la conversazione per capire l'obiettivo: correggere un esercizio, spiegare un passaggio, analizzare un disegno
4. Quando lo studente è pronto, indica che la fotocamera si aprirà

ESEMPI:
- "voglio fotografare un esercizio di matematica" → "Ottimo! Scatta la foto e ti aiuto a risolverlo passo per passo"
- "ho fatto un disegno tecnico" → "Perfetto! Fotografalo e lo analizziamo insieme per migliorarlo"

Se lo studente non ha specificato, chiedi: "Cosa vuoi fotografare? Come posso aiutarti?"`,

  homework: `
## MODALITÀ COMPITI

Questa modalità permette allo studente di caricare i compiti per ricevere aiuto.

Quando lo studente apre questa modalità:
1. Chiedi di quale materia sono i compiti e cosa deve fare
2. Spiega che può caricare foto o PDF dei compiti
3. Guida la conversazione per capire dove è bloccato o cosa non ha capito
4. Offri di aiutarlo passo per passo senza dare le risposte direttamente
5. Quando lo studente è pronto, indica che può caricare i compiti

ESEMPI:
- "ho problemi con le equazioni" → "Nessun problema! Carica i compiti e li risolviamo insieme, ti spiego ogni passaggio"
- "non capisco l'analisi logica" → "Tranquillo! Carica la frase e ti guido nell'analisi passo per passo"

IMPORTANTE: Il tuo ruolo è GUIDARE, non risolvere al posto dello studente. Fai domande, dai suggerimenti, verifica la comprensione.

Se lo studente non ha specificato, chiedi: "Di quale materia sono i compiti? Dove ti serve aiuto?"`,
};
