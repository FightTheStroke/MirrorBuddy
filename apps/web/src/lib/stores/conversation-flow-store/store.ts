/**
 * MirrorBuddy Conversation Flow Store
 *
 * Main store composition combining all slices:
 * - Session management (start, end, mode, reset, load)
 * - Message management (add, clear)
 * - Character routing (route, switch, navigate)
 * - Handoff management (suggest, accept, dismiss)
 * - Conversation queries (get, list, greetings)
 *
 * Part of I-01: Conversation-First Main Flow
 * Related: #24 MirrorBuddy Issue, #33 Separate Conversations, ManifestoEdu.md
 */

import { create } from 'zustand';
import type { ConversationFlowState } from './types';
import { createSessionSlice } from './slices/session-slice';
import { createMessageSlice } from './slices/message-slice';
import { createCharacterSlice } from './slices/character-slice';
import { createHandoffSlice } from './slices/handoff-slice';

/**
 * Main conversation flow store.
 * Combines all slices into a single Zustand store.
 */
export const useConversationFlowStore = create<ConversationFlowState>()(
  (set, get, api) => ({
    // Compose all slices
    ...createSessionSlice(set, get, api),
    ...createMessageSlice(set, get, api),
    ...createCharacterSlice(set, get, api),
    ...createHandoffSlice(set, get, api),
  })
);
