/**
 * ConvergioEdu Conversation Flow Store
 *
 * Manages the state of the conversation-first interface:
 * - Current active character (Coach, Maestro, Buddy)
 * - SEPARATE conversations per character (#33)
 * - Character routing and handoffs
 *
 * Part of I-01: Conversation-First Main Flow
 * Related: #24 MirrorBuddy Issue, #33 Separate Conversations, ManifestoEdu.md
 */

import { create } from 'zustand';
import type { CharacterType, ExtendedStudentProfile } from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher } from '@/types';
import type { BuddyProfile } from '@/types';
import {
  routeToCharacter,
  getCharacterGreeting as _getCharacterGreeting,
  getCharacterSystemPrompt as _getCharacterSystemPrompt,
  type RoutingResult,
} from '@/lib/ai/character-router';
import { getDefaultSupportTeacher, getSupportTeacherById, type CoachId } from '@/data/support-teachers';
import { getBuddyForStudent } from '@/lib/ai/character-router';
import { getBuddyById, type BuddyId } from '@/data/buddy-profiles';
import { getMaestroById } from '@/data/maestri';
import { logger } from '@/lib/logger';

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

/**
 * Create a new conversation in the database.
 */
async function createConversationInDB(
  characterId: string,
  characterType: CharacterType,
  characterName: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maestroId: characterId,
        title: `Conversazione con ${characterName}`,
      }),
    });
    if (!response.ok) {
      logger.error('Failed to create conversation', { status: response.status });
      return null;
    }
    const data = await response.json();
    logger.debug('Created conversation', { id: data.id, characterId });
    return data.id;
  } catch (error) {
    logger.error('Error creating conversation', { error: String(error) });
    return null;
  }
}

/**
 * Save a message to the database.
 */
async function saveMessageToDB(
  conversationId: string,
  role: string,
  content: string
): Promise<void> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content }),
    });
    if (!response.ok) {
      logger.error('Failed to save message', { status: response.status });
    }
  } catch (error) {
    logger.error('Error saving message', { error: String(error) });
  }
}

/**
 * Conversation summary from DB (used for context, not full message restoration).
 */
interface ConversationSummary {
  id: string;
  maestroId: string;
  title: string;
  summary: string | null;
  keyFacts: string[] | null;
  topics: string[];
  messageCount: number;
  lastMessageAt: string | null;
}

/**
 * Load conversation summaries from the database (not full messages).
 * We use summaries for context instead of restoring entire conversations.
 */
async function loadConversationSummariesFromDB(): Promise<ConversationSummary[]> {
  try {
    const response = await fetch('/api/conversations?limit=20&active=true');

    // 401 = no user cookie yet (first visit), not an error
    if (response.status === 401) {
      return [];
    }

    if (!response.ok) {
      logger.warn('Conversations API returned error', { status: response.status });
      return [];
    }

    const data = await response.json();

    // API might return error object instead of array
    if (!Array.isArray(data)) {
      if (data.error) {
        logger.warn('Conversations API error', { error: data.error });
      }
      return [];
    }

    return data;
  } catch (error) {
    // Network error or JSON parse error
    logger.warn('Error loading conversation summaries', { error: String(error) });
    return [];
  }
}

/**
 * Update conversation summary in DB.
 * TODO: Call this when ending a conversation to save summary for future context.
 */
async function _updateConversationSummary(
  conversationId: string,
  summary: string,
  keyFacts: string[],
  topics: string[]
): Promise<void> {
  try {
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, keyFacts: JSON.stringify(keyFacts), topics }),
    });
  } catch (error) {
    logger.error('Error updating conversation summary', { error: String(error) });
  }
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Active character in the conversation.
 */
export interface ActiveCharacter {
  type: CharacterType;
  id: string;
  name: string;
  character: MaestroFull | SupportTeacher | BuddyProfile;
  greeting: string;
  systemPrompt: string;
  color: string;
  voice: string;
  voiceInstructions: string;
  subtitle?: string;
}

/**
 * A message in the conversation flow.
 */
export interface FlowMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  characterId?: string;
  characterType?: CharacterType;
  /** If this message triggered a character switch */
  switchedTo?: {
    type: CharacterType;
    id: string;
    reason: string;
  };
}

/**
 * Stored conversation for a character.
 */
export interface CharacterConversation {
  characterId: string;
  characterType: CharacterType;
  characterName: string;
  messages: FlowMessage[];
  lastMessageAt: Date | null;
  conversationId?: string; // DB conversation ID if synced
  // Summary for context (loaded from DB, not full messages)
  previousSummary?: string;
  previousKeyFacts?: string[];
  previousTopics?: string[];
}

/**
 * Handoff suggestion from character routing.
 */
export interface HandoffSuggestion {
  toCharacter: ActiveCharacter;
  reason: string;
  confidence: number;
}

/**
 * Conversation flow mode.
 */
export type FlowMode = 'text' | 'voice' | 'idle';

// ============================================================================
// STORE
// ============================================================================

interface ConversationFlowState {
  // Current state
  mode: FlowMode;
  isActive: boolean;
  activeCharacter: ActiveCharacter | null;
  messages: FlowMessage[]; // Current character's messages (displayed)
  pendingHandoff: HandoffSuggestion | null;

  // SEPARATE CONVERSATIONS PER CHARACTER (#33)
  conversationsByCharacter: Record<string, CharacterConversation>;

