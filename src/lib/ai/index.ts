/**
 * @module ai
 * AI Module - Barrel Export
 * F-08: Feature modules con boundaries chiari
 */

// Character routing
export {
  routeToCharacter,
  getBuddyForStudent,
  quickRoute,
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

// Providers - core functions and types
export {
  chatCompletion,
  getActiveProvider,
  getRealtimeProvider,
  isAzureConfigured,
  azureStreamingCompletion,
  type AIProvider,
  type ChatCompletionResult,
  type ToolDefinition,
  type StreamChunk,
  type StreamChunkType,
  type StreamingOptions,
} from "./providers";

// Provider types
export type { AIProviderType } from "./providers/provider-interface";

// Deployment mapping
export { getDeploymentForModel } from "./providers/deployment-mapping";

// Router
export { aiRouter } from "./providers/router";

// Summarization
export {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
  generateConversationTitle,
} from "./summarize";

// Transparency
export {
  assessResponseTransparency,
  type TransparencyContext,
} from "./transparency";
