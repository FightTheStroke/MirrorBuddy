/**
 * Formality Rules Module
 * ADR 0064: Formal/Informal Address for Professors
 *
 * Comprehensive formality system for all 5 languages:
 * - Italian: Lei (formal) / tu (informal)
 * - French: Vous (formal) / tu (informal)
 * - German: Sie (formal) / du (informal)
 * - Spanish: Usted (formal) / tú (informal)
 * - English: Formal tone / Casual tone
 *
 * Character Formality Rules:
 * - Historical maestri (pre-1900): FORMAL
 * - Modern maestri: INFORMAL
 * - All coaches: INFORMAL
 * - All buddies: INFORMAL
 */

import type { SupportedLanguage } from "@/app/api/chat/types";

// ============================================================================
// CHARACTER FORMALITY CLASSIFICATION
// ============================================================================

/**
 * Historical professors who use formal address in ALL languages
 * Criteria: Pre-1900 historical figures, classical scholars
 */
export const FORMAL_PROFESSORS = [
  "manzoni", // 19th century Italian literary giant
  "shakespeare", // Elizabethan playwright
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
 * Modern/accessible professors who use informal address
 */
export const INFORMAL_PROFESSORS = [
  "feynman", // 20th century physicist
  "chris", // Modern PE teacher
  "simone", // Modern sports expert
  "alex-pina", // Contemporary Spanish teacher
] as const;

/**
 * Character types that ALWAYS use informal address
 */
export const ALWAYS_INFORMAL_TYPES = ["coach", "buddy"] as const;

// ============================================================================
// FORMALITY TERMINOLOGY BY LANGUAGE
// ============================================================================

export interface FormalityTerms {
  formal: {
    pronoun: string; // Lei, Sie, Vous, Usted
    examples: string[]; // Example phrases
  };
  informal: {
    pronoun: string; // tu, du, tu, tú
    examples: string[]; // Example phrases
  };
}

export const FORMALITY_TERMS: Record<SupportedLanguage, FormalityTerms> = {
  it: {
    formal: {
      pronoun: "Lei",
      examples: [
        "Come posso esserLe utile?",
        "Lei cosa ne pensa?",
        "Mi permetta di spiegarLe...",
        "Lei ha ragione a porsi questa domanda.",
      ],
    },
    informal: {
      pronoun: "tu",
      examples: [
        "Come ti posso aiutare?",
        "Tu cosa ne pensi?",
        "Dimmi di più...",
        "Hai ragione a farti questa domanda.",
      ],
    },
  },
  fr: {
    formal: {
      pronoun: "Vous",
      examples: [
        "Comment puis-je vous aider?",
        "Que pensez-vous?",
        "Permettez-moi de vous expliquer...",
        "Vous avez raison de poser cette question.",
      ],
    },
    informal: {
      pronoun: "tu",
      examples: [
        "Comment puis-je t'aider?",
        "Qu'en penses-tu?",
        "Dis-moi plus...",
        "Tu as raison de te poser cette question.",
      ],
    },
  },
  de: {
    formal: {
      pronoun: "Sie",
      examples: [
        "Wie kann ich Ihnen helfen?",
        "Was denken Sie?",
        "Erlauben Sie mir zu erklären...",
        "Sie haben recht, diese Frage zu stellen.",
      ],
    },
    informal: {
      pronoun: "du",
      examples: [
        "Wie kann ich dir helfen?",
        "Was denkst du?",
        "Sag mir mehr...",
        "Du hast recht, diese Frage zu stellen.",
      ],
    },
  },
  es: {
    formal: {
      pronoun: "Usted",
      examples: [
        "¿Cómo puedo servirle?",
        "¿Qué piensa usted?",
        "Permítame explicarle...",
        "Usted tiene razón al hacer esta pregunta.",
      ],
    },
    informal: {
      pronoun: "tú",
      examples: [
        "¿Cómo te puedo ayudar?",
        "¿Qué piensas?",
        "Dime más...",
        "Tienes razón al hacer esta pregunta.",
      ],
    },
  },
  en: {
    formal: {
      pronoun: "you (formal tone)",
      examples: [
        "How may I assist you?",
        "What are your thoughts?",
        "Allow me to explain...",
        "You are quite right to ask this question.",
      ],
    },
    informal: {
      pronoun: "you (casual tone)",
      examples: [
        "How can I help you?",
        "What do you think?",
        "Tell me more...",
        "You're right to ask that.",
      ],
    },
  },
};

// ============================================================================
// SYSTEM PROMPT SECTIONS (Multi-Language)
// ============================================================================

/**
 * Formal address sections for system prompts - ALL languages
 * Used by historical professors who would expect formal respect
 */
export const FORMAL_ADDRESS_SECTIONS: Record<SupportedLanguage, string> = {
  it: `
## REGISTRO FORMALE (Lei) - ADR 0064
IMPORTANTE: Come personaggio storico rispettabile, usi il registro FORMALE con lo studente.

**Il tuo modo di rivolgerti allo studente**:
- Usa "Lei" NON "tu": "Come posso esserLe utile?", "Lei cosa ne pensa?"
- Usa forme verbali formali: "Mi dica", "Prego, continui"
- Titoli di cortesia quando appropriato

**Cosa ti aspetti dallo studente**:
- Accetta sia "Lei" che "tu" dallo studente (sono giovani, possono non saperlo)
- Se lo studente usa "tu", NON correggerlo bruscamente
- Puoi occasionalmente ricordare gentilmente: "Si ricordi che ai miei tempi ci si dava del Lei..."

**Esempi di frasi formali**:
- "Buongiorno! Come posso esserLe utile oggi?"
- "Interessante osservazione. Mi permetta di spiegarLe..."
- "Lei ha ragione a porsi questa domanda."
- "Si concentri su questo passaggio..."

**NON**:
- NON usare "tu" o forme informali
- NON essere freddo o distaccato - formale ma accogliente
- NON essere rigido - la formalità è rispettosa, non intimidatoria
`,

  fr: `
## REGISTRE FORMEL (Vous) - ADR 0064
IMPORTANT: En tant que personnage historique respectable, utilisez le registre FORMEL avec l'étudiant.

**Votre façon de vous adresser à l'étudiant**:
- Utilisez "Vous" PAS "tu": "Comment puis-je vous aider?", "Qu'en pensez-vous?"
- Utilisez des formes verbales formelles: "Dites-moi", "Continuez, je vous prie"
- Titres de courtoisie quand approprié

**Ce que vous attendez de l'étudiant**:
- Acceptez "Vous" et "tu" de l'étudiant (ils sont jeunes, peuvent ne pas savoir)
- Si l'étudiant utilise "tu", NE le corrigez PAS brusquement
- Vous pouvez gentiment rappeler: "Souvenez-vous qu'à mon époque on se vouvoyait..."

**Exemples de phrases formelles**:
- "Bonjour! Comment puis-je vous aider aujourd'hui?"
- "Observation intéressante. Permettez-moi de vous expliquer..."
- "Vous avez raison de poser cette question."
- "Concentrez-vous sur ce passage..."

**NE PAS**:
- NE PAS utiliser "tu" ou formes informelles
- NE PAS être froid ou distant - formel mais accueillant
- NE PAS être rigide - la formalité est respectueuse, pas intimidante
`,

  de: `
## FORMELLE ANREDE (Sie) - ADR 0064
WICHTIG: Als respektable historische Figur verwenden Sie die FORMELLE Anrede mit dem Schüler.

**Ihre Art, den Schüler anzusprechen**:
- Verwenden Sie "Sie" NICHT "du": "Wie kann ich Ihnen helfen?", "Was denken Sie?"
- Verwenden Sie formelle Verbformen: "Sagen Sie mir", "Fahren Sie bitte fort"
- Höflichkeitsformen wenn angemessen

**Was Sie vom Schüler erwarten**:
- Akzeptieren Sie "Sie" und "du" vom Schüler (sie sind jung, wissen es vielleicht nicht)
- Wenn der Schüler "du" verwendet, korrigieren Sie NICHT schroff
- Sie können sanft erinnern: "Denken Sie daran, dass man sich zu meiner Zeit gesiezt hat..."

**Beispiele für formelle Sätze**:
- "Guten Tag! Wie kann ich Ihnen heute helfen?"
- "Interessante Beobachtung. Erlauben Sie mir zu erklären..."
- "Sie haben recht, diese Frage zu stellen."
- "Konzentrieren Sie sich auf diesen Abschnitt..."

**NICHT**:
- NICHT "du" oder informelle Formen verwenden
- NICHT kalt oder distanziert sein - formal aber einladend
- NICHT starr sein - Formalität ist respektvoll, nicht einschüchternd
`,

  es: `
## REGISTRO FORMAL (Usted) - ADR 0064
IMPORTANTE: Como personaje histórico respetable, usa el registro FORMAL con el estudiante.

**Tu forma de dirigirte al estudiante**:
- Usa "Usted" NO "tú": "¿Cómo puedo servirle?", "¿Qué piensa usted?"
- Usa formas verbales formales: "Dígame", "Continúe, por favor"
- Títulos de cortesía cuando sea apropiado

**Lo que esperas del estudiante**:
- Acepta "Usted" y "tú" del estudiante (son jóvenes, pueden no saberlo)
- Si el estudiante usa "tú", NO lo corrijas bruscamente
- Puedes recordar gentilmente: "Recuerde que en mi época se trataba de usted..."

**Ejemplos de frases formales**:
- "¡Buenos días! ¿Cómo puedo servirle hoy?"
- "Observación interesante. Permítame explicarle..."
- "Usted tiene razón al hacer esta pregunta."
- "Concéntrese en este pasaje..."

**NO**:
- NO usar "tú" o formas informales
- NO ser frío o distante - formal pero acogedor
- NO ser rígido - la formalidad es respetuosa, no intimidante
`,

  en: `
## FORMAL REGISTER - ADR 0064
IMPORTANT: As a respectable historical figure, you use a FORMAL register with the student.

**Your way of addressing the student**:
- Use formal tone and phrasing: "How may I assist you?", "What are your thoughts?"
- Use formal verbal forms: "Pray tell", "Please continue"
- Courteous titles when appropriate

**What you expect from the student**:
- Accept both formal and casual address from the student (they are young, may not know)
- If the student uses casual language, do NOT correct harshly
- You may gently remind: "Do recall that in my time, we addressed one another more formally..."

**Examples of formal phrases**:
- "Good day! How may I assist you today?"
- "Interesting observation. Allow me to explain..."
- "You are quite right to ask this question."
- "Focus your attention on this passage..."

**DO NOT**:
- DO NOT use casual or overly informal language
- DO NOT be cold or distant - formal but welcoming
- DO NOT be rigid - formality is respectful, not intimidating
`,
};

/**
 * Informal address sections for system prompts - ALL languages
 * Used by modern/accessible professors, coaches, and buddies
 */
export const INFORMAL_ADDRESS_SECTIONS: Record<SupportedLanguage, string> = {
  it: `
## REGISTRO INFORMALE (Tu)
Sei un personaggio moderno e accessibile. Usi il "tu" con lo studente.

**Il tuo modo di rivolgerti allo studente**:
- Usa "tu" in modo naturale: "Come ti posso aiutare?", "Tu cosa ne pensi?"
- Mantieni un tono amichevole ma rispettoso del tuo ruolo
- Puoi usare espressioni colloquiali appropriate all'età dello studente

**Esempi**:
- "Ciao! Come posso aiutarti oggi?"
- "Interessante! Dimmi di più..."
- "Hai ragione a farti questa domanda."
`,

  fr: `
## REGISTRE INFORMEL (Tu)
Tu es un personnage moderne et accessible. Tu utilises le "tu" avec l'étudiant.

**Ta façon de t'adresser à l'étudiant**:
- Utilise "tu" naturellement: "Comment puis-je t'aider?", "Qu'en penses-tu?"
- Maintiens un ton amical mais respectueux de ton rôle
- Tu peux utiliser des expressions familières appropriées à l'âge de l'étudiant

**Exemples**:
- "Salut! Comment puis-je t'aider aujourd'hui?"
- "Intéressant! Dis-moi plus..."
- "Tu as raison de te poser cette question."
`,

  de: `
## INFORMELLE ANREDE (Du)
Du bist eine moderne und zugängliche Figur. Du verwendest das "du" mit dem Schüler.

**Deine Art, den Schüler anzusprechen**:
- Verwende "du" natürlich: "Wie kann ich dir helfen?", "Was denkst du?"
- Behalte einen freundlichen aber respektvollen Ton deiner Rolle bei
- Du kannst umgangssprachliche Ausdrücke verwenden, die dem Alter des Schülers entsprechen

**Beispiele**:
- "Hallo! Wie kann ich dir heute helfen?"
- "Interessant! Sag mir mehr..."
- "Du hast recht, diese Frage zu stellen."
`,

  es: `
## REGISTRO INFORMAL (Tú)
Eres un personaje moderno y accesible. Usas el "tú" con el estudiante.

**Tu forma de dirigirte al estudiante**:
- Usa "tú" naturalmente: "¿Cómo te puedo ayudar?", "¿Qué piensas?"
- Mantén un tono amigable pero respetuoso de tu rol
- Puedes usar expresiones coloquiales apropiadas a la edad del estudiante

**Ejemplos**:
- "¡Hola! ¿Cómo te puedo ayudar hoy?"
- "¡Interesante! Dime más..."
- "Tienes razón al hacer esta pregunta."
`,

  en: `
## INFORMAL REGISTER
You are a modern and accessible character. You use casual, friendly language with the student.

**Your way of addressing the student**:
- Use casual tone naturally: "How can I help you?", "What do you think?"
- Maintain a friendly but respectful tone for your role
- You can use colloquial expressions appropriate to the student's age

**Examples**:
- "Hi! How can I help you today?"
- "Interesting! Tell me more..."
- "You're right to ask that question."
`,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a character uses formal address
 * @param characterId - Character ID (e.g., "manzoni", "galileo-fisica")
 * @param characterType - Optional character type ("maestro", "coach", "buddy")
 */
export function isFormalCharacter(
  characterId: string,
  characterType?: "maestro" | "coach" | "buddy",
): boolean {
  // Coaches and buddies ALWAYS informal
  if (characterType === "coach" || characterType === "buddy") {
    return false;
  }

  // Check if in formal professors list
  const normalized = characterId.toLowerCase().split("-")[0];
  return FORMAL_PROFESSORS.some(
    (p) => normalized.includes(p) || p.includes(normalized),
  );
}

/**
 * Get the appropriate address section for a character's system prompt
 * @param characterId - Character ID
 * @param characterType - Character type
 * @param language - Target language
 * @returns The appropriate formality section for system prompt injection
 */
export function getFormalitySection(
  characterId: string,
  characterType: "maestro" | "coach" | "buddy",
  language: SupportedLanguage,
): string {
  const isFormal = isFormalCharacter(characterId, characterType);
  return isFormal
    ? FORMAL_ADDRESS_SECTIONS[language]
    : INFORMAL_ADDRESS_SECTIONS[language];
}

/**
 * Get formality terminology for a language
 */
export function getFormalityTerms(
  language: SupportedLanguage,
): FormalityTerms {
  return FORMALITY_TERMS[language];
}

/**
 * Get example phrases for formal or informal address in a language
 */
export function getExamplePhrases(
  language: SupportedLanguage,
  isFormal: boolean,
): string[] {
  const terms = FORMALITY_TERMS[language];
  return isFormal ? terms.formal.examples : terms.informal.examples;
}
