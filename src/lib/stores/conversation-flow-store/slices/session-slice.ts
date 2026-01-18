/**
 * Session Slice - Session Management Actions
 *
 * Handles conversation session lifecycle:
 * - Starting and ending conversations
 * - Mode management (text/voice/idle)
 * - Session summary generation
 * - Loading conversation context from server
 * - Resetting store state
 */

import type { StateCreator } from 'zustand';
import type { ExtendedStudentProfile, CharacterType } from '@/types';
import type {
  ConversationFlowState,
  FlowMode,
  FlowMessage,
  CharacterConversation,
} from '../types';
import { getDefaultSupportTeacher, getSupportTeacherById, type CoachId } from '@/data/support-teachers';
import { getBuddyById, type BuddyId } from '@/data/buddy-profiles';
import { getMaestroById } from '@/data/maestri';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth/csrf-client';
import { inactivityMonitor } from '@/lib/conversation/inactivity-monitor';
import { loadConversationSummariesFromDB } from '../persistence';
import { createActiveCharacter, saveCurrentConversation, loadConversationMessages } from '../helpers';

export interface SessionSlice {
  // State
  mode: FlowMode;
  isActive: boolean;
  sessionId: string | null;
  sessionStartedAt: Date | null;
  showRatingModal: boolean;
  sessionSummary: {
    topics: string[];
    summary: string;
    duration: number;
  } | null;

  // Actions
  startConversation: (profile: ExtendedStudentProfile) => void;
  endConversation: () => void;
  endConversationWithSummary: (conversationId: string, userId: string) => Promise<void>;
  setMode: (mode: FlowMode) => void;
  setShowRatingModal: (show: boolean) => void;
  reset: () => void;
  loadFromServer: () => Promise<void>;
}

export const createSessionSlice: StateCreator<
  ConversationFlowState,
  [],
  [],
  SessionSlice
> = (set, get) => ({
  // Initial state
  mode: 'idle',
  isActive: false,
  sessionId: null,
  sessionStartedAt: null,
  showRatingModal: false,
  sessionSummary: null,

  // Actions
  startConversation: (profile) => {
    const coach = getDefaultSupportTeacher();
    const activeCharacter = createActiveCharacter(coach, 'coach', profile);

    // Check if we have existing conversation with this coach
    const state = get();
    const existingMessages = loadConversationMessages(
      state.conversationsByCharacter,
      coach.id
    );

    // If no existing messages, start with greeting
    const messages: FlowMessage[] =
      existingMessages.length > 0
        ? existingMessages
        : [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: activeCharacter.greeting,
              timestamp: new Date(),
              characterId: activeCharacter.id,
              characterType: 'coach',
            },
          ];

    set({
      isActive: true,
      mode: 'text',
      activeCharacter,
      messages,
      sessionId: crypto.randomUUID(),
      sessionStartedAt: new Date(),
      characterHistory: [{ type: 'coach', id: coach.id, timestamp: new Date() }],
      pendingHandoff: null,
    });
  },

  endConversation: () => {
    // Save current conversation before ending
    const state = get();
    const updatedConversations = saveCurrentConversation(state);

    // Stop inactivity monitoring
    if (state.sessionId) {
      inactivityMonitor.stopTracking(state.sessionId);
    }

    set({
      isActive: false,
      mode: 'idle',
      activeCharacter: null,
      messages: [],
      pendingHandoff: null,
      sessionId: null,
      sessionStartedAt: null,
      characterHistory: [],
      conversationsByCharacter: updatedConversations,
      showRatingModal: false,
      sessionSummary: null,
    });
  },

  endConversationWithSummary: async (conversationId: string, userId: string) => {
    const state = get();

    // Stop inactivity monitoring
    inactivityMonitor.stopTracking(conversationId);

    // Calculate session duration
    const duration = state.sessionStartedAt
      ? Math.round((Date.now() - state.sessionStartedAt.getTime()) / 60000)
      : 0;

    try {
      // Call API to generate summary (server-side operation)
      const response = await csrfFetch(`/api/conversations/${conversationId}/end`, {
        method: 'POST',
        body: JSON.stringify({ userId, reason: 'explicit' }),
      });

      if (response.ok) {
        const result = await response.json();
        set({
          sessionSummary: {
            topics: result.topics || [],
            summary: result.summary || '',
            duration,
          },
          showRatingModal: true,
        });
      } else {
        logger.warn('Failed to generate summary via API', { conversationId });
      }
    } catch (error) {
      logger.error('Failed to generate summary:', { error: String(error) });
    }

    // Save conversation
    const updatedConversations = saveCurrentConversation(state);

    set({
      isActive: false,
      mode: 'idle',
      conversationsByCharacter: updatedConversations,
    });
  },

  setMode: (mode) => set({ mode }),

  setShowRatingModal: (show: boolean) => set({ showRatingModal: show }),

  reset: () => {
    // Stop all inactivity monitoring
    inactivityMonitor.stopAll();

    set({
      mode: 'idle',
      isActive: false,
      activeCharacter: null,
      messages: [],
      pendingHandoff: null,
      conversationsByCharacter: {},
      sessionId: null,
      sessionStartedAt: null,
      characterHistory: [],
      showRatingModal: false,
      sessionSummary: null,
    });
  },

  loadFromServer: async () => {
    try {
      // Load summaries, not full messages
      const summaries = await loadConversationSummariesFromDB();
      if (summaries.length === 0) return;

      // Convert DB summaries to store format
      const conversationsByCharacter: Record<string, CharacterConversation> = {};

      for (const conv of summaries) {
        const characterId = conv.maestroId;

        // Determine character type from ID prefix
        let characterType: CharacterType = 'maestro';
        let characterName = conv.title.replace('Conversazione con ', '');

        if (characterId.startsWith('coach-')) {
          characterType = 'coach';
          // Extract coach name from ID (e.g., 'coach-melissa' -> 'melissa')
          const coachName = characterId.replace('coach-', '') as CoachId;
          const coach = getSupportTeacherById(coachName);
          if (coach) characterName = coach.name;
        } else if (characterId.startsWith('buddy-')) {
          characterType = 'buddy';
          const buddy = getBuddyById(characterId as BuddyId);
          if (buddy) characterName = buddy.name;
        } else {
          const maestro = getMaestroById(characterId);
          if (maestro) characterName = maestro.name;
        }

        // Store summary for context, not full messages
        conversationsByCharacter[characterId] = {
          characterId,
          characterType,
          characterName,
          messages: [], // Start fresh, use summary for context
          lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt) : null,
          conversationId: conv.id,
          previousSummary: conv.summary || undefined,
          previousKeyFacts: conv.keyFacts || undefined,
          previousTopics: conv.topics || undefined,
        };
      }

      set({ conversationsByCharacter });
      logger.info('Loaded conversation summaries from server', {
        count: Object.keys(conversationsByCharacter).length,
      });
    } catch (error) {
      // Non-critical: app works fine without previous conversation context
      logger.warn('Failed to load conversation summaries', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
