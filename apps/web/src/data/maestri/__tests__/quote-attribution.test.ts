import { describe, expect, it } from 'vitest';

import { type MaestroQuote, maestroQuotes, quoteSource, quoteText } from '../quotes';

/**
 * Accuracy of the lines shown on maestro cards (DATA-GOVERNANCE-SOP.md, G-7).
 *
 * The August 2026 provenance work asked whether the corpus reproduced a third
 * party's protected expression. It never asked the other question: whether the
 * words we put in a real person's mouth are words they said. This file is that
 * question, made enforceable.
 *
 * The structural rule is the one that matters. A blocklist only catches the
 * misattributions we already know about; requiring a source for anything shown
 * as a quotation catches the ones we don't.
 */

const allQuotes: { maestroId: string; quote: MaestroQuote }[] = Object.entries(
  maestroQuotes,
).flatMap(([maestroId, quotes]) => quotes.map((quote) => ({ maestroId, quote })));

/**
 * Quotations proven to belong to someone other than the maestro whose card
 * carried them, or to no one at all. Each was live in this file before the G-7
 * accuracy pass. Reintroducing one fails the build.
 */
const KNOWN_MISATTRIBUTIONS: { fragment: string; actually: string }[] = [
  {
    fragment: 'non è il più forte che sopravvive',
    actually: 'Leon C. Megginson, 1963 — not Darwin (Darwin Correspondence Project)',
  },
  {
    fragment: "non l'hai capito abbastanza",
    actually: 'undocumented in Feynman; root is a remark of Rutherford',
  },
  {
    fragment: 'la storia è maestra di vita',
    actually: 'Cicero, De Oratore II.36 — not Herodotus',
  },
  {
    fragment: 'pen is mightier than the sword',
    actually: 'Edward Bulwer-Lytton, Richelieu, 1839 — not Shakespeare',
  },
  {
    fragment: 'language is the dress of thought',
    actually: 'Samuel Johnson, The Rambler 60, 1750 — not Shakespeare',
  },
  {
    fragment: 'cibo sia la tua medicina',
    actually: 'absent from the Hippocratic Corpus (Cardenas, 2013)',
  },
  {
    fragment: 'food be thy medicine',
    actually: 'absent from the Hippocratic Corpus (Cardenas, 2013)',
  },
  {
    fragment: 'silence between',
    actually: 'the idea is Debussy\u2019s — undocumented in Mozart',
  },
];

describe('maestro card quotes: attribution', () => {
  it('has at least one line for every maestro listed', () => {
    for (const [maestroId, quotes] of Object.entries(maestroQuotes)) {
      expect(quotes.length, `${maestroId} has no lines`).toBeGreaterThan(0);
    }
  });

  it('never shows a quotation without naming where it comes from', () => {
    for (const { maestroId, quote } of allQuotes) {
      if (typeof quote === 'string') continue;
      expect(
        quote.source.trim().length,
        `${maestroId}: "${quote.text}" is presented as a quotation with an empty source`,
      ).toBeGreaterThan(0);
      expect(
        quote.text.trim().length,
        `${maestroId}: an attributed entry has empty text`,
      ).toBeGreaterThan(0);
    }
  });

  it('exposes a source only for real quotations', () => {
    for (const { quote } of allQuotes) {
      const source = quoteSource(quote);
      if (typeof quote === 'string') {
        expect(source).toBeUndefined();
      } else {
        expect(source).toBe(quote.source);
      }
    }
  });

  it('reads the text of both kinds of line', () => {
    for (const { maestroId, quote } of allQuotes) {
      expect(quoteText(quote).trim().length, `${maestroId}: empty line`).toBeGreaterThan(0);
    }
  });

  it('does not reintroduce a known misattribution', () => {
    for (const { maestroId, quote } of allQuotes) {
      const haystack = quoteText(quote).toLowerCase();
      for (const { fragment, actually } of KNOWN_MISATTRIBUTIONS) {
        expect(
          haystack.includes(fragment.toLowerCase()),
          `${maestroId} carries a known misattribution ("${fragment}"): ${actually}`,
        ).toBe(false);
      }
    }
  });
});
