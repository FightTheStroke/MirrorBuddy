/**
 * Voice Tool Commands - Educational Creation Tools
 *
 * Tool definitions for creating educational materials (mindmaps, quizzes, flashcards, summaries).
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import type { VoiceToolDefinition } from './types';

/**
 * Educational creation tool definitions.
 */
export const CREATION_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'create_mindmap',
    description: `Crea una mappa mentale interattiva per visualizzare concetti.

STRUTTURA RICHIESTA (ADR 0020):
- title: Il soggetto principale della mappa (es. "La Liguria", "La Cellula")
- nodes: Array di nodi CON GERARCHIA usando parentId

ESEMPIO DI STRUTTURA CORRETTA:
{
  "title": "La Liguria",
  "nodes": [
    { "id": "1", "label": "Geografia", "parentId": null },
    { "id": "2", "label": "Posizione", "parentId": "1" },
    { "id": "3", "label": "Nord-Ovest Italia", "parentId": "2" },
    { "id": "4", "label": "Caratteristiche", "parentId": "1" },
    { "id": "5", "label": "Costa frastagliata", "parentId": "4" }
  ]
}

IMPORTANTE:
- parentId: null = nodo di primo livello (topic principale)
- parentId: "1" = figlio del nodo con id "1" (subtopic)
- Crea SEMPRE almeno 2-3 livelli di gerarchia
- RISPONDI SEMPRE con un messaggio testuale PRIMA di chiamare il tool`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo/soggetto principale della mappa mentale (es. "La Liguria")',
        },
        topic: {
          type: 'string',
          description: 'Argomento principale da mappare (deprecated: usa title)',
        },
        subject: {
          type: 'string',
          description: 'Materia (mathematics, physics, history, geography, etc.)',
        },
        nodes: {
          type: 'array',
          description: 'Nodi della mappa con struttura gerarchica tramite parentId',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID univoco del nodo' },
              label: { type: 'string', description: 'Testo del nodo' },
              parentId: { type: 'string', description: 'ID del nodo padre (null per root)' },
            },
            required: ['id', 'label'],
          },
        },
      },
      required: ['title', 'nodes'],
    },
  },
  {
    type: 'function',
    name: 'create_quiz',
    description:
      'Crea un quiz interattivo per testare la comprensione. Usalo quando lo studente vuole verificare cosa ha imparato, fare pratica, o prepararsi per un test.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo del quiz',
        },
        subject: {
          type: 'string',
          description: 'Materia del quiz',
        },
        topic: {
          type: 'string',
          description: 'Argomento specifico',
        },
        questionCount: {
          type: 'number',
          description: 'Numero di domande (default: 5)',
        },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard'],
          description: 'Difficoltà del quiz',
        },
        questions: {
          type: 'array',
          description: 'Domande (opzionale)',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correctIndex: { type: 'number' },
              explanation: { type: 'string' },
            },
          },
        },
      },
      required: ['title', 'subject'],
    },
  },
  {
    type: 'function',
    name: 'create_flashcards',
    description:
      'Crea flashcard per lo studio e la memorizzazione. Usalo quando lo studente vuole memorizzare termini, definizioni, formule, o date.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nome del mazzo di flashcard',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
        topic: {
          type: 'string',
          description: 'Argomento specifico',
        },
        cardCount: {
          type: 'number',
          description: 'Numero di flashcard (default: 10)',
        },
        cards: {
          type: 'array',
          description: 'Carte (opzionale)',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              hint: { type: 'string' },
            },
          },
        },
      },
      required: ['name', 'subject'],
    },
  },
  {
    type: 'function',
    name: 'create_summary',
    description:
      'Crea un riassunto strutturato di un argomento. Usalo quando lo studente vuole una sintesi, un ripasso, o deve prepararsi velocemente.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo del riassunto',
        },
        topic: {
          type: 'string',
          description: 'Argomento da riassumere',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
        length: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          description: 'Lunghezza del riassunto',
        },
      },
      required: ['title', 'topic'],
    },
  },
];
