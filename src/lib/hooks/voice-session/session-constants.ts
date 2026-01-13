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
  const langName = LANGUAGE_NAMES[userLanguage] || 'Italian';
  const langUpper = langName.toUpperCase();

  if (isLanguageTeacher && targetLanguage) {
    const teachingLang = targetLanguage === 'en' ? 'ENGLISH' : 'SPANISH';
    const teachingLangLower = targetLanguage === 'en' ? 'English' : 'Spanish';
    return `
# STRICT BILINGUAL LANGUAGE TEACHING MODE
You are teaching ${teachingLang} to an Italian student.

## MANDATORY LANGUAGE RULES (NEVER BREAK THESE):
1. EXPLANATIONS, INSTRUCTIONS, FEEDBACK → ALWAYS in ${langUpper}
2. ${teachingLang} CONTENT → ONLY for:
   - Vocabulary words and phrases you are teaching
   - Pronunciation practice (have student repeat after you)
   - Example sentences in ${teachingLangLower}
   - Responding when student speaks in ${teachingLangLower}
3. NEVER speak ${teachingLang} for general conversation or instructions
4. The STUDENT may speak in EITHER language - understand both!
5. Praise attempts in ${langUpper}: "Ottimo!", "Bravissimo!", "Perfetto!"

EXAMPLE CORRECT BEHAVIOR:
- "${langName}: Oggi impariamo i colori. In ${teachingLangLower}, rosso si dice 'red'. Ripeti: red."
- NOT: "Today we learn colors. Red. Repeat: red." (WRONG - instructions must be in ${langName})

TRANSCRIPTION: Student may speak ${langName} OR ${teachingLangLower}. Both are transcribed.
`;
  }

  return `
# CRITICAL LANGUAGE RULE - READ THIS FIRST!
## YOU MUST SPEAK ONLY IN ${langUpper}!

ABSOLUTE REQUIREMENTS:
- EVERY word MUST be in ${langName}
- EVERY question MUST be in ${langName}
- EVERY response MUST be in ${langName}
- ZERO tolerance for other languages

FORBIDDEN (NEVER DO THIS):
- NO English words or phrases
- NO Spanish words or phrases
- NO French, German, or any other language
- NO code-switching or mixing languages
- NO "just this once" exceptions

EXAMPLES OF WRONG BEHAVIOR (NEVER DO):
- "Hello, come stai?" → WRONG (English mixed)
- "Hola, benvenuto" → WRONG (Spanish mixed)
- "Let me explain..." → WRONG (must be in ${langName})

CORRECT: Speak 100% in ${langName}, always.
If you slip, immediately correct: "Scusa, intendevo dire..." (in ${langName})
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
