/**
 * Character Slice - Character Routing and Switching
 *
 * Handles character-related operations:
 * - Routing messages to appropriate characters
 * - Switching between characters (Coach, Maestro, Buddy)
 * - Managing character history and navigation
 * - Contextual greetings based on previous conversations
 */

import type { StateCreator } from "zustand";
import type { ExtendedStudentProfile, CharacterType } from "@/types";
import type { MaestroFull } from "@/data/maestri";
import type { SupportTeacher, BuddyProfile } from "@/types";
import type { ConversationFlowState, ActiveCharacter } from "../types";
import {
  routeToCharacter,
  type RoutingResult,
} from "@/lib/ai/character-router";
import {
  getDefaultSupportTeacher,
  getSupportTeacherById,
} from "@/data/support-teachers";
import { getBuddyForStudent } from "@/lib/ai/character-router";
import { getBuddyById, type BuddyId } from "@/data/buddy-profiles";
import { getMaestroById } from "@/data/maestri";
import { getUserIdFromCookie } from "@/lib/auth/client-auth";
import { logger } from "@/lib/logger";
import { MIN_MESSAGES_FOR_SUMMARY } from "../persistence";
import {
  createActiveCharacter,
  saveCurrentConversation,
  loadConversationMessages,
} from "../helpers";

// ============================================================================
// CHARACTER STATE
// ============================================================================

export interface CharacterSlice {
  // State
  activeCharacter: ActiveCharacter | null;
  characterHistory: Array<{ type: CharacterType; id: string; timestamp: Date }>;

  // Actions
  routeMessage: (
    message: string,
    profile: ExtendedStudentProfile,
  ) => RoutingResult;
  switchToCharacter: (
    character: MaestroFull | SupportTeacher | BuddyProfile,
    type: CharacterType,
    profile: ExtendedStudentProfile,
    reason?: string,
  ) => Promise<void>;
  switchToCoach: (profile: ExtendedStudentProfile) => Promise<void>;
  switchToMaestro: (
    maestro: MaestroFull,
    profile: ExtendedStudentProfile,
  ) => Promise<void>;
  switchToBuddy: (profile: ExtendedStudentProfile) => Promise<void>;
  goBack: (profile: ExtendedStudentProfile) => boolean;
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createCharacterSlice: StateCreator<
  ConversationFlowState,
  [],
  [],
  CharacterSlice
> = (set, get) => ({
  // Initial state
  activeCharacter: null,
  characterHistory: [],

  // Actions
  routeMessage: (message, profile) => {
    const state = get();
    return routeToCharacter({
      message,
      studentProfile: profile,
      currentCharacter: state.activeCharacter
        ? { type: state.activeCharacter.type, id: state.activeCharacter.id }
        : undefined,
      preferContinuity: true,
    });
  },

  switchToCharacter: async (character, type, profile, _reason) => {
    const state = get();

    // Get userId once at the start of the function (avoid duplication)
    const userId = typeof window !== "undefined" ? getUserIdFromCookie() : null;

    // #98: End current conversation with summary before switching
    const currentConversationId = state.activeCharacter
      ? state.conversationsByCharacter[state.activeCharacter.id]?.conversationId
      : null;

    if (
      currentConversationId &&
      state.messages.length > MIN_MESSAGES_FOR_SUMMARY
    ) {
      try {
        if (userId) {
          logger.info("Switching character, ending previous conversation", {
            from: state.activeCharacter?.id,
            to: character.id,
            conversationId: currentConversationId,
          });

          const response = await fetch(
            `/api/conversations/${currentConversationId}/end`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, reason: "character_switch" }),
            },
          );

          if (!response.ok) {
            logger.error("Failed to end conversation on character switch", {
              status: response.status,
            });
          }
        }
      } catch (error) {
        logger.error("Error ending conversation on character switch", {
          error: String(error),
        });
      }
    }

    // 1. Save current conversation to its bucket
    const savedConversations = saveCurrentConversation(state);

    // 2. Create new active character
    const activeCharacter = createActiveCharacter(character, type, profile);

    // 3. Load existing messages for new character (or start fresh)
    let messages = loadConversationMessages(savedConversations, character.id);

    if (messages.length === 0) {
      // #98: Try to load contextual greeting based on previous conversations
      let greeting = activeCharacter.greeting;

      // userId already retrieved at function start - fetch via API
      if (userId) {
        try {
          const params = new URLSearchParams({
            characterId: character.id,
            studentName: profile.name,
            maestroName: activeCharacter.name,
          });
          const response = await fetch(`/api/greetings/contextual?${params}`);

          if (response.ok) {
            const result = await response.json();
            if (result?.greeting) {
              greeting = result.greeting;
              logger.info("Using contextual greeting", {
                characterId: character.id,
              });
            }
          }
        } catch (error) {
          logger.warn("Failed to load contextual greeting, using default", {
            error: String(error),
          });
        }
      }

      // No existing conversation - add greeting
      messages = [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
          characterId: activeCharacter.id,
          characterType: type,
        },
      ];
    }

    // 4. Update history
    const newHistory = [
      ...state.characterHistory,
      { type, id: character.id, timestamp: new Date() },
    ];

    set({
      activeCharacter,
      messages,
      characterHistory: newHistory,
      pendingHandoff: null,
      conversationsByCharacter: savedConversations,
    });
  },

  switchToCoach: async (profile) => {
    const coach = getDefaultSupportTeacher();
    await get().switchToCharacter(coach, "coach", profile);
  },

  switchToMaestro: async (maestro, profile) => {
    await get().switchToCharacter(maestro, "maestro", profile);
  },

  switchToBuddy: async (profile) => {
    const buddy = getBuddyForStudent(profile);
    await get().switchToCharacter(buddy, "buddy", profile);
  },

  goBack: (profile) => {
    const state = get();
    if (state.characterHistory.length <= 1) {
      return false;
    }

    // Save current before going back
    const savedConversations = saveCurrentConversation(state);

    const newHistory = state.characterHistory.slice(0, -1);
    const previous = newHistory[newHistory.length - 1];

    let character: MaestroFull | SupportTeacher | BuddyProfile | undefined;

    switch (previous.type) {
      case "maestro":
        character = getMaestroById(previous.id);
        break;
      case "coach":
        character = getSupportTeacherById(previous.id as "melissa" | "roberto");
        break;
      case "buddy":
        character = getBuddyById(previous.id as BuddyId);
        break;
    }

    if (!character) {
      return false;
    }

    const activeCharacter = createActiveCharacter(
      character,
      previous.type,
      profile,
    );

    // Load that character's messages
    const messages = loadConversationMessages(savedConversations, previous.id);

    set({
      activeCharacter,
      messages:
        messages.length > 0
          ? messages
          : [
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: activeCharacter.greeting,
                timestamp: new Date(),
                characterId: activeCharacter.id,
                characterType: previous.type,
              },
            ],
      characterHistory: newHistory,
      pendingHandoff: null,
      conversationsByCharacter: savedConversations,
    });

    return true;
  },
});
