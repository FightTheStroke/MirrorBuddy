import { describe, expect, it } from 'vitest';

import {
  type MaestroQuote,
  maestroQuotesByLocale,
  getMaestroQuotes,
  quoteSource,
  quoteText,
} from '../quotes';
import { locales, defaultLocale } from '@/i18n/config';

/**
 * Accuracy of the lines shown on maestro cards (DATA-GOVERNANCE-SOP.md, G-7),
 * in all five languages.
 *
 * The August 2026 provenance work asked whether the corpus reproduced a third
 * party's protected expression. It never asked the other question: whether the
 * words we put in a real person's mouth are words they said. This file is that
 * question, made enforceable.
 *
 * The structural rule is the one that matters. A blocklist only catches the
 * misattributions we already know about; requiring a source for anything shown
 * as a quotation catches the ones we don't. Translation is where a corrected
 * misattribution most easily creeps back in, so the rule is enforced per
 * locale, and the shape of every locale is pinned to Italian.
 */

interface LocatedQuote {
  locale: string;
  maestroId: string;
  quote: MaestroQuote;
}

const allQuotes: LocatedQuote[] = Object.entries(maestroQuotesByLocale).flatMap(([locale, set]) =>
  Object.entries(set).flatMap(([maestroId, quotes]) =>
    quotes.map((quote) => ({ locale, maestroId, quote })),
  ),
);

/**
 * Quotations proven to belong to someone other than the maestro whose card
 * carried them, or to no one at all. Each was live before the G-7 accuracy
 * pass, in Italian; the translated forms are listed so a translator cannot
 * reintroduce one in another language. Reintroducing any of them fails the
 * build.
 */
const KNOWN_MISATTRIBUTIONS: { fragment: string; actually: string }[] = [
  {
    fragment: 'non è il più forte che sopravvive',
    actually: 'Leon C. Megginson, 1963 — not Darwin (Darwin Correspondence Project)',
  },
  {
    fragment: 'strongest that survives',
    actually: 'Leon C. Megginson, 1963 — not Darwin (Darwin Correspondence Project)',
  },
  {
    fragment: 'le plus fort qui survit',
    actually: 'Leon C. Megginson, 1963 — not Darwin',
  },
  {
    fragment: 'stärkste, der überlebt',
    actually: 'Leon C. Megginson, 1963 — not Darwin',
  },
  {
    fragment: 'el más fuerte que sobrevive',
    actually: 'Leon C. Megginson, 1963 — not Darwin',
  },
  {
    fragment: "non l'hai capito abbastanza",
    actually: 'undocumented in Feynman; root is a remark of Rutherford',
  },
  {
    fragment: "can't explain it simply",
    actually: 'undocumented in Feynman; root is a remark of Rutherford',
  },
  {
    fragment: 'la storia è maestra di vita',
    actually: 'Cicero, De Oratore II.36 — not Herodotus',
  },
  {
    fragment: 'history is the teacher of life',
    actually: 'Cicero, De Oratore II.36 — not Herodotus',
  },
  {
    fragment: 'pen is mightier than the sword',
    actually: 'Edward Bulwer-Lytton, Richelieu, 1839 — not Shakespeare',
  },
  {
    fragment: 'penna è più potente della spada',
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
    fragment: 'aliment soit ton médicament',
    actually: 'absent from the Hippocratic Corpus (Cardenas, 2013)',
  },
  {
    fragment: 'nahrung sei deine medizin',
    actually: 'absent from the Hippocratic Corpus (Cardenas, 2013)',
  },
  {
    fragment: 'alimento sea tu medicina',
    actually: 'absent from the Hippocratic Corpus (Cardenas, 2013)',
  },
  {
    fragment: 'silence between',
    actually: 'the idea is Debussy\u2019s — undocumented in Mozart',
  },
  {
    fragment: 'silenzio tra le note',
    actually: 'the idea is Debussy\u2019s — undocumented in Mozart',
  },
];

