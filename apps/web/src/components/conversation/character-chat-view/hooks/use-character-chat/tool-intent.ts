/**
 * Tool-intent detection for chat routing
 *
 * ADR 0034: /api/chat/stream cannot execute tool calls, so messages that ask for
 * a mind map, quiz, flashcards or a summary are deliberately routed to the
 * non-streaming /api/chat endpoint. That routing decision is intentional.
 *
 * Matching, however, must respect word boundaries. Plain substring matching made
 * ordinary Italian words trigger the slow path — "testo" and "contesto" contain
 * "test", "generale" contains "genera", "cartella" contains "carte" — so students
 * lost incremental rendering on perfectly normal questions and waited for the
 * whole answer instead of watching it appear.
 *
 * JavaScript's \b is ASCII-only and would mis-handle accented Italian, so the
 * boundaries are expressed with Unicode letter/number classes instead.
 */

/**
 * Tool-triggering keywords in Italian
 * A match routes the message to the non-streaming endpoint for tool support.
 */
export const TOOL_KEYWORDS = [
  // Mindmap
  'mappa',
  'mappe',
  'schema',
  'schemi',
  'diagramma',
  // Quiz
  'quiz',
  'domande',
  'verifica',
  'test',
  'interroga',
  // Flashcard
  'flashcard',
  'flash card',
  'carte',
  'schede',
  // Summary
  'riassunto',
  'riassumi',
  'sintesi',
  'sintetizza',
  // Demo
  'demo',
  'dimostra',
  'esempio',
  'simulazione',
  // General tool requests
  'crea',
  'genera',
  'prepara',
  'fammi',
  'fai',
] as const;

/** Splits on anything that is not a Unicode letter or number. */
const NON_WORD = /[^\p{L}\p{N}]+/u;

/**
 * Check whether a message asks for a tool-generated artefact.
 *
 * The message is reduced to its words and rejoined with single spaces, so a
 * keyword only matches when it stands as a whole word (or whole word pair):
 * " crea " is found in "Però crea un quiz" but not in "la creatività".
 *
 * @param input - Raw student message
 * @returns true when the message should use the non-streaming endpoint
 */
export function messageRequiresTool(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }

  const words = input.toLowerCase().split(NON_WORD).filter(Boolean);
  if (words.length === 0) {
    return false;
  }

  const padded = ` ${words.join(' ')} `;
  return TOOL_KEYWORDS.some((keyword) => padded.includes(` ${keyword} `));
}
