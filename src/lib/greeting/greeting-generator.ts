/**
 * Dynamic greeting generator for characters
 *
 * Generates personalized, language-aware greetings for maestri,
 * coaches, and buddies based on student profile and language preference.
 */

import type { SupportedLanguage } from "@/app/api/chat/types";
import type { GreetingContext } from "@/types/greeting";
import {
  GENERIC_GREETINGS,
  FORMAL_GREETINGS,
  COACH_GREETINGS,
  BUDDY_GREETINGS,
  BILINGUAL_GREETINGS,
  MASCETTI_GREETINGS,
  applyGreetingTemplate,
  isFormalProfessor,
} from "./templates";

/** Language teachers with bilingual greetings */
const LANGUAGE_TEACHERS = ["shakespeare", "alex-pina"] as const;

/** Non-teaching characters (Amici) */
const AMICI = ["mascetti"] as const;

/**
 * Check if a character ID is a language teacher
 */
function isLanguageTeacher(characterId: string): boolean {
  const normalized = characterId.toLowerCase().split("-")[0];
  return LANGUAGE_TEACHERS.some(
    (t) => t.includes(normalized) || normalized.includes(t.replace("-", "")),
  );
}

/**
 * Check if a character ID is an Amico (non-teaching)
 */
function isAmico(characterId: string): boolean {
  const normalized = characterId.toLowerCase().split("-")[0];
  return AMICI.some((a) => normalized.includes(a));
}

/**
 * Generate a greeting for a maestro character
 */
export function generateMaestroGreeting(
  characterId: string,
  displayName: string,
  language: SupportedLanguage,
  _fallbackGreeting?: string,
): string {
  // Special case: Mascetti (Amico)
  if (isAmico(characterId)) {
    return MASCETTI_GREETINGS[language] || MASCETTI_GREETINGS.it;
  }

  // Special case: Language teachers (bilingual greetings)
  if (isLanguageTeacher(characterId)) {
    const teacherKey = LANGUAGE_TEACHERS.find(
      (t) =>
        characterId.toLowerCase().includes(t.replace("-", "")) ||
        t.includes(characterId.toLowerCase().split("-")[0]),
    );
    if (teacherKey && BILINGUAL_GREETINGS[teacherKey]) {
      return (
        BILINGUAL_GREETINGS[teacherKey][language] ||
        BILINGUAL_GREETINGS[teacherKey].it
      );
    }
  }

  // Formal professors use formal address (Lei/Sie/Vous)
  if (isFormalProfessor(characterId)) {
    const template = FORMAL_GREETINGS[language] || FORMAL_GREETINGS.it;
    return applyGreetingTemplate(template, { name: displayName });
  }

  // Informal professors use casual address (tu/du/tú)
  const template = GENERIC_GREETINGS[language] || GENERIC_GREETINGS.it;
  return applyGreetingTemplate(template, { name: displayName });
}

/**
 * Generate a greeting for a coach character
 */
export function generateCoachGreeting(
  displayName: string,
  language: SupportedLanguage,
): string {
  const template = COACH_GREETINGS[language] || COACH_GREETINGS.it;
  return applyGreetingTemplate(template, { name: displayName });
}

/**
 * Generate a greeting for a buddy character
 */
export function generateBuddyGreeting(
  displayName: string,
  studentAge: number,
  language: SupportedLanguage,
): string {
  const buddyAge = studentAge + 1; // Buddies are always 1 year older
  const template = BUDDY_GREETINGS[language] || BUDDY_GREETINGS.it;
  return applyGreetingTemplate(template, {
    name: displayName,
    age: String(buddyAge),
  });
}

/**
 * Generate a greeting using the full context
 * This is the main entry point for dynamic greetings
 */
export function generateGreeting(
  characterId: string,
  displayName: string,
  characterType: "maestro" | "coach" | "buddy",
  context: GreetingContext,
  fallbackGreeting?: string,
): string {
  const { language } = context;

  switch (characterType) {
    case "maestro":
      return generateMaestroGreeting(
        characterId,
        displayName,
        language,
        fallbackGreeting,
      );
    case "coach":
      return generateCoachGreeting(displayName, language);
    case "buddy":
      // Buddies use age-aware greetings
      return generateBuddyGreeting(displayName, context.student.age, language);
    default:
      return (
        fallbackGreeting ||
        applyGreetingTemplate(GENERIC_GREETINGS.it, { name: displayName })
      );
  }
}

export { LANGUAGE_TEACHERS, AMICI };
