/**
 * Handoff Manager - Main Module
 */

export { analyzeHandoff, mightNeedHandoff } from "./analysis";
export type { HandoffContext, HandoffAnalysis, HandoffTrigger } from "./types";

import type {
  ExtendedStudentProfile,
  SupportTeacher,
  BuddyProfile,
} from "@/types";
import type { MaestroFull } from "@/data/maestri";
import type {
  ActiveCharacter,
  HandoffSuggestion,
} from "@/lib/stores/conversation-flow-store";
import {
  getSupportTeacherById,
  getDefaultSupportTeacher,
} from "@/data/support-teachers";
import { getBuddyById, getDefaultBuddy } from "@/data/buddy-profiles";

/**
 * Creates a Coach handoff suggestion
 */
export function createCoachSuggestion(
  profile: ExtendedStudentProfile,
): HandoffSuggestion {
  const coach = profile.preferredCoach
    ? getSupportTeacherById(profile.preferredCoach) ||
      getDefaultSupportTeacher()
    : getDefaultSupportTeacher();

  return {
    toCharacter: createActiveCharacter(coach, "coach", profile),
    reason: `${coach.name} può aiutarti a organizzarti meglio!`,
    confidence: 0.8,
  };
}

/**
 * Creates a Buddy handoff suggestion
 */
export function createBuddySuggestion(
  profile: ExtendedStudentProfile,
): HandoffSuggestion {
  const buddy = profile.preferredBuddy
    ? getBuddyById(profile.preferredBuddy) || getDefaultBuddy()
    : getDefaultBuddy();

  return {
    toCharacter: createActiveCharacter(buddy, "buddy", profile),
    reason: `${buddy.name} ti capisce e può ascoltarti!`,
    confidence: 0.8,
  };
}

/**
 * Creates an ActiveCharacter from character data
 */
export function createActiveCharacter(
  character: MaestroFull | SupportTeacher | BuddyProfile,
  type: "maestro" | "coach" | "buddy",
  profile: ExtendedStudentProfile,
  language: "it" | "en" | "es" | "fr" | "de" = "it",
): ActiveCharacter {
  const DEFAULT_MAESTRO_VOICE = "sage";
  const DEFAULT_VOICE_INSTRUCTIONS = "Speak clearly and engagingly.";

  if (type === "buddy") {
    const buddy = character as BuddyProfile;
    return {
      type: "buddy",
      id: buddy.id,
      name: buddy.name,
      character: buddy,
      greeting: buddy.getGreeting({ student: profile, language }),
      systemPrompt: buddy.getSystemPrompt(profile),
      color: buddy.color,
      voice: buddy.voice,
      voiceInstructions: buddy.voiceInstructions,
      subtitle: "Peer Support",
    };
  }

  if (type === "coach") {
    const coach = character as SupportTeacher;
    return {
      type: "coach",
      id: coach.id,
      name: coach.name,
      character: coach,
      greeting: coach.greeting,
      systemPrompt: coach.systemPrompt,
      color: coach.color,
      voice: coach.voice,
      voiceInstructions: coach.voiceInstructions,
      subtitle: "Learning Coach",
    };
  }

  const maestro = character as MaestroFull;
  return {
    type: "maestro",
    id: maestro.id,
    name: maestro.name,
    character: maestro,
    greeting: maestro.greeting,
    systemPrompt: maestro.systemPrompt,
    color: maestro.color,
    voice: DEFAULT_MAESTRO_VOICE,
    voiceInstructions: DEFAULT_VOICE_INSTRUCTIONS,
    subtitle: maestro.subject,
  };
}

/**
 * Generates a handoff message for the UI
 */
export function generateHandoffMessage(
  fromCharacter: ActiveCharacter,
  toSuggestion: HandoffSuggestion,
): string {
  return `${fromCharacter.name}: "${toSuggestion.reason}"`;
}

/**
 * Generates the transition message when handoff is accepted
 */
export function generateTransitionMessage(
  fromCharacter: ActiveCharacter,
  toCharacter: ActiveCharacter,
): string {
  return `${fromCharacter.name} ti ha passato a ${toCharacter.name}. ${toCharacter.greeting}`;
}
