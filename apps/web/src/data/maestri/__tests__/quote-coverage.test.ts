import { describe, expect, it } from 'vitest';

import { maestri } from '../index';
import { getMaestroQuotes, maestroQuotesByLocale } from '../quotes';
import { locales } from '@/i18n/config';

/**
 * Every maestro on the roster has card lines (DATA-GOVERNANCE-SOP.md, G-7).
 *
 * `quote-attribution.test.ts` asks whether the lines that exist are honest. It
 * cannot ask whether they exist: it walks the keys of the quote set, so a
 * maestro absent from it is not a violation, it is simply not visited. Sixteen
 * of the thirty-two were absent for exactly that reason, and `QuoteRotator`
 * returns null for an unknown id — so half the roster shipped a blank card and
 * every guard stayed green.
 *
 * The roster is the source of truth here, not the quote file. Adding a maestro
 * without adding lines fails the build, in the language the reader is using.
 */
describe('maestro card quotes: roster coverage', () => {
  it('gives every maestro on the roster lines in every locale', () => {
    for (const locale of locales) {
      for (const maestro of maestri) {
        expect(
          getMaestroQuotes(maestro.id, locale).length,
          `${locale}/${maestro.id} (${maestro.displayName}) has no card lines: its card renders empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('keeps no lines for a maestro who has left the roster', () => {
    const rosterIds = new Set(maestri.map((maestro) => maestro.id));

    for (const maestroId of Object.keys(maestroQuotesByLocale.it)) {
      expect(
        rosterIds.has(maestroId),
        `quotes carry "${maestroId}", which is not a maestro on the roster`,
      ).toBe(true);
    }
  });
});
