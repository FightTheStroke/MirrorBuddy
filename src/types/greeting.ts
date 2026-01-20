/**
 * Greeting context types for dynamic character greetings
 *
 * These types enable characters to generate personalized, language-aware
 * greetings based on student profile and language preferences.
 */

import type { SupportedLanguage } from "@/app/api/chat/types";
import type { ExtendedStudentProfile } from "@/types/characters";

/**
 * Context passed to greeting generators for personalization.
 * Contains student info and language preference.
 */
export interface GreetingContext {
  /** Student profile for personalization (age, name, learning differences) */
  student: ExtendedStudentProfile;
  /** User's preferred UI language */
  language: SupportedLanguage;
}

/**
 * Function signature for dynamic greeting generators.
 * Characters can implement this to generate personalized greetings.
 */
export type GreetingGenerator = (context: GreetingContext) => string;
