/**
 * Helper functions for Conversation Flow Store
 *
 * Pure utility functions for:
 * - Creating active character objects
 * - Managing conversation buckets
 * - Loading conversation messages
 */

import type { CharacterType, ExtendedStudentProfile } from "@/types";
import type { MaestroFull } from "@/data/maestri";
import type { SupportTeacher, BuddyProfile } from "@/types";
import type {
  ActiveCharacter,
  FlowMessage,
  CharacterConversation,
  ConversationFlowState,
} from "./types";

// ============================================================================
// CHARACTER HELPERS
// ============================================================================

/**
 * Creates an ActiveCharacter from character data.
 */
export function createActiveCharacter(
  character: MaestroFull | SupportTeacher | BuddyProfile,
  type: CharacterType,
  profile: ExtendedStudentProfile,
  language: "it" | "en" | "es" | "fr" | "de" = "it",
): ActiveCharacter {
  let greeting: string;
  let systemPrompt: string;
  let voiceInstructions: string;

  if (type === "buddy") {
    const buddy = character as BuddyProfile;
    greeting = buddy.getGreeting({ student: profile, language });
    systemPrompt = buddy.getSystemPrompt(profile);
    voiceInstructions = buddy.voiceInstructions;
  } else if (type === "coach") {
    const coach = character as SupportTeacher;
    greeting = coach.greeting;
    systemPrompt = coach.systemPrompt;
    voiceInstructions = coach.voiceInstructions;
  } else {
    const maestro = character as MaestroFull;
    greeting = maestro.greeting;
    systemPrompt = maestro.systemPrompt;
    voiceInstructions = maestro.voiceInstructions;
  }

  return {
    type,
    id: character.id,
    name: character.name,
    character,
    greeting,
    systemPrompt,
    color: character.color,
    voice: "voice" in character ? character.voice : "alloy",
    voiceInstructions,
  };
}

// ============================================================================
// CONVERSATION BUCKET HELPERS
// ============================================================================

/**
 * Save current messages to character's conversation bucket.
 */
export function saveCurrentConversation(
  state: ConversationFlowState,
): Record<string, CharacterConversation> {
  if (!state.activeCharacter || state.messages.length === 0) {
    return state.conversationsByCharacter;
  }

  const characterId = state.activeCharacter.id;
  const existingConvo = state.conversationsByCharacter[characterId];

  return {
    ...state.conversationsByCharacter,
    [characterId]: {
      characterId,
      characterType: state.activeCharacter.type,
      characterName: state.activeCharacter.name,
      messages: state.messages,
      lastMessageAt: new Date(),
      conversationId: existingConvo?.conversationId,
    },
  };
}

/**
 * Load messages for a character from their conversation bucket.
 */
export function loadConversationMessages(
  conversationsByCharacter: Record<string, CharacterConversation>,
  characterId: string,
): FlowMessage[] {
  const convo = conversationsByCharacter[characterId];
  return convo?.messages || [];
}
