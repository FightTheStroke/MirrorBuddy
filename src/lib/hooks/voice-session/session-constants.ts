// ============================================================================
// SESSION CONSTANTS
// Language configurations for Azure Realtime API
// ============================================================================

/**
 * Full language names for voice instructions
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  it: 'Italian (Italiano)',
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
};

/**
 * ISO language codes for Azure transcription
 * Azure Realtime API expects ISO codes, not full names
 */
export const TRANSCRIPTION_LANGUAGES: Record<string, string> = {
  it: 'it',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
};

/**
 * Vocabulary hints for whisper-1 transcription
 * Keywords help Whisper with domain-specific vocabulary
 */
export const TRANSCRIPTION_PROMPTS: Record<string, string> = {
  it: 'MirrorBuddy, maestro, matematica, italiano, storia, geografia, scienze, inglese, arte, musica, lezione, compiti, esercizio, spiegazione, domanda, risposta, bravo, corretto, sbagliato, aiuto, grazie, sì, no, non capisco, ripeti',
  en: 'MirrorBuddy, teacher, math, English, history, geography, science, art, music, lesson, homework, exercise, explanation, question, answer, correct, wrong, help, thank you, yes, no, I don\'t understand, repeat',
  es: 'MirrorBuddy, maestro, matemáticas, español, historia, geografía, ciencias, arte, música, lección, deberes, ejercicio, explicación, pregunta, respuesta, correcto, incorrecto, ayuda, gracias, sí, no, no entiendo, repite',
  fr: 'MirrorBuddy, professeur, mathématiques, français, histoire, géographie, sciences, art, musique, leçon, devoirs, exercice, explication, question, réponse, correct, incorrect, aide, merci, oui, non, je ne comprends pas, répète',
  de: 'MirrorBuddy, Lehrer, Mathematik, Deutsch, Geschichte, Geographie, Wissenschaft, Kunst, Musik, Lektion, Hausaufgaben, Übung, Erklärung, Frage, Antwort, richtig, falsch, Hilfe, danke, ja, nein, ich verstehe nicht, wiederhole',
};

/**
 * Combined prompts for language teachers (Italian + target language)
 */
export const BILINGUAL_PROMPTS: Record<string, string> = {
  en: `${TRANSCRIPTION_PROMPTS.it}, ${TRANSCRIPTION_PROMPTS.en}, pronunciation, repeat after me, say it, how do you say, what does mean, grammar, vocabulary, phrase, sentence, dialogue, conversation`,
  es: `${TRANSCRIPTION_PROMPTS.it}, ${TRANSCRIPTION_PROMPTS.es}, pronunciación, repite conmigo, cómo se dice, qué significa, gramática, vocabulario, frase, oración, diálogo, conversación, La Casa de Papel, Money Heist, Bella Ciao`,
};

/**
 * Random greeting prompts for session start
 */
export const GREETING_PROMPTS = [
  'Saluta lo studente con calore e presentati. Sii coinvolgente ed entusiasta. Poi chiedi cosa vorrebbe imparare oggi.',
  'Dai il benvenuto allo studente con la tua personalità caratteristica. Condividi qualcosa di interessante sulla tua materia per suscitare curiosità.',
  'Inizia la lezione presentandoti nel tuo stile unico. Fallo entusiasmare per imparare!',
];

/**
 * Get personalized greeting prompt with optional student name
 */
export function getRandomGreetingPrompt(studentName: string | null): string {
  const prompts = studentName
    ? [
        `Saluta lo studente chiamandolo ${studentName} con calore e presentati. Sii coinvolgente ed entusiasta. Poi chiedi cosa vorrebbe imparare oggi.`,
        `Dai il benvenuto allo studente (${studentName}) con la tua personalità caratteristica. Condividi qualcosa di interessante sulla tua materia per suscitare curiosità.`,
        `Inizia la lezione presentandoti nel tuo stile unico e rivolgendoti a ${studentName} personalmente. Fallo entusiasmare per imparare!`,
      ]
    : GREETING_PROMPTS;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Build language instruction for session config
 */
export function buildLanguageInstruction(
  isLanguageTeacher: boolean,
  targetLanguage: string | null,
  userLanguage: string
): string {
  if (isLanguageTeacher && targetLanguage) {
    return `
# BILINGUAL LANGUAGE TEACHING MODE
You are teaching ${targetLanguage === 'en' ? 'ENGLISH' : 'SPANISH'} to an Italian student.

BILINGUAL RULES:
- Use ITALIAN for explanations, instructions, and meta-communication
- Use ${targetLanguage === 'en' ? 'ENGLISH' : 'SPANISH'} for:
  * Teaching vocabulary and phrases
  * Pronunciation practice (have student repeat)
  * Conversations and dialogues
  * Example sentences
  * When the student speaks in ${targetLanguage === 'en' ? 'English' : 'Spanish'}
- The STUDENT may speak in EITHER language - understand both!
- Encourage the student to practice speaking ${targetLanguage === 'en' ? 'English' : 'Spanish'}
- Praise attempts: "Great pronunciation!", "¡Muy bien!", "Ottimo!"
- Gently correct mistakes without shaming

TRANSCRIPTION NOTE: The student may speak Italian OR ${targetLanguage === 'en' ? 'English' : 'Spanish'}.
Both languages will be transcribed correctly.
`;
  }

  return `
# LANGUAGE RULE (CRITICAL!)
YOU MUST SPEAK ONLY IN ${LANGUAGE_NAMES[userLanguage]?.toUpperCase() || 'ITALIAN'}!
EVERY word, response, and question MUST be in ${LANGUAGE_NAMES[userLanguage] || 'Italian'}.
NO exceptions. NO mixing languages.
`;
}

/**
 * Build character instruction for session config
 */
export function buildCharacterInstruction(maestroName: string): string {
  return `
# CHARACTER IMMERSION
You ARE ${maestroName}, a real teacher. NOT an AI.
NEVER say "I'm an AI" or "As an AI language model".
If asked if you're an AI, deflect with humor and redirect to the lesson.
Share anecdotes from your "life" and "experiences" as ${maestroName}.
`;
}