describe('maestro card quotes: attribution', () => {
  it('ships a set for every locale the app serves', () => {
    for (const locale of locales) {
      expect(maestroQuotesByLocale[locale], `no card lines for locale ${locale}`).toBeDefined();
    }
  });

  it('has at least one line for every maestro listed', () => {
    for (const [locale, set] of Object.entries(maestroQuotesByLocale)) {
      for (const [maestroId, quotes] of Object.entries(set)) {
        expect(quotes.length, `${locale}/${maestroId} has no lines`).toBeGreaterThan(0);
      }
    }
  });

  it('never shows a quotation without naming where it comes from', () => {
    for (const { locale, maestroId, quote } of allQuotes) {
      if (typeof quote === 'string') continue;
      expect(
        quote.source.trim().length,
        `${locale}/${maestroId}: "${quote.text}" is presented as a quotation with an empty source`,
      ).toBeGreaterThan(0);
      expect(
        quote.text.trim().length,
        `${locale}/${maestroId}: an attributed entry has empty text`,
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
    for (const { locale, maestroId, quote } of allQuotes) {
      expect(quoteText(quote).trim().length, `${locale}/${maestroId}: empty line`).toBeGreaterThan(
        0,
      );
    }
  });

  it('does not reintroduce a known misattribution in any language', () => {
    for (const { locale, maestroId, quote } of allQuotes) {
      const haystack = quoteText(quote).toLowerCase();
      for (const { fragment, actually } of KNOWN_MISATTRIBUTIONS) {
        expect(
          haystack.includes(fragment.toLowerCase()),
          `${locale}/${maestroId} carries a known misattribution ("${fragment}"): ${actually}`,
        ).toBe(false);
      }
    }
  });
});

describe('maestro card quotes: translation parity', () => {
  const reference = maestroQuotesByLocale[defaultLocale];

  it('covers the same maestri in every language', () => {
    const expected = Object.keys(reference).sort();
    for (const locale of locales) {
      expect(Object.keys(maestroQuotesByLocale[locale]).sort(), `locale ${locale}`).toEqual(
        expected,
      );
    }
  });

  it('keeps the same number of lines per maestro in every language', () => {
    for (const locale of locales) {
      for (const [maestroId, quotes] of Object.entries(reference)) {
        expect(
          maestroQuotesByLocale[locale][maestroId].length,
          `${locale}/${maestroId} has a different number of lines than ${defaultLocale}`,
        ).toBe(quotes.length);
      }
    }
  });

  it('keeps a translated quotation a quotation, and an authored line authored', () => {
    for (const locale of locales) {
      for (const [maestroId, quotes] of Object.entries(reference)) {
        quotes.forEach((referenceQuote, index) => {
          const translated = maestroQuotesByLocale[locale][maestroId][index];
          expect(
            typeof translated,
            `${locale}/${maestroId}[${index}] changed kind: a translation must not turn an authored line into a quotation, nor drop a real source`,
          ).toBe(typeof referenceQuote);
        });
      }
    }
  });

  it('does not leave an Italian line untranslated on a foreign card', () => {
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      for (const [maestroId, quotes] of Object.entries(reference)) {
        quotes.forEach((referenceQuote, index) => {
          const translated = maestroQuotesByLocale[locale][maestroId][index];
          expect(
            quoteText(translated),
            `${locale}/${maestroId}[${index}] is still the Italian line`,
          ).not.toBe(quoteText(referenceQuote));
        });
      }
    }
  });
});

describe('getMaestroQuotes', () => {
  it('returns the reader’s language when it has one', () => {
    expect(getMaestroQuotes('socrate', 'en')).toBe(maestroQuotesByLocale.en.socrate);
  });

  it('falls back to Italian for an unknown locale rather than showing nothing', () => {
    expect(getMaestroQuotes('socrate', 'ja')).toBe(maestroQuotesByLocale.it.socrate);
  });

  it('returns an empty list for an unknown maestro', () => {
    expect(getMaestroQuotes('nessuno', 'en')).toEqual([]);
  });
});
