/**
 * ConvergioEdu Conversation Flow Store
 *
 * Manages the state of the conversation-first interface:
 * - Current active character (Coach, Maestro, Buddy)
 * - Character routing and handoffs
 * - Conversation continuity across character switches
 *
 * Part of I-01: Conversation-First Main Flow
 * Related: #24 MirrorBuddy Issue, ManifestoEdu.md
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CharacterType, ExtendedStudentProfile, MaestroVoice } from '@/types';
import type { MaestroFull } from '@/data/maestri-full';
import type { SupportTeacher } from '@/types';
import type { BuddyProfile } from '@/types';
import {
  routeToCharacter,
  type RoutingResult,
} from '@/lib/ai/character-router';
import {
  getDefaultSupportTeacher,
  getSupportTeacherById,
} from '@/data/support-teachers';
import { getMaestroById } from '@/data/maestri-full';
import { getBuddyById, getDefaultBuddy } from '@/data/buddy-profiles';

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
  voice: MaestroVoice;
  voiceInstructions: string;
  /** Display name for UI (e.g., subject for Maestro) */
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
// CONSTANTS
// ============================================================================

/**
 * Default voice for Maestros (MaestroFull doesn't have voice property).
 */
const DEFAULT_MAESTRO_VOICE: MaestroVoice = 'sage';

/**
 * Default voice instructions for Maestros.
 */
const DEFAULT_MAESTRO_VOICE_INSTRUCTIONS = `You are an educational character teaching your subject.
Speak clearly and engagingly, adapting your pace to the student's needs.
Be encouraging and patient. Use examples to illustrate concepts.`;

// ============================================================================
// STORE
// ============================================================================

interface ConversationFlowState {
  // Current state
  mode: FlowMode;
  isActive: boolean;
  activeCharacter: ActiveCharacter | null;
  messages: FlowMessage[];
  pendingHandoff: HandoffSuggestion | null;

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
  addMessage: (message: Omit<FlowMessage, 'id' | 'timestamp'>) => void;
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

  // Reset
  reset: () => void;
}

/**
 * Creates an ActiveCharacter from character data.
 */
function createActiveCharacter(
  character: MaestroFull | SupportTeacher | BuddyProfile,
  type: CharacterType,
  profile: ExtendedStudentProfile
): ActiveCharacter {
  // Determine greeting and system prompt based on character type
  let greeting: string;
  let systemPrompt: string;
  let voiceInstructions: string;
  let voice: MaestroVoice;
  let subtitle: string | undefined;

  if (type === 'buddy') {
    const buddy = character as BuddyProfile;
    greeting = buddy.getGreeting(profile);
    systemPrompt = buddy.getSystemPrompt(profile);
    voiceInstructions = buddy.voiceInstructions;
    voice = buddy.voice;
    subtitle = 'Peer Support';
  } else if (type === 'coach') {
    const coach = character as SupportTeacher;
    greeting = coach.greeting;
    systemPrompt = coach.systemPrompt;
    voiceInstructions = coach.voiceInstructions;
    voice = coach.voice;
    subtitle = 'Learning Coach';
  } else {
    // Maestro - MaestroFull doesn't have voice properties
    const maestro = character as MaestroFull;
    greeting = maestro.greeting;
    systemPrompt = maestro.systemPrompt;
    voiceInstructions = DEFAULT_MAESTRO_VOICE_INSTRUCTIONS;
    voice = DEFAULT_MAESTRO_VOICE;
    subtitle = maestro.subject;
  }

  return {
    type,
    id: character.id,
    name: character.name,
    character,
    greeting,
    systemPrompt,
    color: character.color,
    voice,
    voiceInstructions,
    subtitle,
  };
}

