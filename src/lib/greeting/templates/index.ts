/**
 * Greeting templates for different languages
 *
 * Templates use placeholders: {name}, {subject}
 */

import type { SupportedLanguage } from "@/app/api/chat/types";

/** Generic greeting templates by language */
export const GENERIC_GREETINGS: Record<SupportedLanguage, string> = {
  it: "Ciao! Sono {name}. Come posso aiutarti oggi?",
  en: "Hi! I'm {name}. How can I help you today?",
  es: "¡Hola! Soy {name}. ¿Cómo puedo ayudarte hoy?",
  fr: "Bonjour! Je suis {name}. Comment puis-je t'aider aujourd'hui?",
  de: "Hallo! Ich bin {name}. Wie kann ich dir heute helfen?",
};

/** Greeting templates for coaches by language */
export const COACH_GREETINGS: Record<SupportedLanguage, string> = {
  it: "Ciao! Sono {name}. Come posso aiutarti a imparare qualcosa di nuovo oggi?",
  en: "Hi! I'm {name}. How can I help you learn something new today?",
  es: "¡Hola! Soy {name}. ¿Cómo puedo ayudarte a aprender algo nuevo hoy?",
  fr: "Bonjour! Je suis {name}. Comment puis-je t'aider à apprendre aujourd'hui?",
  de: "Hallo! Ich bin {name}. Wie kann ich dir heute beim Lernen helfen?",
};

/** Language teacher greetings (bilingual mode) */
export const BILINGUAL_GREETINGS: Record<
  string,
  Record<SupportedLanguage, string>
> = {
  shakespeare: {
    it: "Good morrow! Sono Shakespeare. Parliamo insieme di inglese?",
    en: "Good morrow! I'm Shakespeare. Shall we explore English together?",
    es: "Good morrow! Soy Shakespeare. ¿Hablamos de inglés juntos?",
    fr: "Good morrow! Je suis Shakespeare. Parlons anglais ensemble?",
    de: "Good morrow! Ich bin Shakespeare. Lernen wir zusammen Englisch?",
  },
  "alex-pina": {
    it: "¡Hola! Sono Álex Pina. Pronti per un po' di spagnolo?",
    en: "¡Hola! I'm Álex Pina. Ready for some Spanish?",
    es: "¡Hola! Soy Álex Pina. ¿Listos para aprender español?",
    fr: "¡Hola! Je suis Álex Pina. Prêt pour un peu d'espagnol?",
    de: "¡Hola! Ich bin Álex Pina. Bereit für Spanisch?",
  },
};

/** Mascetti (Amico) - special non-teaching character */
export const MASCETTI_GREETINGS: Record<SupportedLanguage, string> = {
  it: "Tarapìa tapiòco! Sono il Conte Mascetti. Come se fosse antani...",
  en: "Tarapìa tapiòco! I'm Count Mascetti. As if it were antani...",
  es: "Tarapìa tapiòco! Soy el Conde Mascetti. Como si fuera antani...",
  fr: "Tarapìa tapiòco! Je suis le Comte Mascetti. Comme si c'était antani...",
  de: "Tarapìa tapiòco! Ich bin Graf Mascetti. Als wäre es antani...",
};

/**
 * Formal greeting templates (Lei/Sie/Vous)
 * Used for historical/classical professors who would expect formal address
 * See ADR 0064 for the rationale behind formal/informal professor selection
 */
export const FORMAL_GREETINGS: Record<SupportedLanguage, string> = {
  it: "Buongiorno! Sono {name}. Come posso esserLe utile oggi?",
  en: "Good day! I am {name}. How may I assist you today?",
  es: "¡Buenos días! Soy {name}. ¿En qué puedo servirle hoy?",
  fr: "Bonjour! Je suis {name}. Comment puis-je vous aider aujourd'hui?",
  de: "Guten Tag! Ich bin {name}. Wie kann ich Ihnen heute helfen?",
};

/**
 * Professors who use formal address (Lei/Sie/Vous)
 * Criteria: Historical figures, classical scholars, or those whose persona
 * would naturally expect formal respect from students.
 *
 * See ADR 0064 for detailed rationale.
 */
export const FORMAL_PROFESSORS = [
  "manzoni", // 19th century Italian literary giant
  "shakespeare", // Elizabethan playwright (already has bilingual, but stays formal)
  "erodoto", // Ancient Greek historian
  "cicerone", // Roman orator and statesman
  "socrate", // Ancient Greek philosopher
  "mozart", // Classical composer (formal court environment)
  "galileo", // Renaissance scientist
  "darwin", // Victorian era naturalist
  "curie", // Victorian/Edwardian era scientist
  "leonardo", // Renaissance polymath
  "euclide", // Ancient Greek mathematician
  "smith", // 18th century economist
  "humboldt", // 19th century explorer/naturalist
  "ippocrate", // Ancient Greek physician
  "lovelace", // Victorian era mathematician
  "cassese", // Distinguished international jurist
  "omero", // Ancient Greek epic poet
] as const;

/**
 * Check if a professor uses formal address
 */
export function isFormalProfessor(characterId: string): boolean {
  const normalized = characterId.toLowerCase().split("-")[0];
  return FORMAL_PROFESSORS.some(
    (p) => normalized.includes(p) || p.includes(normalized),
  );
}

/**
 * Apply template variables to a greeting string
 * Uses string split/join for safety (avoids dynamic RegExp)
 */
export function applyGreetingTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    template,
  );
}
