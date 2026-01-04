/**
 * Conversation Flow Store - Barrel Export
 *
 * Re-exports all public types and the main store hook for backward compatibility.
 * Import from '@/lib/stores/conversation-flow-store' will continue to work.
 */

// Export main store hook
export { useConversationFlowStore } from './store';

// Export all types
export type {
  ActiveCharacter,
  FlowMessage,
  CharacterConversation,
  ConversationSummary,
  HandoffSuggestion,
  FlowMode,
  ConversationFlowState,
} from './types';

// Export persistence helpers (if needed by external modules)
export {
  createConversationInDB,
  saveMessageToDB,
  loadConversationSummariesFromDB,
  updateConversationSummary,
  MIN_MESSAGES_FOR_SUMMARY,
} from './persistence';

// Export helper functions (if needed by external modules)
export {
  createActiveCharacter,
  saveCurrentConversation,
  loadConversationMessages,
} from './helpers';
