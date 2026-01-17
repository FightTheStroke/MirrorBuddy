/**
 * AI Module - Barrel Export
 * F-08: Feature modules con boundaries chiari
 */

// Character routing
export {
  routeToCharacter,
  type RoutingResult,
  type RoutingContext,
} from "./character-router";

// Handoff management
export {
  analyzeHandoff,
  mightNeedHandoff,
  type HandoffContext,
  type HandoffAnalysis,
} from "./handoff-manager";

// Intent detection
export {
  detectIntent,
  getCharacterTypeLabel,
  shouldSuggestRedirect,
} from "./intent-detection";
export type { DetectedIntent, CharacterType } from "./intent-detection";

// Parent mode
export {
  PARENT_MODE_PREAMBLE,
  formatLearningsForParentMode,
  generateParentModePrompt,
  getParentModeGreeting,
} from "./parent-mode";

// Provider check
export {
  hasAzureProvider,
  hasOllamaProvider,
  hasAnyProvider,
  getProviderCheckStatus,
} from "./provider-check";

// Summarization
export {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
  generateConversationTitle,
} from "./summarize";
