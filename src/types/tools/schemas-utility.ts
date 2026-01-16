// ============================================================================
// OPENAI FUNCTION DEFINITIONS - UTILITY TOOLS
// Web Search, Calculator, Archive Search
// ============================================================================

export const UTILITY_TOOL_DEFINITIONS = [
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
