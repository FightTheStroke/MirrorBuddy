/**
 * Voice Tool Commands - Educational Tools
 *
 * Tool definitions for student summaries, diagrams, timelines, demos, and utilities.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import type { VoiceToolDefinition } from './types';

/**
 * Educational tool definitions (non-creation).
 */
export const EDUCATIONAL_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'open_student_summary',
    description:
      'Apre l\'editor per far SCRIVERE un riassunto allo studente. NON genera contenuto. Usa quando lo studente dice "devo fare un riassunto" o vuole scrivere lui stesso. Guida con il metodo maieutico.',
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
  {
    type: 'function',
    name: 'student_summary_add_comment',
    description:
      'Aggiunge un commento inline al riassunto dello studente. Usa per dare feedback su parti specifiche del testo.',
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
  {
    type: 'function',
    name: 'create_diagram',
    description:
      'Crea un diagramma (flowchart, sequence, class, ER). Usalo per processi, algoritmi, relazioni tra entità.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo del diagramma',
        },
        type: {
          type: 'string',
          enum: ['flowchart', 'sequence', 'class', 'er'],
          description: 'Tipo di diagramma',
        },
        topic: {
          type: 'string',
          description: 'Argomento/processo da diagrammare',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
      },
      required: ['title', 'type', 'topic'],
    },
  },
  {
    type: 'function',
    name: 'create_timeline',
    description:
      'Crea una linea del tempo per eventi storici o sequenze temporali.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo della timeline',
        },
        period: {
          type: 'string',
          description: 'Periodo storico o intervallo temporale',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
        events: {
          type: 'array',
          description: 'Eventi (opzionale)',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
      required: ['title', 'period'],
    },
  },
  {
    type: 'function',
    name: 'create_demo',
    description:
      'Crea una simulazione interattiva HTML/JS per visualizzare concetti. Usalo per dimostrazioni visive come il sistema solare, moto dei proiettili, circuiti elettrici, animazioni matematiche.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo della simulazione',
        },
        description: {
          type: 'string',
          description: 'Breve descrizione di cosa mostra la demo',
        },
        html: {
          type: 'string',
          description: 'Codice HTML per la struttura',
        },
        css: {
          type: 'string',
          description: 'Codice CSS per lo stile (opzionale)',
        },
        js: {
          type: 'string',
          description: 'Codice JavaScript per l\'interattività (opzionale)',
        },
      },
      required: ['title', 'html'],
    },
  },
  {
    type: 'function',
    name: 'web_search',
    description:
      'Cerca informazioni educative sul web. Usalo per trovare risorse aggiuntive, approfondimenti, o verificare informazioni.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query di ricerca',
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'capture_homework',
    description:
      'Richiedi allo studente di mostrare i compiti tramite webcam per aiutarlo.',
    parameters: {
      type: 'object',
      properties: {
        purpose: {
          type: 'string',
          description: 'Scopo della richiesta (es. "vedere l\'esercizio")',
        },
        instructions: {
          type: 'string',
          description: 'Istruzioni per lo studente (es. "inquadra bene il foglio")',
        },
      },
      required: ['purpose'],
    },
  },
];
