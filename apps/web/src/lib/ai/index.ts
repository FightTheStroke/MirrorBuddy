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

// Provider types (client-safe type-only exports)
export type { AIProviderType } from "./providers/provider-interface";

// Transparency (client-safe)
export {
  assessResponseTransparency,
  type TransparencyContext,
} from "./transparency";
