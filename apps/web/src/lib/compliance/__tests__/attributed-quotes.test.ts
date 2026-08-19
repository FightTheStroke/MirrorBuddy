import { describe, expect, it } from 'vitest';
import { findAttributedQuotes } from '../attributed-quotes';

describe('findAttributedQuotes', () => {
  describe('finds words put in a named mouth', () => {
    it('catches a verb of speech before the quote, across intervening words', () => {
      // The real G-7 example from cassese-knowledge.ts.
      const found = findAttributedQuotes(
        'Cassese ripeteva spesso che i giovani, "non ancora disillusi", potevano\ncambiare il sistema.',
      );

      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({ speaker: 'Cassese', quote: 'non ancora disillusi' });
    });

    it('catches the quote-first form', () => {
      const found = findAttributedQuotes('"Il piano è il piano", diceva il Professore.');

      expect(found[0]).toMatchObject({ speaker: 'Professore', quote: 'Il piano è il piano' });
    });

    it('catches script form at the start of a line, bulleted or not', () => {
      const found = findAttributedQuotes(
        'Mascetti: "Come se fosse antani"\n- Perozzi: "Ma cosa dici"',
      );

      expect(found.map((f) => f.speaker)).toEqual(['Mascetti', 'Perozzi']);
    });

    it('catches an em-dash attribution after the quote', () => {
      const found = findAttributedQuotes('«Tutto è possibile» — Alex Pina');

      expect(found[0]).toMatchObject({ speaker: 'Alex Pina', quote: 'Tutto è possibile' });
    });

    it('reports the line so a failure can be acted on', () => {
      const found = findAttributedQuotes('riga uno\nriga due\nBrown dice "stories are data"');

      expect(found[0]?.line).toBe(3);
    });

    it('deduplicates a repeated attribution', () => {
      const found = findAttributedQuotes('Tizio dice "ciao mondo"\nTizio dice "ciao mondo"');

      expect(found).toHaveLength(1);
    });
  });

  describe('leaves alone what carries no risk', () => {
    it('ignores a work title', () => {
      expect(findAttributedQuotes('La serie "La Casa de Papel" è nata nel 2017.')).toHaveLength(0);
    });

    it('ignores a coined term', () => {
      expect(
        findAttributedQuotes('Il gruppo viene chiamato "la banda" per tutta la serie.'),
      ).toHaveLength(0);
    });

    it('ignores unattributed coaching prompts', () => {
      // chris-knowledge.ts ships these as a bullet list; they are the Maestro's
      // own questions to the student, not anyone's reproduced words.
      expect(
        findAttributedQuotes('- "Qual è la tua idea centrale?"\n- "Prova ancora, migliorerai"'),
      ).toHaveLength(0);
    });

    it('ignores a quote with no speaker at all', () => {
      expect(findAttributedQuotes('Un principio utile: "meno è più".')).toHaveLength(0);
    });

    it('does not cross a sentence boundary to invent a speaker', () => {
      expect(
        findAttributedQuotes(
          'Feynman insegnava a Caltech. Un metodo utile è "spiega a un bambino".',
        ),
      ).toHaveLength(0);
    });

    it('returns nothing for prose without quotes', () => {
      expect(findAttributedQuotes('Nessuna citazione in questo paragrafo.')).toHaveLength(0);
    });
  });
});
