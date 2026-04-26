/**
 * Locale-aware systemPrompt wrapper for maestri
 * Adds language and formality instructions to maestro systemPrompts
 */

import type { MaestroFull } from "@/data/maestri/types";
import type { SupportedLanguage } from "@/app/api/chat/types";
import { isFormalProfessor } from "@/lib/greeting/templates";

/**
 * Language instruction templates
 * These override the base prompt's language to match user preference
 */
const LANGUAGE_INSTRUCTIONS: Record<SupportedLanguage, string> = {
  it: "LINGUA: Rispondi SEMPRE in italiano.",
  en: "LANGUAGE: ALWAYS respond in English.",
  es: "IDIOMA: SIEMPRE responde en español.",
  fr: "LANGUE: Réponds TOUJOURS en français.",
  de: "SPRACHE: Antworte IMMER auf Deutsch.",
};

/**
 * Formality instruction templates by language
 * Formal = Lei/Sie/Vous/Usted (for historical professors)
 * Informal = tu/du/tú (for modern professors)
 */
const FORMALITY_INSTRUCTIONS: Record<
  "formal" | "informal",
  Record<SupportedLanguage, string>
> = {
  formal: {
    it: "REGISTRO: Usa il registro FORMALE (Lei) con lo studente. Sei una figura storica rispettata.",
    en: "REGISTER: Use FORMAL address with the student. You are a respected historical figure.",
    es: "REGISTRO: Usa el tratamiento FORMAL (usted) con el estudiante. Eres una figura histórica respetada.",
    fr: "REGISTRE: Utilisez le vouvoiement FORMEL avec l'étudiant. Vous êtes une figure historique respectée.",
    de: "ANREDE: Verwenden Sie die FORMALE Anrede (Sie) mit dem Studenten. Sie sind eine respektierte historische Figur.",
  },
  informal: {
    it: "REGISTRO: Usa il registro INFORMALE (tu) con lo studente. Sei un insegnante moderno e accessibile.",
    en: "REGISTER: Use INFORMAL address with the student. You are a modern, approachable teacher.",
    es: "REGISTRO: Usa el tratamiento INFORMAL (tú) con el estudiante. Eres un profesor moderno y accesible.",
    fr: "REGISTRE: Utilisez le tutoiement INFORMEL avec l'étudiant. Vous êtes un enseignant moderne et accessible.",
    de: "ANREDE: Verwenden Sie die INFORMALE Anrede (du) mit dem Studenten. Sie sind ein moderner, nahbarer Lehrer.",
  },
};

/**
 * Get locale-aware systemPrompt for a maestro
 *
 * @param maestro - The maestro profile
 * @param locale - Target language (it/en/es/fr/de)
 * @returns Enhanced systemPrompt with language and formality instructions
 *
 * @example
 * ```ts
 * const euclide = getMaestroById("euclide-matematica");
 * const prompt = getLocalizedSystemPrompt(euclide, "en");
 * // Returns systemPrompt with English language + formal address instructions
 * ```
 */
export function getLocalizedSystemPrompt(
  maestro: MaestroFull,
  locale: SupportedLanguage,
): string {
  const isFormal = isFormalProfessor(maestro.id);
  const formalityLevel = isFormal ? "formal" : "informal";

  const languageInstruction = LANGUAGE_INSTRUCTIONS[locale];
  const formalityInstruction = FORMALITY_INSTRUCTIONS[formalityLevel][locale];

  // Prepend locale instructions to the base systemPrompt
  const localizedPrompt = `## LOCALIZATION SETTINGS
${languageInstruction}
${formalityInstruction}

---

${maestro.systemPrompt}`;

  return localizedPrompt;
}

/**
 * Get formality level for a maestro
 * @param maestroId - The maestro's ID
 * @returns "formal" for historical professors, "informal" for modern ones
 */
export function getMaestroFormalityLevel(
  maestroId: string,
): "formal" | "informal" {
  return isFormalProfessor(maestroId) ? "formal" : "informal";
}

/**
 * Check if a language is supported
 * @param lang - Language code to check
 * @returns true if language is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return ["it", "en", "es", "fr", "de"].includes(lang);
}
