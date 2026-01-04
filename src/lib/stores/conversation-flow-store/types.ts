/**
 * Type definitions for MirrorBuddy Conversation Flow Store
 *
 * Defines interfaces for conversation state, messages, characters, and handoffs.
 * Part of I-01: Conversation-First Main Flow
 */

import type { CharacterType, ExtendedStudentProfile } from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher } from '@/types';
import type { BuddyProfile } from '@/types';
import type { RoutingResult } from '@/lib/ai/character-router';

// ============================================================================
// ACTIVE CHARACTER
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

// ============================================================================
// MESSAGES
// ============================================================================

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

// ============================================================================
// CONVERSATIONS
// ============================================================================

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
 * Conversation summary from DB (used for context, not full message restoration).
 */
export interface ConversationSummary {
  id: string;
  maestroId: string;
  title: string;
  summary: string | null;
  keyFacts: string[] | null;
  topics: string[];
  messageCount: number;
  lastMessageAt: string | null;
}

// ============================================================================
// HANDOFF
// ============================================================================

/**
 * Handoff suggestion from character routing.
 */
export interface HandoffSuggestion {
  toCharacter: ActiveCharacter;
  reason: string;
  confidence: number;
}

// ============================================================================
// FLOW MODE
// ============================================================================

/**
 * Conversation flow mode.
 */
export type FlowMode = 'text' | 'voice' | 'idle';

// ============================================================================
// STORE STATE
// ============================================================================

/**
 * Main conversation flow store state interface.
 */
export interface ConversationFlowState {
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

  // Session summary state
  showRatingModal: boolean;
  sessionSummary: {
    topics: string[];
    summary: string;
    duration: number;
  } | null;

  // Actions - Session Management
  startConversation: (profile: ExtendedStudentProfile) => void;
  endConversation: () => void;
  endConversationWithSummary: (conversationId: string, userId: string) => Promise<void>;
  setMode: (mode: FlowMode) => void;
  setShowRatingModal: (show: boolean) => void;
  reset: () => void;
  loadFromServer: () => Promise<void>;

  // Actions - Message Management
  addMessage: (message: Omit<FlowMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearMessages: () => void;

  // Actions - Character Routing
  routeMessage: (message: string, profile: ExtendedStudentProfile) => RoutingResult;
  switchToCharacter: (
    character: MaestroFull | SupportTeacher | BuddyProfile,
    type: CharacterType,
    profile: ExtendedStudentProfile,
    reason?: string
  ) => Promise<void>;
  switchToCoach: (profile: ExtendedStudentProfile) => Promise<void>;
  switchToMaestro: (maestro: MaestroFull, profile: ExtendedStudentProfile) => Promise<void>;
  switchToBuddy: (profile: ExtendedStudentProfile) => Promise<void>;
  goBack: (profile: ExtendedStudentProfile) => boolean;

  // Actions - Handoff Management
  suggestHandoff: (suggestion: HandoffSuggestion) => void;
  acceptHandoff: (profile: ExtendedStudentProfile) => Promise<void>;
  dismissHandoff: () => void;

  // Actions - Conversation History
  getConversationForCharacter: (characterId: string) => CharacterConversation | null;
  getAllConversations: () => CharacterConversation[];
  loadContextualGreeting: (
    userId: string,
    characterId: string,
    studentName: string,
    maestroName: string
  ) => Promise<string | null>;
}
