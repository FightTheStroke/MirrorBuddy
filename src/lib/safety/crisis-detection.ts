/**
 * Crisis Detection Module
 * Quick detection of self-harm or crisis topics for priority routing.
 *
 * Part of the MirrorBuddy Safety Framework.
 */

/**
 * Quick check if content mentions self-harm or crisis topics.
 * Uses regex for flexible matching across all 5 supported locales (IT/EN/FR/DE/ES).
 * Used for priority routing to appropriate responses.
 */
export function containsCrisisKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();

  const crisisRegex: RegExp[] = [
    // --- Italian ---
    /voglio\s+morire/,
    /non\s+voglio\s+\S*\s*vivere/, // "non voglio più vivere"
    /non\s+ce\s+la\s+faccio\s+più/,
    /\bmi\s+faccio\s+del\s+male/, // self-harm only, excludes "ti faccio del male"
    /farmi\s+del\s+male/,
    /suicidio/,
    /ammazzarmi/,
    /voglio\s+ammazzar/,
    /tagliarm/,
    /nessuno\s+mi\s+(vuole|ama)/,
    /sarebbe\s+meglio\s+se\s+non\s+(esistessi|ci\s+fossi)/,
    /meglio\s+se\s+non\s+ci\s+fossi/,
    /mi\s+odio/,
    /mi\s+faccio\s+schifo/,
    /voglio\s+sparire/,
    /voglio\s+farla\s+finita/,
    // --- English ---
    /i\s+want\s+to\s+die/,
    /don'?t\s+want\s+to\s+\S*\s*live/,
    /i\s+can'?t\s+take\s+it\s+anymore/,
    /hurt(ing)?\s+myself/,
    /kill\s+myself/,
    /self[- ]?harm/,
    /cutting\s+myself/,
    /nobody\s+(loves|cares|wants)\s+me/,
    /better\s+off\s+(dead|without\s+me)/,
    /i\s+hate\s+myself/,
    /want\s+to\s+disappear/,
    /end\s+it\s+all/,
    // --- French ---
    /je\s+veux\s+mourir/,
    /ne\s+veux\s+plus\s+vivre/,
    /me\s+faire\s+du\s+mal/,
    /me\s+suicider/,
    /en\s+finir/,
    /personne\s+ne\s+m'aime/,
    // --- German ---
    /ich\s+will\s+sterben/,
    /will\s+nicht\s+mehr\s+leben/,
    /mich\s+selbst\s+verletzen/,
    /selbstmord/,
    /niemand\s+(mag|liebt)\s+mich/,
    /mir\s+selbst\s+wehtun/,
    // --- Spanish ---
    /quiero\s+morir(me)?/,
    /no\s+quiero\s+\S*\s*vivir/,
    /hacerme\s+daño/,
    /suicid(io|arme)/,
    /nadie\s+me\s+quiere/,
    /mejor\s+si\s+no\s+existiera/,
  ];

  return crisisRegex.some((rx) => rx.test(lowerText));
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
