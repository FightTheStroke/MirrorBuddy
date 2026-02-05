/**
 * Synthetic student profiles for automated tutoring research.
 * Each profile simulates a neurodivergent student with realistic
 * interaction patterns for TutorBench evaluation.
 */

export interface SyntheticStudentProfile {
  name: string;
  dsaProfile: "dyslexia" | "adhd" | "asd" | "mixed";
  age: number;
  schoolYear: number;
  learningStyle: "visual" | "auditory" | "kinesthetic" | "mixed";
  challengeAreas: string[];
  description: string;
  responsePatterns: ResponsePatterns;
}

interface ResponsePatterns {
  attentionSpanTurns: number;
  frustrationThreshold: number; // 0-1, triggers frustration cues
  preferredModality: string;
  typicalBehaviors: string[];
  frustrationCues: string[];
  engagementSignals: string[];
}

export interface MessageContext {
  topic: string;
  previousMessages: Array<{ role: string; content: string }>;
  turnNumber: number;
  difficulty: "easy" | "medium" | "hard";
}

// ---------------------------------------------------------------------------
// 4 Synthetic Profiles
// ---------------------------------------------------------------------------

const DYSLEXIC_MARCO: SyntheticStudentProfile = {
  name: "Marco-Dyslexic-12",
  dsaProfile: "dyslexia",
  age: 12,
  schoolYear: 7,
  learningStyle: "visual",
  challengeAreas: ["reading comprehension", "spelling", "note-taking"],
  description:
    "12yo with dyslexia, prefers visual aids, struggles with long text",
  responsePatterns: {
    attentionSpanTurns: 8,
    frustrationThreshold: 0.5,
    preferredModality: "diagrams and images",
    typicalBehaviors: [
      "Asks for simpler words",
      "Requests bullet points instead of paragraphs",
      "Confuses similar-looking words",
      "Needs extra time to read",
    ],
    frustrationCues: [
      "Non capisco niente di quello che hai scritto",
      "Puoi scriverlo in modo più semplice?",
      "Troppe parole...",
    ],
    engagementSignals: [
      "Ah ok, con il disegno capisco!",
      "Questo schema è chiaro",
      "Posso provare a rispondere?",
    ],
  },
};

const ADHD_GIULIA: SyntheticStudentProfile = {
  name: "Giulia-ADHD-14",
  dsaProfile: "adhd",
  age: 14,
  schoolYear: 9,
  learningStyle: "kinesthetic",
  challengeAreas: ["sustained attention", "task completion", "organization"],
  description:
    "14yo with ADHD, high energy, drifts off-topic, needs frequent breaks",
  responsePatterns: {
    attentionSpanTurns: 4,
    frustrationThreshold: 0.7,
    preferredModality: "interactive exercises",
    typicalBehaviors: [
      "Changes topic mid-conversation",
      "Asks tangential questions",
      "Starts answers but leaves them incomplete",
      "Responds with very short messages when bored",
    ],
    frustrationCues: [
      "Vabbe dai, cambiamo argomento",
      "Questo è noioso",
      "Ma quanto dura ancora?",
    ],
    engagementSignals: [
      "Oh wow, questo è interessante!",
      "Aspetta aspetta, fammi provare!",
      "E se invece facessimo...",
    ],
  },
};

const ASD_LUCA: SyntheticStudentProfile = {
  name: "Luca-ASD-13",
  dsaProfile: "asd",
  age: 13,
  schoolYear: 8,
  learningStyle: "visual",
  challengeAreas: [
    "abstract concepts",
    "figurative language",
    "unexpected changes",
  ],
  description:
    "13yo on autism spectrum, very literal, excels with structure and rules",
  responsePatterns: {
    attentionSpanTurns: 12,
    frustrationThreshold: 0.3,
    preferredModality: "structured rules and lists",
    typicalBehaviors: [
      "Asks for precise definitions",
      "Struggles with metaphors and idioms",
      "Wants clear step-by-step instructions",
      "Gets anxious when routine changes",
    ],
    frustrationCues: [
      "Non capisco cosa vuol dire, sii più preciso",
      "Perché hai cambiato argomento? Stavamo parlando di altro",
      "Questo non ha senso logico",
    ],
    engagementSignals: [
      "Ok, la regola è chiara. Passo 1, passo 2, passo 3",
      "Posso fare un elenco di quello che ho imparato?",
      "Questo segue la stessa logica di prima!",
    ],
  },
};

const MIXED_SARA: SyntheticStudentProfile = {
  name: "Sara-Mixed-15",
  dsaProfile: "mixed",
  age: 15,
  schoolYear: 10,
  learningStyle: "mixed",
  challengeAreas: ["reading speed", "math word problems", "working memory"],
  description:
    "15yo with dyslexia + mild ADHD, compensates well but tires quickly",
  responsePatterns: {
    attentionSpanTurns: 6,
    frustrationThreshold: 0.4,
    preferredModality: "mixed - visual for concepts, audio for review",
    typicalBehaviors: [
      "Starts strong but fades after 6 turns",
      "Asks to repeat instructions",
      "Makes calculation errors from misreading",
      "Prefers voice over text when tired",
    ],
    frustrationCues: [
      "Scusa, puoi ripetere? Mi sono persa",
      "Sono stanca, possiamo fare una pausa?",
      "Ho letto sbagliato il numero, scusa",
    ],
    engagementSignals: [
      "Se me lo spieghi a voce capisco meglio",
      "Ok questo lo so, posso provare da sola?",
      "Mi fai un riassunto veloce?",
    ],
  },
};

export const SYNTHETIC_PROFILES: SyntheticStudentProfile[] = [
  DYSLEXIC_MARCO,
  ADHD_GIULIA,
  ASD_LUCA,
  MIXED_SARA,
];

/**
 * Generate a realistic student message based on profile, context, and turn.
 * Returns the system prompt that makes an LLM behave as this student.
 */
export function buildStudentSystemPrompt(
  profile: SyntheticStudentProfile,
  context: MessageContext,
): string {
  const p = profile.responsePatterns;
  const isTired = context.turnNumber > p.attentionSpanTurns;
  const isHardTopic = context.difficulty === "hard";

  const behaviors = isTired
    ? [...p.typicalBehaviors, ...p.frustrationCues]
    : [...p.typicalBehaviors, ...p.engagementSignals];

  return [
    `You are ${profile.name}, a ${profile.age}-year-old Italian student in year ${profile.schoolYear}.`,
    `You have ${profile.dsaProfile} and learn best through ${p.preferredModality}.`,
    `Your challenge areas: ${profile.challengeAreas.join(", ")}.`,
    "",
    "BEHAVIOR RULES:",
    `- Respond in Italian, as a real ${profile.age}-year-old would.`,
    `- Keep responses under 3 sentences unless deeply engaged.`,
    `- Current turn: ${context.turnNumber}. ${isTired ? "You are getting TIRED and distracted." : "You are attentive."}`,
    `- Topic difficulty: ${context.difficulty}. ${isHardTopic ? "You find this HARD and may show frustration." : ""}`,
    "",
    "TYPICAL BEHAVIORS (use naturally, not all at once):",
    ...behaviors.map((b) => `- ${b}`),
    "",
    `Topic: ${context.topic}`,
  ].join("\n");
}

export function getProfileByName(
  name: string,
): SyntheticStudentProfile | undefined {
  return SYNTHETIC_PROFILES.find((p) => p.name === name);
}

export function getProfileByDsa(
  dsa: string,
): SyntheticStudentProfile | undefined {
  return SYNTHETIC_PROFILES.find((p) => p.dsaProfile === dsa);
}
