// ============================================================================
// OPENAI FUNCTION DEFINITIONS - EDUCATIONAL TOOLS
// Mindmap, Quiz, Flashcards, Summary, Diagram, Timeline
// ============================================================================

export const EDUCATIONAL_TOOL_DEFINITIONS = [
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
          difficulty: {
            type: 'number',
            description: 'Difficolta generale (1-5)',
            minimum: 1,
            maximum: 5,
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
                difficulty: {
                  type: 'number',
                  description: 'Difficolta domanda (1-5)',
                  minimum: 1,
                  maximum: 5,
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
] as const;
