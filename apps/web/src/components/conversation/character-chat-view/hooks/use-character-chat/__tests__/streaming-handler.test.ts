/**
 * Tool-intent routing tests
 *
 * ADR 0034 routes tool-intent messages to the non-streaming endpoint on purpose:
 * /api/chat/stream cannot execute tool calls. That routing is correct.
 *
 * What is NOT correct is matching keywords as bare substrings: ordinary Italian
 * words such as "testo", "generale" or "cartella" contain "test", "genera" and
 * "carte", so they silently lost incremental rendering and the student waited
 * for the whole answer instead of seeing it appear word by word.
 */

import { describe, it, expect } from 'vitest';

import { messageRequiresTool } from '../streaming-handler';

describe('messageRequiresTool', () => {
  describe('genuine tool requests still route to the non-streaming endpoint', () => {
    const toolRequests = [
      'Fammi una mappa concettuale sulla fotosintesi',
      'Crea un quiz di storia',
      'Genera delle flashcard sui verbi irregolari',
      'Puoi farmi un riassunto del capitolo?',
      'Prepara uno schema sulle guerre puniche',
      'Voglio delle schede per ripassare',
      'Fai una sintesi di questo argomento',
      'Mi dimostra come funziona la gravità',
    ];

    it.each(toolRequests)('detects tool intent in %j', (input) => {
      expect(messageRequiresTool(input)).toBe(true);
    });
  });

  describe('ordinary words that merely contain a keyword must keep streaming', () => {
    const falsePositives = [
      'Analizziamo il testo di questa poesia',
      'Qual è il contesto storico della rivoluzione?',
      'Parlami in generale del Rinascimento',
      'Apri la cartella di storia',
      'Vorrei fare un lavoro creativo',
      'Cosa si fa durante la ricreazione?',
      'La protesta dei lavoratori come è finita?',
      'Mi fa male la testa quando studio',
      'Come funziona la generazione di energia?',
    ];

    it.each(falsePositives)('keeps streaming for %j', (input) => {
      expect(messageRequiresTool(input)).toBe(false);
    });
  });

  describe('plain conversation keeps streaming', () => {
    const conversational = [
      'Ciao, come stai?',
      'Non ho capito, me lo rispieghi?',
      'Perché il cielo è blu?',
      'Chi era Giulio Cesare?',
      '',
    ];

    it.each(conversational)('keeps streaming for %j', (input) => {
      expect(messageRequiresTool(input)).toBe(false);
    });
  });

  describe('matching is robust to real student input', () => {
    it('ignores case', () => {
      expect(messageRequiresTool('CREA UN QUIZ')).toBe(true);
    });

    it('matches a keyword followed by punctuation', () => {
      expect(messageRequiresTool('Mi fai un riassunto, per favore?')).toBe(true);
    });

    it('matches a keyword at the very start and end of the message', () => {
      expect(messageRequiresTool('Quiz')).toBe(true);
      expect(messageRequiresTool('Voglio un quiz')).toBe(true);
    });

    it('treats accented characters as part of a word, not as a boundary', () => {
      expect(messageRequiresTool('Però crea un quiz')).toBe(true);
      expect(messageRequiresTool('Parliamo della creatività')).toBe(false);
    });

    it('handles multi-word keywords', () => {
      expect(messageRequiresTool('Fammi una flash card')).toBe(true);
    });

    it('guards against null-ish input', () => {
      expect(messageRequiresTool(undefined as unknown as string)).toBe(false);
      expect(messageRequiresTool(null as unknown as string)).toBe(false);
    });
  });
});
