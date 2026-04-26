// ============================================================================
// REAL-TIME TOOL STATE MANAGEMENT
// Tracks the state of tools being built by Maestri in real-time
// Supports resumable tool creation and state persistence
// ============================================================================

// Re-export types
export type {
  ToolStatus,
  MindmapContent,
  FlashcardContent,
  QuizContent,
  SummaryContent,
  TimelineContent,
  DiagramContent,
  ToolContent,
  ToolState,
} from './tool-state/types';

// Re-export operations
export {
  createToolState,
  updateToolState,
  completeToolState,
  failToolState,
  cancelToolState,
} from './tool-state/operations';

// Re-export helpers
export { initializeContent } from './tool-state/helpers';

// Re-export queries
export {
  getToolState,
  getSessionToolStates,
  getActiveToolStates,
  cleanupOldTools,
  clearAllToolStates,
  getToolStateStats,
} from './tool-state/queries';

// TypedToolState interface for external use
import type { ToolType } from './tool-events';
import type { ToolState, ToolContent } from './tool-state/types';

export interface TypedToolState extends Omit<ToolState, 'type'> {
  type: ToolType;
  subject?: string;
  createdAt: number;
  updatedAt: number;
  progress: number;
  chunksReceived: number;
  content: Partial<ToolContent>;
  rawChunks: string[];
  errorMessage?: string;
}
