/**
 * Voice Tool Commands - Modification Commands
 *
 * Tool definitions for modifying mindmaps and summaries in real-time.
 *
 * Part of I-02: Voice Tool Commands
 * Related: Phase 7 (Voice Commands), #70 (Real-time Summary Tool)
 */

import type { VoiceToolDefinition } from './types';

/**
 * Mindmap modification tool definitions.
 */
export const MINDMAP_MODIFICATION_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'mindmap_add_node',
    description:
      'Aggiungi un nodo alla mappa mentale corrente. Usalo quando lo studente dice "aggiungi", "metti", "inserisci" un concetto.',
    parameters: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'Il concetto o testo da aggiungere come nuovo nodo',
        },
        parentNode: {
          type: 'string',
          description: 'Il nodo padre a cui collegare (opzionale, usa il nodo selezionato o centrale)',
        },
      },
      required: ['concept'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_connect_nodes',
    description:
      'Collega due nodi della mappa. Usalo quando lo studente dice "collega X con Y", "unisci", "fai un collegamento".',
    parameters: {
      type: 'object',
      properties: {
        nodeA: {
          type: 'string',
          description: 'Primo nodo da collegare',
        },
        nodeB: {
          type: 'string',
          description: 'Secondo nodo da collegare',
        },
      },
      required: ['nodeA', 'nodeB'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_expand_node',
    description:
      'Espandi un nodo con sotto-nodi. Usalo quando lo studente dice "espandi", "aggiungi dettagli", "approfondisci" un nodo.',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo da espandere',
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggerimenti per i sotto-nodi (opzionale, il Professore può proporre)',
        },
      },
      required: ['node'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_delete_node',
    description:
      'Elimina un nodo dalla mappa. Usalo quando lo studente dice "cancella", "rimuovi", "togli" un nodo.',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo da eliminare',
        },
      },
      required: ['node'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_focus_node',
    description:
      'Centra la vista su un nodo specifico. Usalo quando lo studente dice "vai a", "mostrami", "zoom su" un nodo.',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo su cui fare focus',
        },
      },
      required: ['node'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_set_color',
    description:
      'Cambia il colore di un nodo. Usalo quando lo studente dice "colora", "cambia colore", "fai rosso/blu/verde".',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo da colorare',
        },
        color: {
          type: 'string',
          description: 'Il colore (rosso, blu, verde, giallo, arancione, viola, rosa)',
        },
      },
      required: ['node', 'color'],
    },
  },
];

/**
 * Summary modification tool definitions.
 */
export const SUMMARY_MODIFICATION_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'summary_set_title',
    description:
      'Imposta o modifica il titolo del riassunto. Usalo quando lo studente dice il titolo o l\'argomento.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Il titolo del riassunto',
        },
      },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'summary_add_section',
    description:
      'Aggiungi una nuova sezione al riassunto. Usalo quando lo studente menziona un nuovo aspetto o argomento.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo della sezione',
        },
        content: {
          type: 'string',
          description: 'Contenuto della sezione (opzionale)',
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Punti chiave della sezione (opzionale)',
        },
      },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'summary_add_point',
    description:
      'Aggiungi un punto chiave a una sezione. Usalo quando lo studente aggiunge dettagli o informazioni.',
    parameters: {
      type: 'object',
      properties: {
        sectionIndex: {
          type: 'number',
          description: 'Indice della sezione (0-based, usa l\'ultima se non specificato)',
        },
        point: {
          type: 'string',
          description: 'Il punto chiave da aggiungere',
        },
      },
      required: ['point'],
    },
  },
  {
    type: 'function',
    name: 'summary_finalize',
    description:
      'Salva e finalizza il riassunto. Usalo quando lo studente dice "salva", "ho finito", "basta".',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
