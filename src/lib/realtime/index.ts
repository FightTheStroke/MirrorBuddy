// ============================================================================
// REALTIME MODULE
// Exports for real-time tool building infrastructure
// ============================================================================

// Tool events (SSE broadcasting)
export {
  type ToolEvent,
  type ToolEventType,
  type ToolEventData,
  type ToolType,
  registerClient,
  unregisterClient,
  broadcastToolEvent,
  sendHeartbeat,
  getSessionClientCount,
  getTotalClientCount,
  cleanupStaleClients,
  HEARTBEAT_INTERVAL_MS,
} from "./tool-events";

// SSE client store (Redis in prod, memory in dev)
export {
  type SSEClientMetadata,
  type SSEClientStore,
  getSSEStore,
  getInstanceId,
  isLocalClient,
} from "./redis-sse-store";

// Tool state management
export {
  type ToolState,
  type ToolStatus,
  type ToolContent,
  type MindmapContent,
  type FlashcardContent,
  type QuizContent,
  type SummaryContent,
  type TimelineContent,
  type DiagramContent,
  createToolState,
  updateToolState,
  completeToolState,
  failToolState,
  cancelToolState,
  getToolState,
  getSessionToolStates,
  getActiveToolStates,
  cleanupOldTools,
  getToolStateStats,
} from "./tool-state";
