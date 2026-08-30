import { defaultLocale, type Locale } from '@/i18n/config';
import type { MaestroQuote, MaestroQuoteSet } from './types';
import { quotesIt } from './it';
import { quotesEn } from './en';
import { quotesFr } from './fr';
import { quotesDe } from './de';
import { quotesEs } from './es';

export type { AttributedQuote, MaestroQuote, MaestroQuotes, MaestroQuoteSet } from './types';
export { quoteText, quoteSource } from './types';

/**
 * Every locale, keyed the same way. Italian is the reference set: a maestro
 * missing from a translation falls back to it rather than showing nothing.
 */
export const maestroQuotesByLocale: Record<Locale, MaestroQuoteSet> = {
  it: quotesIt,
  en: quotesEn,
  fr: quotesFr,
  de: quotesDe,
  es: quotesEs,
};

/** Italian, kept exported for callers that predate the locale argument. */
export const maestroQuotes: MaestroQuoteSet = quotesIt;

/**
 * The card lines for a maestro in the reader's language.
 *
 * An unknown locale, or a maestro a translator has not reached yet, falls back
 * to Italian: a card in the wrong language still teaches, an empty card does
 * not.
 */
export function getMaestroQuotes(maestroId: string, locale?: string): MaestroQuote[] {
  const set =
    locale !== undefined && locale in maestroQuotesByLocale
      ? maestroQuotesByLocale[locale as Locale]
      : maestroQuotesByLocale[defaultLocale];

  return set[maestroId] ?? maestroQuotesByLocale[defaultLocale][maestroId] ?? [];
}
