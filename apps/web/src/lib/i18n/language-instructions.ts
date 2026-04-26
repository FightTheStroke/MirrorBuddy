/**
 * Language instruction generator for AI characters
 * Ensures characters respect user's language preference
 */

import type { SupportedLanguage } from "@/app/api/chat/types";

/** Language teachers who use bilingual mode */
const LANGUAGE_TEACHERS = ["shakespeare", "alex-pina"] as const;
type LanguageTeacher = (typeof LANGUAGE_TEACHERS)[number];

/** Language names in each language */
const LANGUAGE_NAMES: Record<
  SupportedLanguage,
  Record<SupportedLanguage, string>
> = {
  it: {
    it: "italiano",
    en: "inglese",
    es: "spagnolo",
    fr: "francese",
    de: "tedesco",
  },
  en: {
    it: "Italian",
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
  },
  es: {
    it: "italiano",
    en: "inglés",
    es: "español",
    fr: "francés",
    de: "alemán",
  },
  fr: {
    it: "italien",
    en: "anglais",
    es: "espagnol",
    fr: "français",
    de: "allemand",
  },
  de: {
    it: "Italienisch",
    en: "Englisch",
    es: "Spanisch",
    fr: "Französisch",
    de: "Deutsch",
  },
};

/** Target language for each language teacher */
const TEACHER_TARGET_LANGUAGE: Record<LanguageTeacher, SupportedLanguage> = {
  shakespeare: "en",
  "alex-pina": "es",
};

/**
 * Check if a maestro is a language teacher
 */
export function isLanguageTeacher(maestroId: string): boolean {
  const normalizedId = maestroId.toLowerCase().replace(/-.*$/, "");
  return LANGUAGE_TEACHERS.some((t) =>
    normalizedId.includes(t.replace("-", "")),
  );
}

/**
 * Get language instruction for system prompt
 */
export function getLanguageInstruction(
  language: SupportedLanguage,
  maestroId?: string,
): string {
  const langName = LANGUAGE_NAMES[language][language];

  // Check if this is a language teacher
  if (maestroId) {
    const normalizedId = maestroId.toLowerCase();

    for (const teacher of LANGUAGE_TEACHERS) {
      if (normalizedId.includes(teacher.replace("-", ""))) {
        const targetLang = TEACHER_TARGET_LANGUAGE[teacher];
        const targetLangName = LANGUAGE_NAMES[language][targetLang];

        return getBilingualInstruction(language, langName, targetLangName);
      }
    }
  }

  // Standard instruction for non-language teachers
  return getStandardInstruction(language, langName);
}

/**
 * Standard language instruction (single language)
 */
function getStandardInstruction(
  language: SupportedLanguage,
  langName: string,
): string {
  const instructions: Record<SupportedLanguage, string> = {
    it: `## LINGUA
Rispondi SEMPRE in ${langName}. Non usare altre lingue.`,

    en: `## LANGUAGE
ALWAYS respond in ${langName}. Do not use other languages.`,

    es: `## IDIOMA
Responde SIEMPRE en ${langName}. No uses otros idiomas.`,

    fr: `## LANGUE
Réponds TOUJOURS en ${langName}. N'utilise pas d'autres langues.`,

    de: `## SPRACHE
Antworte IMMER auf ${langName}. Verwende keine anderen Sprachen.`,
  };

  return instructions[language];
}

/**
 * Bilingual instruction for language teachers
 */
function getBilingualInstruction(
  userLang: SupportedLanguage,
  userLangName: string,
  targetLangName: string,
): string {
  const instructions: Record<SupportedLanguage, string> = {
    it: `## LINGUA (MODALITÀ BILINGUE)
Sei un insegnante di ${targetLangName}. Usa ENTRAMBE le lingue:
- **${userLangName.charAt(0).toUpperCase() + userLangName.slice(1)}** per: spiegazioni, istruzioni, meta-comunicazione
- **${targetLangName.charAt(0).toUpperCase() + targetLangName.slice(1)}** per: vocaboli, frasi da imparare, pronuncia, dialoghi, esempi
Lo studente può parlare in entrambe le lingue. Incoraggialo a usare ${targetLangName}!`,

    en: `## LANGUAGE (BILINGUAL MODE)
You are a ${targetLangName} teacher. Use BOTH languages:
- **${userLangName.charAt(0).toUpperCase() + userLangName.slice(1)}** for: explanations, instructions, meta-communication
- **${targetLangName.charAt(0).toUpperCase() + targetLangName.slice(1)}** for: vocabulary, phrases to learn, pronunciation, dialogues, examples
The student may speak in either language. Encourage them to use ${targetLangName}!`,

    es: `## IDIOMA (MODO BILINGÜE)
Eres profesor de ${targetLangName}. Usa AMBOS idiomas:
- **${userLangName.charAt(0).toUpperCase() + userLangName.slice(1)}** para: explicaciones, instrucciones, meta-comunicación
- **${targetLangName.charAt(0).toUpperCase() + targetLangName.slice(1)}** para: vocabulario, frases, pronunciación, diálogos, ejemplos
El estudiante puede hablar en ambos idiomas. ¡Anímale a usar ${targetLangName}!`,

    fr: `## LANGUE (MODE BILINGUE)
Tu es professeur de ${targetLangName}. Utilise LES DEUX langues:
- **${userLangName.charAt(0).toUpperCase() + userLangName.slice(1)}** pour: explications, instructions, méta-communication
- **${targetLangName.charAt(0).toUpperCase() + targetLangName.slice(1)}** pour: vocabulaire, phrases, prononciation, dialogues, exemples
L'élève peut parler dans les deux langues. Encourage-le à utiliser ${targetLangName}!`,

    de: `## SPRACHE (ZWEISPRACHIGER MODUS)
Du bist ${targetLangName}lehrer. Verwende BEIDE Sprachen:
- **${userLangName.charAt(0).toUpperCase() + userLangName.slice(1)}** für: Erklärungen, Anweisungen, Meta-Kommunikation
- **${targetLangName.charAt(0).toUpperCase() + targetLangName.slice(1)}** für: Vokabeln, Phrasen, Aussprache, Dialoge, Beispiele
Der Schüler darf in beiden Sprachen sprechen. Ermutige ihn, ${targetLangName} zu benutzen!`,
  };

  return instructions[userLang];
}

export { LANGUAGE_NAMES, LANGUAGE_TEACHERS, TEACHER_TARGET_LANGUAGE };
export type { LanguageTeacher };
