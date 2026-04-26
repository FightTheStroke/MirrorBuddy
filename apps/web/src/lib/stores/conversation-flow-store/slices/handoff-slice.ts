/**
 * Handoff Slice - Handoff Management and Conversation Queries
 *
 * Handles:
 * - Character handoff suggestions and acceptance
 * - Conversation history queries
 * - Contextual greeting generation
 */

import { logger } from '@/lib/logger';
import type { StateCreator } from 'zustand';
import type { ExtendedStudentProfile } from '@/types';
import type { ConversationFlowState, HandoffSuggestion, CharacterConversation } from '../types';

// ============================================================================
// HANDOFF STATE
// ============================================================================

export interface HandoffSlice {
  // State
  pendingHandoff: HandoffSuggestion | null;
  conversationsByCharacter: Record<string, CharacterConversation>;

  // Actions
  suggestHandoff: (suggestion: HandoffSuggestion) => void;
  acceptHandoff: (profile: ExtendedStudentProfile) => Promise<void>;
  dismissHandoff: () => void;
  getConversationForCharacter: (characterId: string) => CharacterConversation | null;
  getAllConversations: () => CharacterConversation[];
  loadContextualGreeting: (
    userId: string,
    characterId: string,
    studentName: string,
    maestroName: string
  ) => Promise<string | null>;
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createHandoffSlice: StateCreator<
  ConversationFlowState,
  [],
  [],
  HandoffSlice
> = (set, get) => ({
  // Initial state
  pendingHandoff: null,
  conversationsByCharacter: {},

  // Actions
  suggestHandoff: (suggestion) => {
    set({ pendingHandoff: suggestion });
  },

  acceptHandoff: async (profile) => {
    const state = get();
    if (!state.pendingHandoff) return;

    const { toCharacter } = state.pendingHandoff;
    await get().switchToCharacter(toCharacter.character, toCharacter.type, profile);
  },

  dismissHandoff: () => {
    set({ pendingHandoff: null });
  },

  getConversationForCharacter: (characterId) => {
    const state = get();
    return state.conversationsByCharacter[characterId] || null;
  },

  getAllConversations: () => {
    const state = get();
    return Object.values(state.conversationsByCharacter).sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime; // Most recent first
    });
  },

  loadContextualGreeting: async (
    _userId: string,
    characterId: string,
    studentName: string,
    maestroName: string
  ): Promise<string | null> => {
    try {
      const params = new URLSearchParams({
        characterId,
        studentName,
        maestroName,
      });
      const response = await fetch(`/api/greetings/contextual?${params}`);

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result?.greeting || null;
    } catch (error) {
      logger.error('Failed to load contextual greeting', { error: String(error) });
      return null;
    }
  },
});
