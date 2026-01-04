/**
 * Message Slice - Message Management Actions
 *
 * Handles message operations:
 * - Adding new messages to the conversation
 * - Clearing messages for the active character
 * - Syncing messages to the database
 */

import type { StateCreator } from 'zustand';
import type { ConversationFlowState, FlowMessage } from '../types';
import { createConversationInDB, saveMessageToDB } from '../persistence';

// ============================================================================
// MESSAGE STATE
// ============================================================================

export interface MessageSlice {
  // State
  messages: FlowMessage[]; // Current character's messages (displayed)

  // Actions
  addMessage: (message: Omit<FlowMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearMessages: () => void;
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createMessageSlice: StateCreator<
  ConversationFlowState,
  [],
  [],
  MessageSlice
> = (set, get) => ({
  // Initial state
  messages: [],

  // Actions
  addMessage: async (message) => {
    const state = get();
    const newMessage: FlowMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      characterId: message.role === 'assistant' ? state.activeCharacter?.id : undefined,
      characterType: message.role === 'assistant' ? state.activeCharacter?.type : undefined,
    };

    const newMessages = [...state.messages, newMessage];

    // Also update the conversation bucket
    const characterId = state.activeCharacter?.id;
    let updatedConversations = state.conversationsByCharacter;
    let conversationId = state.conversationsByCharacter[characterId || '']?.conversationId;

    if (characterId && state.activeCharacter) {
      // Create conversation in DB if not exists
      if (!conversationId) {
        conversationId = await createConversationInDB(
          characterId,
          state.activeCharacter.type,
          state.activeCharacter.name
        ) || undefined;
      }

      updatedConversations = {
        ...state.conversationsByCharacter,
        [characterId]: {
          characterId,
          characterType: state.activeCharacter.type,
          characterName: state.activeCharacter.name,
          messages: newMessages,
          lastMessageAt: new Date(),
          conversationId,
        },
      };

      // Persist message to DB (fire and forget)
      if (conversationId) {
        saveMessageToDB(conversationId, newMessage.role, newMessage.content);
      }
    }

    set({
      messages: newMessages,
      conversationsByCharacter: updatedConversations,
    });
  },

  clearMessages: () => {
    const state = get();
    const characterId = state.activeCharacter?.id;

    // Also clear from conversation bucket
    if (characterId) {
      const { [characterId]: _, ...rest } = state.conversationsByCharacter;
      set({ messages: [], conversationsByCharacter: rest });
    } else {
      set({ messages: [] });
    }
  },
});