  // Session tracking
  sessionId: string | null;
  sessionStartedAt: Date | null;

  // Character history (for back navigation)
  characterHistory: Array<{ type: CharacterType; id: string; timestamp: Date }>;

  // Actions
  startConversation: (profile: ExtendedStudentProfile) => void;
  endConversation: () => void;
  setMode: (mode: FlowMode) => void;

  // Message actions
  addMessage: (message: Omit<FlowMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearMessages: () => void;

  // Character routing
  routeMessage: (message: string, profile: ExtendedStudentProfile) => RoutingResult;
  switchToCharacter: (
    character: MaestroFull | SupportTeacher | BuddyProfile,
    type: CharacterType,
    profile: ExtendedStudentProfile,
    reason?: string
  ) => void;
  switchToCoach: (profile: ExtendedStudentProfile) => void;
  switchToMaestro: (maestro: MaestroFull, profile: ExtendedStudentProfile) => void;
  switchToBuddy: (profile: ExtendedStudentProfile) => void;
  goBack: (profile: ExtendedStudentProfile) => boolean;

  // Handoff management
  suggestHandoff: (suggestion: HandoffSuggestion) => void;
  acceptHandoff: (profile: ExtendedStudentProfile) => void;
  dismissHandoff: () => void;

  // Conversation history
  getConversationForCharacter: (characterId: string) => CharacterConversation | null;
  getAllConversations: () => CharacterConversation[];

  // Reset
  reset: () => void;

  // Persistence
  loadFromServer: () => Promise<void>;
}

/**
 * Creates an ActiveCharacter from character data.
 */
function createActiveCharacter(
  character: MaestroFull | SupportTeacher | BuddyProfile,
  type: CharacterType,
  profile: ExtendedStudentProfile
): ActiveCharacter {
  let greeting: string;
  let systemPrompt: string;
  let voiceInstructions: string;

  if (type === 'buddy') {
    const buddy = character as BuddyProfile;
    greeting = buddy.getGreeting(profile);
    systemPrompt = buddy.getSystemPrompt(profile);
    voiceInstructions = buddy.voiceInstructions;
  } else if (type === 'coach') {
    const coach = character as SupportTeacher;
    greeting = coach.greeting;
    systemPrompt = coach.systemPrompt;
    voiceInstructions = coach.voiceInstructions;
  } else {
    const maestro = character as MaestroFull;
    greeting = maestro.greeting;
    systemPrompt = maestro.systemPrompt;
    voiceInstructions = '';
  }

  return {
    type,
    id: character.id,
    name: character.name,
    character,
    greeting,
    systemPrompt,
    color: character.color,
    voice: 'voice' in character ? character.voice : 'alloy',
    voiceInstructions,
  };
}

/**
 * Save current messages to character's conversation bucket.
 */
function saveCurrentConversation(
  state: ConversationFlowState
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
function loadConversationMessages(
  conversationsByCharacter: Record<string, CharacterConversation>,
  characterId: string
): FlowMessage[] {
  const convo = conversationsByCharacter[characterId];
  return convo?.messages || [];
}

export const useConversationFlowStore = create<ConversationFlowState>()(
  (set, get) => ({
      mode: 'idle',
      isActive: false,
      activeCharacter: null,
      messages: [],
      pendingHandoff: null,
      conversationsByCharacter: {},
      sessionId: null,
      sessionStartedAt: null,
      characterHistory: [],

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
        });
      },

      setMode: (mode) => set({ mode }),

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

      switchToCharacter: (character, type, profile, _reason) => {
        const state = get();

        // 1. Save current conversation to its bucket
        const savedConversations = saveCurrentConversation(state);

        // 2. Create new active character
        const activeCharacter = createActiveCharacter(character, type, profile);

        // 3. Load existing messages for new character (or start fresh)
        let messages = loadConversationMessages(savedConversations, character.id);

        if (messages.length === 0) {
          // No existing conversation - add greeting
          messages = [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: activeCharacter.greeting,
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

      switchToCoach: (profile) => {
        const coach = getDefaultSupportTeacher();
        get().switchToCharacter(coach, 'coach', profile);
      },

      switchToMaestro: (maestro, profile) => {
        get().switchToCharacter(maestro, 'maestro', profile);
      },

      switchToBuddy: (profile) => {
        const buddy = getBuddyForStudent(profile);
        get().switchToCharacter(buddy, 'buddy', profile);
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
          case 'maestro':
            character = getMaestroById(previous.id);
            break;
          case 'coach':
            character = getSupportTeacherById(previous.id as 'melissa' | 'roberto');
            break;
          case 'buddy':
            character = getBuddyById(previous.id as BuddyId);
            break;
        }

        if (!character) {
          return false;
        }

        const activeCharacter = createActiveCharacter(character, previous.type, profile);

        // Load that character's messages
        const messages = loadConversationMessages(savedConversations, previous.id);

        set({
          activeCharacter,
          messages: messages.length > 0 ? messages : [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
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

      suggestHandoff: (suggestion) => {
        set({ pendingHandoff: suggestion });
      },

      acceptHandoff: (profile) => {
        const state = get();
        if (!state.pendingHandoff) return;

        const { toCharacter } = state.pendingHandoff;
        get().switchToCharacter(toCharacter.character, toCharacter.type, profile);
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

      reset: () => {
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
    })
);
