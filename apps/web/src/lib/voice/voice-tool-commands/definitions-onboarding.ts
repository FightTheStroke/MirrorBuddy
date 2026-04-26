/**
 * Voice Tool Commands - Onboarding and Archive Tools
 *
 * Tool definitions for onboarding voice integration and archive search.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #61 (Onboarding Voice Integration), #37 (Unified Archive Access)
 */

import type { VoiceToolDefinition } from './types';

/**
 * Onboarding tool definitions.
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
          description: 'Età dello studente (6-19)',
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
      "Avanza al prossimo step dell'onboarding. Usa quando lo studente è pronto a continuare.",
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

/**
 * Archive search tool definition.
 */
export const ARCHIVE_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'search_archive',
    description:
      'Cerca materiali salvati nell\'archivio dello studente (mappe mentali, quiz, flashcard, riassunti, demo, compiti). Usa quando lo studente chiede "hai salvato...", "mostrami quella mappa...", "rivediamo il quiz di...".',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Testo da cercare nei titoli e contenuti',
        },
        toolType: {
          type: 'string',
          enum: ['mindmap', 'quiz', 'flashcard', 'summary', 'demo', 'homework', 'diagram', 'timeline'],
          description: 'Tipo di materiale da cercare (opzionale)',
        },
        subject: {
          type: 'string',
          description: 'Materia dei materiali (opzionale)',
        },
      },
      required: [],
    },
  },
];
