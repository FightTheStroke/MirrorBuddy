// ============================================================================
// CHARACTER TYPES - Support Teachers, Buddies, Learning Differences
// ============================================================================

import type { MaestroVoice } from "./content";
import type { GreetingContext } from "./greeting";
import type { StudentProfile } from "./user";

/**
 * Learning differences that the platform supports.
 * Used for both student profiles and buddy matching.
 */
export type LearningDifference =
  | "dyslexia"
  | "dyscalculia"
  | "dysgraphia"
  | "adhd"
  | "autism"
  | "cerebralPalsy"
  | "visualImpairment"
  | "auditoryProcessing";

/**
 * Role of support characters in the Support Triangle.
 */
export type SupportRole = "learning_coach" | "peer_buddy";

/**
 * Gender option for support characters.
 * Students can choose their preferred coach/buddy gender.
 */
export type CharacterGender = "male" | "female";

/**
 * Extended student profile with learning differences.
 * Used by Mario/Noemi buddies to personalize their approach.
 */
export interface ExtendedStudentProfile extends StudentProfile {
  learningDifferences: LearningDifference[];
  preferredCoach?:
    | "melissa"
    | "roberto"
    | "chiara"
    | "andrea"
    | "favij"
    | "laura";
  preferredBuddy?: "mario" | "noemi" | "enea" | "bruno" | "sofia" | "marta";
}

/**
 * Support Teacher (Melissa/Roberto) - Learning Coach role.
 * Focus: develop autonomy and study method.
 * Relationship: vertical (coach), but talks "alongside" not "from above".
 */
export interface SupportTeacher {
  id: "melissa" | "roberto" | "chiara" | "andrea" | "favij" | "laura";
  name: string;
  gender: CharacterGender;
  age: number;
  personality: string;
  role: "learning_coach";
  voice: MaestroVoice;
  voiceInstructions: string;
  systemPrompt: string;
  greeting: string;
  /** Dynamic greeting generator (optional, language-aware) */
  getGreeting?: (context: GreetingContext) => string;
  avatar: string;
  color: string;
  tools: string[];
}

/**
 * MirrorBuddy (Mario/Noemi) - Peer Support role.
 * Focus: make student feel less alone.
 * Relationship: horizontal (friend), speaks as peer.
 *
 * System prompt is dynamic based on student profile:
 * - Age is always student.age + 1
 * - Learning differences mirror the student's
 */
export interface BuddyProfile {
  id: "mario" | "noemi" | "enea" | "bruno" | "sofia" | "marta";
  name: string;
  gender: CharacterGender;
  ageOffset: number; // Always 1 (one year older)
  personality: string;
  role: "peer_buddy";
  voice: MaestroVoice;
  voiceInstructions: string;
  /**
   * Dynamic system prompt generator.
   * Takes student profile to personalize Mario/Maria's background.
   */
  getSystemPrompt: (student: ExtendedStudentProfile) => string;
  /**
   * Dynamic greeting generator (language-aware).
   * Uses GreetingContext to support multi-language greetings.
   */
  getGreeting: (context: GreetingContext) => string;
  avatar: string;
  color: string;
  tools: string[];
}

/**
 * Union type for any support character (coach or buddy).
 */
export type SupportCharacter = SupportTeacher | BuddyProfile;

/**
 * Character type identifier for routing.
 * Note: 'support_assistant' was removed in Issue #16 - coaches handle platform support directly.
 */
export type CharacterType = "maestro" | "coach" | "buddy";
