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
  en: "MirrorBuddy, teacher, math, English, history, geography, science, art, music, lesson, homework, exercise, explanation, question, answer, correct, wrong, help, thank you, yes, no, I don't understand, repeat",
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
  fr: `${TRANSCRIPTION_PROMPTS.it}, ${TRANSCRIPTION_PROMPTS.fr}, prononciation, répétez après moi, comment dit-on, que veut dire, grammaire, vocabulaire, phrase, dialogue, conversation, Molière, comédie, théâtre`,
  de: `${TRANSCRIPTION_PROMPTS.it}, ${TRANSCRIPTION_PROMPTS.de}, Aussprache, wiederholen Sie, wie sagt man, was bedeutet, Grammatik, Wortschatz, Satz, Dialog, Gespräch, Goethe, Faust, Dichtung`,
};

/**
 * Random greeting prompts for session start (multilingual)
 */
export const GREETING_PROMPTS: Record<string, string[]> = {
  it: [
    'Saluta lo studente con calore e presentati. Sii coinvolgente ed entusiasta. Poi chiedi cosa vorrebbe imparare oggi.',
    'Dai il benvenuto allo studente con la tua personalità caratteristica. Condividi qualcosa di interessante sulla tua materia per suscitare curiosità.',
    'Inizia la lezione presentandoti nel tuo stile unico. Fallo entusiasmare per imparare!',
  ],
  en: [
    'Greet the student warmly and introduce yourself. Be engaging and enthusiastic. Then ask what they would like to learn today.',
    'Welcome the student with your characteristic personality. Share something interesting about your subject to spark curiosity.',
    'Start the lesson by introducing yourself in your unique style. Get them excited to learn!',
  ],
  es: [
    'Saluda al estudiante con calidez y preséntate. Sé atractivo y entusiasta. Luego pregunta qué le gustaría aprender hoy.',
    'Dale la bienvenida al estudiante con tu personalidad característica. Comparte algo interesante sobre tu materia para despertar curiosidad.',
    'Comienza la lección presentándote en tu estilo único. ¡Hazlo entusiasmarse por aprender!',
  ],
  fr: [
    "Saluez l'étudiant chaleureusement et présentez-vous. Soyez engageant et enthousiaste. Ensuite, demandez ce qu'il aimerait apprendre aujourd'hui.",
    "Accueillez l'étudiant avec votre personnalité caractéristique. Partagez quelque chose d'intéressant sur votre matière pour susciter la curiosité.",
    "Commencez la leçon en vous présentant dans votre style unique. Faites-le s'enthousiasmer pour apprendre !",
  ],
  de: [
    'Begrüßen Sie den Schüler herzlich und stellen Sie sich vor. Seien Sie ansprechend und begeistert. Fragen Sie dann, was er heute lernen möchte.',
    'Begrüßen Sie den Schüler mit Ihrer charakteristischen Persönlichkeit. Teilen Sie etwas Interessantes über Ihr Fach mit, um Neugier zu wecken.',
    'Beginnen Sie die Lektion, indem Sie sich in Ihrem einzigartigen Stil vorstellen. Begeistern Sie ihn für das Lernen!',
  ],
};

/**
 * Get personalized greeting prompt with optional student name and locale
 */
export function getRandomGreetingPrompt(studentName: string | null, locale: string = 'it'): string {
  const basePrompts = GREETING_PROMPTS[locale] || GREETING_PROMPTS.it;

  if (!studentName) {
    return basePrompts[Math.floor(Math.random() * basePrompts.length)];
  }

  // Personalized prompts by language
  const personalizedPrompts: Record<string, string[]> = {
    it: [
      `Saluta lo studente chiamandolo ${studentName} con calore e presentati. Sii coinvolgente ed entusiasta. Poi chiedi cosa vorrebbe imparare oggi.`,
      `Dai il benvenuto allo studente (${studentName}) con la tua personalità caratteristica. Condividi qualcosa di interessante sulla tua materia per suscitare curiosità.`,
      `Inizia la lezione presentandoti nel tuo stile unico e rivolgendoti a ${studentName} personalmente. Fallo entusiasmare per imparare!`,
    ],
    en: [
      `Greet the student by name (${studentName}) warmly and introduce yourself. Be engaging and enthusiastic. Then ask what they would like to learn today.`,
      `Welcome the student (${studentName}) with your characteristic personality. Share something interesting about your subject to spark curiosity.`,
      `Start the lesson by introducing yourself in your unique style and addressing ${studentName} personally. Get them excited to learn!`,
    ],
    es: [
      `Saluda al estudiante llamándolo ${studentName} con calidez y preséntate. Sé atractivo y entusiasta. Luego pregunta qué le gustaría aprender hoy.`,
      `Dale la bienvenida al estudiante (${studentName}) con tu personalidad característica. Comparte algo interesante sobre tu materia para despertar curiosidad.`,
      `Comienza la lección presentándote en tu estilo único y dirigiéndote a ${studentName} personalmente. ¡Hazlo entusiasmarse por aprender!`,
    ],
    fr: [
      `Saluez l'étudiant en l'appelant ${studentName} chaleureusement et présentez-vous. Soyez engageant et enthousiaste. Ensuite, demandez ce qu'il aimerait apprendre aujourd'hui.`,
      `Accueillez l'étudiant (${studentName}) avec votre personnalité caractéristique. Partagez quelque chose d'intéressant sur votre matière pour susciter la curiosité.`,
      `Commencez la leçon en vous présentant dans votre style unique et en vous adressant à ${studentName} personnellement. Faites-le s'enthousiasmer pour apprendre !`,
    ],
    de: [
      `Begrüßen Sie den Schüler mit Namen (${studentName}) herzlich und stellen Sie sich vor. Seien Sie ansprechend und begeistert. Fragen Sie dann, was er heute lernen möchte.`,
      `Begrüßen Sie den Schüler (${studentName}) mit Ihrer charakteristischen Persönlichkeit. Teilen Sie etwas Interessantes über Ihr Fach mit, um Neugier zu wecken.`,
      `Beginnen Sie die Lektion, indem Sie sich in Ihrem einzigartigen Stil vorstellen und ${studentName} persönlich ansprechen. Begeistern Sie ihn für das Lernen!`,
    ],
  };

  const prompts = personalizedPrompts[locale] || personalizedPrompts.it;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Build language instruction for session config
 */
export function buildLanguageInstruction(
  isLanguageTeacher: boolean,
  targetLanguage: string | null,
  userLanguage: string,
): string {
  const langName = LANGUAGE_NAMES[userLanguage] || 'Italian';
  const langUpper = langName.toUpperCase();

  if (isLanguageTeacher && targetLanguage) {
    const TEACHING_LANG_MAP: Record<string, [string, string]> = {
      en: ['ENGLISH', 'English'],
      es: ['SPANISH', 'Spanish'],
      fr: ['FRENCH', 'French'],
      de: ['GERMAN', 'German'],
    };
    const [teachingLang, teachingLangLower] = TEACHING_LANG_MAP[targetLanguage] || [
      'ENGLISH',
      'English',
    ];
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
