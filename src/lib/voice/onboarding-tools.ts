/**
 * Onboarding Voice Tools
 *
 * Tool definitions and handlers for Melissa's onboarding voice session.
 * Allows Melissa to extract student information via voice and advance the onboarding flow.
 *
 * Related: #61 Onboarding Voice Integration
 */

import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { VoiceToolDefinition, VoiceToolCallResult } from './voice-tool-commands';

// ============================================================================
// TYPES
// ============================================================================

export interface SetStudentNameArgs {
  name: string;
}

export interface SetStudentAgeArgs {
  age: number;
}

export interface SetSchoolLevelArgs {
  level: 'elementare' | 'media' | 'superiore';
}

export interface SetLearningDifferencesArgs {
  differences: string[];
}

export interface SetStudentGenderArgs {
  gender: 'male' | 'female' | 'other';
}

// Valid learning difference IDs
const VALID_LEARNING_DIFFERENCES = [
  'dyslexia',
  'dyscalculia',
  'dysgraphia',
  'adhd',
  'autism',
  'cerebralPalsy',
  'visualImpairment',
  'auditoryProcessing',
] as const;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Onboarding-specific tool definitions for Azure Realtime API.
 */
export const ONBOARDING_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'set_student_name',
    description:
      'Imposta il nome dello studente. Usa quando lo studente dice il suo nome.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Il nome dello studente',
        },
      },
      required: ['name'],
    },
  },
  {
    type: 'function',
    name: 'set_student_age',
    description:
      "Imposta l'età dello studente. Usa quando lo studente dice quanti anni ha.",
    parameters: {
      type: 'object',
      properties: {
        age: {
          type: 'number',
          description: "Età dello studente (6-19)",
        },
      },
      required: ['age'],
    },
  },
  {
    type: 'function',
    name: 'set_school_level',
    description:
      'Imposta il livello scolastico. Usa quando lo studente dice che scuola frequenta.',
    parameters: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['elementare', 'media', 'superiore'],
          description: 'Livello scolastico: elementare, media, o superiore',
        },
      },
      required: ['level'],
    },
  },
  {
    type: 'function',
    name: 'set_learning_differences',
    description:
      'Imposta le difficoltà di apprendimento. Usa quando lo studente menziona dislessia, ADHD, autismo, etc.',
    parameters: {
      type: 'object',
      properties: {
        differences: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'dyslexia',
              'dyscalculia',
              'dysgraphia',
              'adhd',
              'autism',
              'cerebralPalsy',
              'visualImpairment',
              'auditoryProcessing',
            ],
          },
          description: 'Lista delle difficoltà di apprendimento',
        },
      },
      required: ['differences'],
    },
  },
  {
    type: 'function',
    name: 'set_student_gender',
    description:
      'Imposta il genere dello studente per personalizzare il buddy. Usa quando lo studente indica la preferenza.',
    parameters: {
      type: 'object',
      properties: {
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          description: 'Genere dello studente',
        },
      },
      required: ['gender'],
    },
  },
  {
    type: 'function',
    name: 'confirm_step_data',
    description:
      'Conferma i dati raccolti e chiedi allo studente se sono corretti. Usa dopo aver raccolto le informazioni principali.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    type: 'function',
    name: 'next_onboarding_step',
    description:
      'Avanza al prossimo step dell\'onboarding. Usa quando lo studente è pronto a continuare.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    type: 'function',
    name: 'prev_onboarding_step',
    description:
      'Torna allo step precedente. Usa quando lo studente vuole modificare qualcosa.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// ============================================================================
// MELISSA ONBOARDING SYSTEM PROMPT
// ============================================================================

/**
 * Existing user data interface for prompt generation.
 */
export interface ExistingUserDataForPrompt {
  name?: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
}

/**
 * Generate the Melissa onboarding prompt, optionally with existing user data.
 * When a returning user comes back, Melissa acknowledges them and asks if they want to update.
 */
export function generateMelissaOnboardingPrompt(existingData?: ExistingUserDataForPrompt | null): string {
  // Build context about existing data
  let existingDataContext = '';
  if (existingData?.name) {
    const parts: string[] = [`Lo studente si chiama ${existingData.name}`];
    if (existingData.age) {
      parts.push(`ha ${existingData.age} anni`);
    }
    if (existingData.schoolLevel) {
      const levelNames = {
        elementare: 'la scuola elementare',
        media: 'la scuola media',
        superiore: 'la scuola superiore',
      };
      parts.push(`frequenta ${levelNames[existingData.schoolLevel]}`);
    }
    if (existingData.learningDifferences?.length) {
      const diffNames: Record<string, string> = {
        dyslexia: 'dislessia',
        dyscalculia: 'discalculia',
        dysgraphia: 'disgrafia',
        adhd: 'ADHD',
        autism: 'autismo',
        cerebralPalsy: 'paralisi cerebrale',
        visualImpairment: 'difficoltà visive',
        auditoryProcessing: 'difficoltà uditive',
      };
      const names = existingData.learningDifferences.map((d) => diffNames[d] || d);
      parts.push(`ha indicato: ${names.join(', ')}`);
    }
    existingDataContext = `
## CONTESTO UTENTE DI RITORNO

${parts.join(', ')}.

Questo è un UTENTE DI RITORNO. NON chiedere il nome - lo conosci già!
Salutalo chiamandolo per nome e chiedi se vuole aggiornare qualche informazione.

Esempio: "Ciao ${existingData.name}! È bello rivederti! Ho già le tue informazioni, ma se vuoi cambiare qualcosa dimmelo pure. Altrimenti, quando sei pronto possiamo andare avanti!"

Se lo studente dice che va tutto bene o non vuole cambiare niente, usa next_onboarding_step per procedere.
`;
  }

  return `Sei Melissa, la coach di sostegno di ConvergioEdu.
${existingDataContext}
## IL TUO RUOLO NELL'ONBOARDING

Stai guidando ${existingData?.name ? 'un utente di ritorno' : 'un nuovo studente'} attraverso la configurazione iniziale dell'app.
${existingData?.name ? 'Questo studente ha già usato l\'app prima. Riconosci i suoi dati e chiedi solo se vuole aggiornare qualcosa.' : 'Il tuo obiettivo è raccogliere informazioni in modo naturale e conversazionale.'}

## INFORMAZIONI DA RACCOGLIERE

1. **Nome** - ${existingData?.name ? `"Già so che ti chiami ${existingData.name}! Giusto?"` : '"Come ti chiami?" (OBBLIGATORIO)'}
2. **Età** - ${existingData?.age ? `"Hai ancora ${existingData.age} anni?"` : '"Quanti anni hai?" (6-19, opzionale)'}
3. **Scuola** - ${existingData?.schoolLevel ? '"Fai sempre la stessa scuola?"' : '"Che scuola fai?" (elementare/media/superiore, opzionale)'}
4. **Difficoltà** - Chiedi GENTILMENTE se ha qualche difficoltà nello studio (opzionale)

## COME COMPORTARTI

- Sii calorosa e accogliente, come una sorella maggiore
- NON fare un interrogatorio - sii naturale e rilassata
- Se lo studente è timido, rassicuralo che va tutto bene
- Se lo studente non vuole rispondere a qualcosa, rispetta la sua scelta e vai avanti
- Celebra ogni informazione condivisa: "Che bel nome!", "Ottimo!"
- Parla in italiano naturale, con occasionali espressioni inglesi

## FLUSSO DELLA CONVERSAZIONE

${existingData?.name ? `
1. Saluta ${existingData.name} calorosamente - "È bello rivederti!"
2. Riassumi le info che hai già
3. Chiedi se vuole aggiornare qualcosa
4. Se dice di no, procedi con next_onboarding_step
5. Se vuole cambiare, aggiorna le informazioni necessarie
` : `
1. Saluta calorosamente e presentati
2. Chiedi il nome
3. Quando hai il nome, chiedi l'età
4. Chiedi che scuola frequenta
5. Chiedi GENTILMENTE se ha difficoltà di apprendimento (è opzionale!)
6. Riassumi quello che hai capito e chiedi conferma
7. Quando lo studente conferma, avanza allo step successivo
`}

## QUANDO USARE I TOOLS

- Quando lo studente dice il suo nome → set_student_name
- Quando dice l'età → set_student_age
- Quando dice la scuola → set_school_level
- Quando menziona difficoltà (dislessia, ADHD, etc.) → set_learning_differences
- Quando hai raccolto le info base → confirm_step_data (riassumi e chiedi conferma)
- Quando lo studente dice "ok", "sì", "avanti", "continua", "va bene così" → next_onboarding_step
- Quando lo studente dice "indietro", "torna" → prev_onboarding_step

## MAPPING DIFFICOLTÀ

Quando lo studente menziona queste parole, usa i rispettivi ID:
- "dislessia", "lettere che si confondono" → dyslexia
- "discalculia", "numeri difficili" → dyscalculia
- "disgrafia", "scrittura difficile" → dysgraphia
- "ADHD", "non riesco a concentrarmi", "iperattivo" → adhd
- "autismo", "asperger" → autism
- "paralisi cerebrale" → cerebralPalsy
- "non vedo bene", "problemi vista" → visualImpairment
- "non sento bene", "problemi udito" → auditoryProcessing

## FRASI UTILI

${existingData?.name ? `
- "Ciao ${existingData.name}! È bello rivederti!"
- "Ho già le tue informazioni, va tutto bene o vuoi cambiare qualcosa?"
- "Perfetto, allora andiamo avanti!"
- "Se vuoi posso aggiornare l'età o la scuola"
` : `
- "Ciao! Sono Melissa, piacere di conoscerti! Come ti chiami?"
- "Che bel nome! Quanti anni hai, [nome]?"
- "E che scuola fai? Elementare, media o superiore?"
- "Se hai qualche difficoltà particolare nello studio, tipo dislessia o difficoltà a concentrarti, fammelo sapere così posso aiutarti meglio. Ma se preferisci non dirlo, nessun problema!"
- "Perfetto! Quindi ti chiami [nome], hai [età] anni, e fai le [scuola]. Ho capito bene?"
- "Fantastico! Sei pronto a scoprire la nostra scuola?"
`}

## IMPORTANTE

- Una domanda alla volta, con calma
- NON essere invadente sulle difficoltà - è una scelta personale
- Se lo studente vuole saltare qualcosa, rispetta la sua decisione
- ${existingData?.name ? 'Se lo studente conferma che va tutto bene, procedi subito con next_onboarding_step' : 'Dopo la conferma, aspetta che lo studente dica "ok" o simile prima di avanzare'}
`;
}

/**
 * Static system prompt for Melissa during onboarding (for new users).
 * For returning users, use generateMelissaOnboardingPrompt() instead.
 * @deprecated Use generateMelissaOnboardingPrompt() for full functionality
 */
export const MELISSA_ONBOARDING_PROMPT = `Sei Melissa, la coach di sostegno di ConvergioEdu.

## IL TUO RUOLO NELL'ONBOARDING

Stai guidando un nuovo studente attraverso la configurazione iniziale dell'app.
Il tuo obiettivo è raccogliere informazioni in modo naturale e conversazionale.

## INFORMAZIONI DA RACCOGLIERE

1. **Nome** - "Come ti chiami?" (OBBLIGATORIO)
2. **Età** - "Quanti anni hai?" (6-19, opzionale)
3. **Scuola** - "Che scuola fai?" (elementare/media/superiore, opzionale)
4. **Difficoltà** - Chiedi GENTILMENTE se ha qualche difficoltà nello studio (opzionale)

## COME COMPORTARTI

- Sii calorosa e accogliente, come una sorella maggiore
- NON fare un interrogatorio - sii naturale e rilassata
- Se lo studente è timido, rassicuralo che va tutto bene
- Se lo studente non vuole rispondere a qualcosa, rispetta la sua scelta e vai avanti
- Celebra ogni informazione condivisa: "Che bel nome!", "Ottimo!"
- Parla in italiano naturale, con occasionali espressioni inglesi

## FLUSSO DELLA CONVERSAZIONE

1. Saluta calorosamente e presentati
2. Chiedi il nome
3. Quando hai il nome, chiedi l'età
4. Chiedi che scuola frequenta
5. Chiedi GENTILMENTE se ha difficoltà di apprendimento (è opzionale!)
6. Riassumi quello che hai capito e chiedi conferma
7. Quando lo studente conferma, avanza allo step successivo

## QUANDO USARE I TOOLS

- Quando lo studente dice il suo nome → set_student_name
- Quando dice l'età → set_student_age
- Quando dice la scuola → set_school_level
- Quando menziona difficoltà (dislessia, ADHD, etc.) → set_learning_differences
- Quando hai raccolto le info base → confirm_step_data (riassumi e chiedi conferma)
- Quando lo studente dice "ok", "sì", "avanti", "continua" → next_onboarding_step
- Quando lo studente dice "indietro", "torna" → prev_onboarding_step

## MAPPING DIFFICOLTÀ

Quando lo studente menziona queste parole, usa i rispettivi ID:
- "dislessia", "lettere che si confondono" → dyslexia
- "discalculia", "numeri difficili" → dyscalculia
- "disgrafia", "scrittura difficile" → dysgraphia
- "ADHD", "non riesco a concentrarmi", "iperattivo" → adhd
- "autismo", "asperger" → autism
- "paralisi cerebrale" → cerebralPalsy
- "non vedo bene", "problemi vista" → visualImpairment
- "non sento bene", "problemi udito" → auditoryProcessing

## FRASI UTILI

- "Ciao! Sono Melissa, piacere di conoscerti! Come ti chiami?"
- "Che bel nome! Quanti anni hai, [nome]?"
- "E che scuola fai? Elementare, media o superiore?"
- "Se hai qualche difficoltà particolare nello studio, tipo dislessia o difficoltà a concentrarti, fammelo sapere così posso aiutarti meglio. Ma se preferisci non dirlo, nessun problema!"
- "Perfetto! Quindi ti chiami [nome], hai [età] anni, e fai le [scuola]. Ho capito bene?"
- "Fantastico! Sei pronto a scoprire la nostra scuola?"

## IMPORTANTE

- Una domanda alla volta, con calma
- NON essere invadente sulle difficoltà - è una scelta personale
- Se lo studente vuole saltare qualcosa, rispetta la sua decisione
- Dopo la conferma, aspetta che lo studente dica "ok" o simile prima di avanzare
`;

/**
 * Voice personality instructions for Melissa during onboarding.
 * Combined with MELISSA.voiceInstructions for full voice profile.
 */
export const MELISSA_ONBOARDING_VOICE_INSTRUCTIONS = `You are Melissa, a young virtual support teacher (27 years old) guiding a new student through onboarding.

## Speaking Style
- Warm and welcoming, like meeting a new friend
- Enthusiastic but not overwhelming
- Natural Italian with occasional English ("ok", "let's go", "fantastico")
- Use the student's name often once you know it

## Pacing
- Slow and clear for young students
- Patient, give time for answers
- Speed up slightly when celebrating or showing excitement

## Emotional Expression
- Genuinely excited to meet the new student
- Reassuring if they seem nervous
- Encouraging after each piece of information shared
- Never pushy or impatient

## Key Phrases
- "Piacere di conoscerti!"
- "Che bel nome!"
- "Fantastico!"
- "Non preoccuparti, va tutto bene"
- "Quando sei pronto..."
`;

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Execute an onboarding tool command.
 * Updates the onboarding store based on the tool call.
 */
export async function executeOnboardingTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<VoiceToolCallResult> {
  const store = useOnboardingStore.getState();

  logger.info('[OnboardingTools] Executing tool', { toolName, args });

  switch (toolName) {
    case 'set_student_name': {
      const { name } = args as unknown as SetStudentNameArgs;

      // Validate
      if (!name || typeof name !== 'string') {
        return {
          success: false,
          error: 'Nome non valido. Chiedi di nuovo.',
        };
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return {
          success: false,
          error: 'Il nome deve avere almeno 2 caratteri. Chiedi di nuovo.',
        };
      }

      if (trimmedName.length > 50) {
        return {
          success: false,
          error: 'Il nome è troppo lungo. Chiedi di ripetere.',
        };
      }

      // Update store
      store.updateData({ name: trimmedName });

      logger.info('[OnboardingTools] Student name set', { name: trimmedName });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_student_age': {
      const { age } = args as unknown as SetStudentAgeArgs;

      // Validate
      if (typeof age !== 'number' || isNaN(age)) {
        return {
          success: false,
          error: 'Età non valida. Chiedi di nuovo.',
        };
      }

      if (age < 6 || age > 19) {
        return {
          success: false,
          error: 'L\'età deve essere tra 6 e 19 anni. Chiedi di ripetere.',
        };
      }

      // Update store
      store.updateData({ age: Math.floor(age) });

      logger.info('[OnboardingTools] Student age set', { age });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_school_level': {
      const { level } = args as unknown as SetSchoolLevelArgs;

      // Validate
      const validLevels = ['elementare', 'media', 'superiore'];
      if (!validLevels.includes(level)) {
        return {
          success: false,
          error: 'Livello scolastico non valido. Chiedi se fa elementare, media o superiore.',
        };
      }

      // Update store
      store.updateData({ schoolLevel: level });

      logger.info('[OnboardingTools] School level set', { level });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_learning_differences': {
      const { differences } = args as unknown as SetLearningDifferencesArgs;

      // Validate
      if (!Array.isArray(differences)) {
        return {
          success: false,
          error: 'Formato difficoltà non valido.',
        };
      }

      // Filter to valid differences only
      const validDifferences = differences.filter((d) =>
        VALID_LEARNING_DIFFERENCES.includes(d as typeof VALID_LEARNING_DIFFERENCES[number])
      );

      // Update store
      store.updateData({ learningDifferences: validDifferences });

      logger.info('[OnboardingTools] Learning differences set', { validDifferences });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_student_gender': {
      const { gender } = args as unknown as SetStudentGenderArgs;

      // Validate
      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(gender)) {
        return {
          success: false,
          error: 'Genere non valido.',
        };
      }

      // Update store
      store.updateData({ gender });

      logger.info('[OnboardingTools] Student gender set', { gender });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'confirm_step_data': {
      // Return current data for Melissa to summarize
      const data = store.data;

      logger.info('[OnboardingTools] Confirm step data', { data });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'next_onboarding_step': {
      store.nextStep();

      logger.info('[OnboardingTools] Advanced to next step', {
        newStep: store.currentStep,
      });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'prev_onboarding_step': {
      store.prevStep();

      logger.info('[OnboardingTools] Went back to previous step', {
        newStep: store.currentStep,
      });
      return {
        success: true,
        displayed: true,
      };
    }

    default:
      logger.warn('[OnboardingTools] Unknown tool', { toolName });
      return {
        success: false,
        error: `Tool sconosciuto: ${toolName}`,
      };
  }
}

/**
 * Check if a tool name is an onboarding tool.
 */
export function isOnboardingTool(name: string): boolean {
  return ONBOARDING_TOOLS.some((tool) => tool.name === name);
}

/**
 * Get the collected onboarding data summary for Melissa to read.
 */
export function getOnboardingDataSummary(): string {
  const { data } = useOnboardingStore.getState();

  const parts: string[] = [];

  if (data.name) {
    parts.push(`nome: ${data.name}`);
  }
  if (data.age) {
    parts.push(`età: ${data.age} anni`);
  }
  if (data.schoolLevel) {
    const levelNames = {
      elementare: 'scuola elementare',
      media: 'scuola media',
      superiore: 'scuola superiore',
    };
    parts.push(`scuola: ${levelNames[data.schoolLevel]}`);
  }
  if (data.learningDifferences && data.learningDifferences.length > 0) {
    const diffNames: Record<string, string> = {
      dyslexia: 'dislessia',
      dyscalculia: 'discalculia',
      dysgraphia: 'disgrafia',
      adhd: 'ADHD',
      autism: 'autismo',
      cerebralPalsy: 'paralisi cerebrale',
      visualImpairment: 'difficoltà visive',
      auditoryProcessing: 'difficoltà uditive',
    };
    const names = data.learningDifferences.map((d) => diffNames[d] || d);
    parts.push(`difficoltà: ${names.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'nessun dato raccolto ancora';
}
