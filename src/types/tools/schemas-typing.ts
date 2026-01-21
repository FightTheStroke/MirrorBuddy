// ============================================================================
// OPENAI FUNCTION DEFINITIONS - TYPING TUTOR
// ============================================================================

export const TYPING_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'typing_tutor',
      description: 'Apri il tool "Impara a Digitare" per aiutare lo studente a migliorare la digitazione. Usa questo strumento quando lo studente vuole imparare o praticare la digitazione.',
      parameters: {
        type: 'object',
        properties: {
          lessonId: {
            type: 'string',
            description: 'ID della lezione consigliata (opzionale)',
          },
          level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Livello consigliato (opzionale)',
          },
          message: {
            type: 'string',
            description: 'Messaggio motivazionale dal Maestro (opzionale)',
          },
        },
      },
      required: [],
    },
  },
] as const;
