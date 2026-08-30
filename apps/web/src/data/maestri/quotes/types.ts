// ============================================================================
// MAESTRO CARD LINES — the contract, shared by every locale
// ============================================================================
//
// Two kinds of line, and the difference is not cosmetic (DATA-GOVERNANCE-SOP.md,
// G-7). A bare string is written by MirrorBuddy in that maestro's spirit; the
// card shows it as the tutor speaking, without quotation marks, because nobody
// ever said it. An object is a real quotation and must name where it comes
// from; the card shows that source beside it.
//
// There is no third option. A line that reads as a historical quotation but
// carries no source is what put "it is not the strongest that survives" in
// Darwin's mouth on a card children read. `quote-attribution.test.ts` fails the
// build rather than let one back in — in all five locales.

/** A real quotation, with the work it comes from. */
export interface AttributedQuote {
  text: string;
  /** Author and work, e.g. "Galileo Galilei, Il Saggiatore, 1623". */
  source: string;
}

/** A bare string is authored by MirrorBuddy; an object is a real quotation. */
export type MaestroQuote = string | AttributedQuote;

/** Every locale exports this exact shape, with the same keys and lengths. */
export type MaestroQuoteSet = Record<string, MaestroQuote[]>;

export interface MaestroQuotes {
  maestroId: string;
  quotes: MaestroQuote[];
}

/** The words to show, whoever wrote them. */
export function quoteText(quote: MaestroQuote): string {
  return typeof quote === 'string' ? quote : quote.text;
}

/**
 * Where a quotation comes from, or undefined when MirrorBuddy wrote the line.
 * Undefined is the signal to render it without quotation marks: no one said it.
 */
export function quoteSource(quote: MaestroQuote): string | undefined {
  return typeof quote === 'string' ? undefined : quote.source;
}
