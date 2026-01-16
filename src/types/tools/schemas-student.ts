// ============================================================================
// OPENAI FUNCTION DEFINITIONS - STUDENT INTERACTION TOOLS
// Open Student Summary, Add Comment
// ============================================================================

export const STUDENT_INTERACTION_DEFINITIONS = [
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
] as const;
