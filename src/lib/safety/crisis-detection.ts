/**
 * Crisis Detection Module
 * Quick detection of self-harm or crisis topics for priority routing.
 *
 * Part of the MirrorBuddy Safety Framework.
 */

/**
 * Quick check if content mentions self-harm or crisis topics.
 * Used for priority routing to appropriate responses.
 */
export function containsCrisisKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  const crisisPatterns = [
    "voglio morire",
    "non voglio vivere",
    "farmi del male",
    "suicidio",
    "ammazzarmi",
    "voglio ammazzar", // catches "mi voglio ammazzare"
    "tagliarm",
    "nessuno mi vuole",
    "nessuno mi ama",
    "sarebbe meglio se non esistessi",
    "mi odio",
    "mi faccio schifo",
  ];

  return crisisPatterns.some((pattern) => lowerText.includes(pattern));
}

/**
 * Crisis response template for all characters.
 * Use this when containsCrisisKeywords returns true.
 */
export const CRISIS_RESPONSE = `Mi preoccupo per te e quello che stai provando è importante.

Per favore, parla con un adulto di fiducia - un genitore, un insegnante, o un counselor scolastico.

Se hai bisogno di parlare con qualcuno subito:
- Telefono Azzurro: 19696
- Telefono Amico: 02 2327 2327

Vuoi che studiamo qualcosa insieme per distrarti un po'?`;
