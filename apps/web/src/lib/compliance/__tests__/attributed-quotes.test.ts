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

  /**
   * Both from Codex review on #661. The first version scanned line by line, so
   * a wrapped quotation with a textbook attribution was invisible; and the verb
   * list held only present and imperfect forms, so the commonest way Italian
   * prose reports speech walked straight past it.
   */
  describe('attributions Codex found the first version blind to', () => {
    it('sees a quotation wrapped across a hard line break', () => {
      const wrapped = 'Cassese diceva che i giovani erano\n"non ancora disillusi" e andavano ascoltati.';
      const found = findAttributedQuotes(wrapped);
      expect(found).toHaveLength(1);
      expect(found[0].speaker).toBe('Cassese');
      expect(found[0].quote).toBe('non ancora disillusi');
    });

    it.each([
      ['ha detto', 'Cassese ha detto "non ancora disillusi"'],
      ['disse', 'Manzoni disse "questo matrimonio non s\u2019ha da fare"'],
      ['spiegò', 'Feynman spieg\u00f2 "se non sai spiegarlo, non l\u2019hai capito"'],
      ['ha scritto', 'Levi ha scritto "considerate se questo \u00e8 un uomo"'],
    ])('recognises the past-tense attribution %s', (_form, text) => {
      const found = findAttributedQuotes(text);
      expect(found).toHaveLength(1);
    });

    it('still refuses to invent a speaker from a bullet on the next line', () => {
      // The wrap-healing must not rejoin across a list marker: a leading `-`
      // read as an em-dash attribution once conjured a speaker out of layout.
      const layout = 'Frasi tipiche:\n"Qual \u00e8 la tua idea centrale?"\n- Socrate';
      expect(findAttributedQuotes(layout)).toEqual([]);
    });
  });
});
