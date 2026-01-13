// ============================================================================
// TOOL SCHEMAS - OpenAI Function Definitions for Chat API
// ============================================================================

/**
 * OpenAI function definitions for chat API
 * These are passed to the `tools` parameter in chat completions
 */
export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_mindmap',
      description: `Crea una mappa mentale con GERARCHIA. OBBLIGATORIO usare parentId per i sotto-nodi.

SBAGLIATO (mappa piatta):
nodes: [{"id":"1","label":"A"},{"id":"2","label":"B"},{"id":"3","label":"C"}]

CORRETTO (mappa gerarchica):
nodes: [
  {"id":"1","label":"Geografia"},
  {"id":"2","label":"Posizione","parentId":"1"},
  {"id":"3","label":"Confini","parentId":"1"},
  {"id":"4","label":"Nord Italia","parentId":"2"}
]

REGOLE:
1. Nodi SENZA parentId = rami principali (max 4-5)
2. Nodi CON parentId = sotto-nodi (OBBLIGATORIO per creare gerarchia)
3. Almeno 2 livelli di profondità`,
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titolo centrale della mappa',
          },
          nodes: {
            type: 'array',
            description: 'Nodi gerarchici. IMPORTANTE: i sotto-nodi DEVONO avere parentId!',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID univoco (es: "1", "2", "3")' },
                label: { type: 'string', description: 'Testo breve (max 5 parole)' },
                parentId: { type: 'string', description: 'ID del padre. OMETTI SOLO per rami principali, INCLUDI per sotto-nodi!' },
              },
              required: ['id', 'label'],
            },
          },
        },
        required: ['title', 'nodes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_quiz',
      description: 'Crea un quiz interattivo con domande a risposta multipla. Usa questo strumento quando lo studente vuole testare la sua comprensione o ripassare.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento del quiz',
          },
          questions: {
            type: 'array',
            description: 'Domande del quiz',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'Testo della domanda' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Opzioni di risposta (4 opzioni)',
                },
                correctIndex: {
                  type: 'number',
                  description: 'Indice della risposta corretta (0-3)',
                },
                explanation: {
                  type: 'string',
                  description: 'Spiegazione della risposta corretta',
                },
              },
              required: ['question', 'options', 'correctIndex'],
            },
          },
        },
        required: ['topic', 'questions'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_demo',
      description: `Crea una demo interattiva descrivendo COSA vuoi visualizzare, non COME.

DESCRIVI in linguaggio naturale:
- Cosa deve mostrare la demo (concetto da visualizzare)
- Come deve essere l'interazione (cosa succede quando l'utente clicca/muove/cambia)
- Quale effetto WOW vuoi creare (cosa rende memorabile questa demo)
- Come si collega a quello che state studiando

ESEMPI DI DESCRIZIONI CREATIVE:
- "Voglio mostrare la moltiplicazione come un giardino: ogni numero è una fila di fiori, e moltiplicare significa creare un campo rettangolare. Lo studente sceglie quante file e quanti fiori per fila, e vede crescere il giardino animato."
- "Immagina le frazioni come una pizza: lo studente può tagliare la pizza in fette e colorarne alcune. Deve essere super colorato con la pizza che gira!"
- "Il sistema solare con i pianeti che orbitano a velocità diverse. Lo studente può accelerare il tempo e vedere come Mercurio fa più giri di Saturno."

NON scrivere codice HTML/CSS/JS - descrivi solo l'idea creativa!`,
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titolo accattivante della demo',
          },
          concept: {
            type: 'string',
            description: 'Il concetto educativo da visualizzare (es: moltiplicazione, frazioni, sistema solare)',
          },
          visualization: {
            type: 'string',
            description: 'DESCRIZIONE CREATIVA di come visualizzare il concetto. Usa metafore, analogie, idee originali. Più dettagli meglio è!',
          },
          interaction: {
            type: 'string',
            description: 'Come lo studente interagisce: cosa può cliccare, trascinare, cambiare? Cosa succede?',
          },
          wowFactor: {
            type: 'string',
            description: 'Cosa rende questa demo memorabile e divertente? Animazioni, sorprese, feedback?',
          },
        },
        required: ['title', 'concept', 'visualization', 'interaction'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Cerca contenuti educativi su web o YouTube. Usa quando lo studente ha bisogno di risorse esterne, video tutorial, o approfondimenti.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query di ricerca',
          },
          type: {
            type: 'string',
            enum: ['web', 'youtube', 'all'],
            description: 'Tipo di ricerca: web, youtube, o entrambi',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_flashcards',
      description: 'Crea un set di flashcard per il ripasso con spaced repetition. Usa quando lo studente vuole memorizzare definizioni, formule, o concetti.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento delle flashcard',
          },
          cards: {
            type: 'array',
            description: 'Le flashcard da creare',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string', description: 'Fronte della carta (domanda)' },
                back: { type: 'string', description: 'Retro della carta (risposta)' },
              },
              required: ['front', 'back'],
            },
          },
        },
        required: ['topic', 'cards'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_summary',
      description: 'Crea un riassunto strutturato di un argomento. Usa quando lo studente chiede una sintesi, un ripasso, o vuole i punti chiave.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento da riassumere',
          },
          sections: {
            type: 'array',
            description: 'Sezioni del riassunto',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Titolo della sezione' },
                content: { type: 'string', description: 'Contenuto della sezione' },
                keyPoints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Punti chiave della sezione',
                },
              },
              required: ['title', 'content'],
            },
          },
          length: {
            type: 'string',
            enum: ['short', 'medium', 'long'],
            description: 'Lunghezza del riassunto',
          },
        },
        required: ['topic', 'sections'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'open_student_summary',
      description: 'Apre l\'editor per far SCRIVERE un riassunto allo studente. NON genera contenuto automaticamente. Usa quando lo studente dice "devo fare un riassunto" o vuole scrivere lui stesso. Guida lo studente con il metodo maieutico.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento del riassunto che lo studente scriverà',
          },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'student_summary_add_comment',
      description: 'Aggiunge un commento inline al riassunto dello studente. Usa per dare feedback su parti specifiche del testo.',
      parameters: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            enum: ['intro', 'main', 'conclusion'],
            description: 'Sezione del riassunto',
          },
          startOffset: {
            type: 'number',
            description: 'Posizione iniziale del testo da commentare',
          },
          endOffset: {
            type: 'number',
            description: 'Posizione finale del testo da commentare',
          },
          text: {
            type: 'string',
            description: 'Il commento/feedback per lo studente',
          },
        },
        required: ['sectionId', 'startOffset', 'endOffset', 'text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_diagram',
      description: 'Crea un diagramma Mermaid (flowchart, sequence, class, ER). Usa per visualizzare processi, algoritmi, o relazioni tra entità.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento del diagramma',
          },
          diagramType: {
            type: 'string',
            enum: ['flowchart', 'sequence', 'class', 'er'],
            description: 'Tipo di diagramma',
          },
          mermaidCode: {
            type: 'string',
            description: 'Codice Mermaid per il diagramma',
          },
        },
        required: ['topic', 'diagramType', 'mermaidCode'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_timeline',
      description: 'Crea una linea del tempo per eventi storici o sequenze temporali. Ideale per storia e cronologie.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento della timeline (es. "Seconda Guerra Mondiale")',
          },
          period: {
            type: 'string',
            description: 'Periodo coperto (es. "1939-1945")',
          },
          events: {
            type: 'array',
            description: 'Eventi della timeline',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Data dell\'evento' },
                title: { type: 'string', description: 'Titolo dell\'evento' },
                description: { type: 'string', description: 'Descrizione dell\'evento' },
              },
              required: ['date', 'title'],
            },
          },
        },
        required: ['topic', 'events'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_archive',
      description: 'Cerca materiali salvati nell\'archivio dello studente (mappe mentali, quiz, flashcard, riassunti, demo, compiti). Usa quando lo studente chiede di rivedere qualcosa che ha già creato o quando vuoi recuperare contenuti precedenti per la conversazione.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Testo da cercare nei titoli e contenuti dei materiali',
          },
          toolType: {
            type: 'string',
            enum: ['mindmap', 'quiz', 'flashcard', 'summary', 'demo', 'homework', 'diagram', 'timeline'],
            description: 'Tipo di materiale da cercare (opzionale)',
          },
          subject: {
            type: 'string',
            description: 'Materia dei materiali da cercare (opzionale)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_calculator',
      description: 'Calcola espressioni matematiche. Usa quando lo studente ha bisogno di risolvere calcoli, verificare operazioni, o fare matematica rapida.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Espressione matematica da calcolare (es: "2 + 2", "sqrt(16)", "sin(45)")',
          },
        },
        required: ['expression'],
      },
    },
  },
] as const;