export const useConversationFlowStore = create<ConversationFlowState>()(
  persist(
    (set, get) => ({
      mode: 'idle',
      isActive: false,
      activeCharacter: null,
      messages: [],
      pendingHandoff: null,
      sessionId: null,
      sessionStartedAt: null,
      characterHistory: [],

      startConversation: (profile) => {
        // Start with Coach (Melissa/Davide based on preference)
        const coach = getDefaultSupportTeacher();
        const activeCharacter = createActiveCharacter(coach, 'coach', profile);

        set({
          isActive: true,
          mode: 'text',
          activeCharacter,
          messages: [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: activeCharacter.greeting,
              timestamp: new Date(),
              characterId: activeCharacter.id,
              characterType: 'coach',
            },
          ],
          sessionId: crypto.randomUUID(),
          sessionStartedAt: new Date(),
          characterHistory: [{ type: 'coach', id: coach.id, timestamp: new Date() }],
          pendingHandoff: null,
        });
      },

      endConversation: () => {
        set({
          isActive: false,
          mode: 'idle',
          activeCharacter: null,
          messages: [],
          pendingHandoff: null,
          sessionId: null,
          sessionStartedAt: null,
          characterHistory: [],
        });
      },

      setMode: (mode) => set({ mode }),

      addMessage: (message) => {
        const state = get();
        const newMessage: FlowMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          characterId: message.role === 'assistant' ? state.activeCharacter?.id : undefined,
          characterType: message.role === 'assistant' ? state.activeCharacter?.type : undefined,
        };
        set({ messages: [...state.messages, newMessage] });
      },

      clearMessages: () => set({ messages: [] }),

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

      switchToCharacter: (character, type, profile, reason) => {
        const state = get();
        const activeCharacter = createActiveCharacter(character, type, profile);

        // Add to history
        const newHistory = [
          ...state.characterHistory,
          { type, id: character.id, timestamp: new Date() },
        ];

        // Add system message about the switch
        const switchMessage: FlowMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          content: reason || `Ora parli con ${activeCharacter.name}`,
          timestamp: new Date(),
          switchedTo: { type, id: character.id, reason: reason || 'Character switch' },
        };

        // Add greeting from new character
        const greetingMessage: FlowMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: activeCharacter.greeting,
          timestamp: new Date(),
          characterId: activeCharacter.id,
          characterType: type,
        };

        set({
          activeCharacter,
          messages: [...state.messages, switchMessage, greetingMessage],
          characterHistory: newHistory,
          pendingHandoff: null,
        });
      },

      switchToCoach: (profile) => {
        const coach = getDefaultSupportTeacher();
        get().switchToCharacter(coach, 'coach', profile, 'Torniamo a organizzarci insieme');
      },

      switchToMaestro: (maestro, profile) => {
        get().switchToCharacter(
          maestro,
          'maestro',
          profile,
          `${maestro.name} puo aiutarti con ${maestro.subject}`
        );
      },

      switchToBuddy: (profile) => {
        const buddy = getDefaultBuddy();
        get().switchToCharacter(
          buddy,
          'buddy',
          profile,
          `${buddy.name} e qui per ascoltarti`
        );
      },

      goBack: (profile) => {
        const state = get();
        if (state.characterHistory.length <= 1) {
          return false; // Can't go back, only one character
        }

        // Remove current character from history
        const newHistory = state.characterHistory.slice(0, -1);
        const previous = newHistory[newHistory.length - 1];

        let character: MaestroFull | SupportTeacher | BuddyProfile | undefined;

        switch (previous.type) {
          case 'maestro':
            character = getMaestroById(previous.id);
            break;
          case 'coach':
            character = getSupportTeacherById(previous.id as 'melissa' | 'davide');
            break;
          case 'buddy':
            character = getBuddyById(previous.id as 'mario' | 'maria');
            break;
        }

        if (!character) {
          return false;
        }

        const activeCharacter = createActiveCharacter(character, previous.type, profile);

        set({
          activeCharacter,
          characterHistory: newHistory,
          pendingHandoff: null,
        });

        return true;
      },

      suggestHandoff: (suggestion) => {
        set({ pendingHandoff: suggestion });
      },

      acceptHandoff: (profile) => {
        const state = get();
        if (!state.pendingHandoff) return;

        const { toCharacter, reason } = state.pendingHandoff;
        get().switchToCharacter(
          toCharacter.character,
          toCharacter.type,
          profile,
          reason
        );
      },

      dismissHandoff: () => {
        set({ pendingHandoff: null });
      },

      reset: () => {
        set({
          mode: 'idle',
          isActive: false,
          activeCharacter: null,
          messages: [],
          pendingHandoff: null,
          sessionId: null,
          sessionStartedAt: null,
          characterHistory: [],
        });
      },
    }),
    {
      name: 'convergio-conversation-flow',
      partialize: (state) => ({
        // Only persist essential state, not messages
        sessionId: state.sessionId,
        sessionStartedAt: state.sessionStartedAt,
      }),
    }
  )
);
