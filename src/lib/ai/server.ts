/**
 * @module ai/server
 * Server-only AI functionality (requires API access, DB, or tier service)
 *
 * Re-exports all client-safe exports from ./index, plus server-only exports
 */

// Re-export all client-safe exports
export * from "./index";

// Server-only exports - Providers (API access)
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

// Server-only exports - Deployment mapping
export { getDeploymentForModel } from "./providers/deployment-mapping";

// Server-only exports - Router
export { aiRouter } from "./providers/router";

// Server-only exports - Summarization (uses tierService)
export {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
  generateConversationTitle,
} from "./summarize";
