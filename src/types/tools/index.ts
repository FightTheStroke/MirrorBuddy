// ============================================================================
// TOOLS - Type Definitions (Barrel Export)
// ============================================================================

// Core tool types
export type {
  ToolType,
  ToolState,
  ToolContext,
  ToolExecutionResult,
  ToolEventType,
  ToolCall,
  ToolResult,
} from './tool-types';

// OpenAI function definitions
export { CHAT_TOOL_DEFINITIONS } from './tool-schemas';

// Tool-specific data types
export type {
  // Mindmap
  MindmapNode,
  MindmapData,
  // Quiz
  QuizQuestion,
  QuizData,
  // Demo
  DemoData,
  // Search
  SearchResult,
  SearchData,
  // Flashcard
  FlashcardItem,
  FlashcardData,
  // Summary
  SummarySection,
  SummaryData,
  // Student Summary
  InlineComment,
  StudentSummarySection,
  StudentSummaryData,
  // Diagram
  DiagramData,
  // Timeline
  TimelineEvent,
  TimelineData,
} from './tool-data-types';

export {
  SUMMARY_STRUCTURE_TEMPLATE,
  createEmptyStudentSummary,
} from './tool-data-types';

// Tool request types
export type {
  QuizRequest,
  FlashcardDeckRequest,
  MindmapRequest,
  DiagramRequest,
  ChartRequest,
  FormulaRequest,
  CodeExecutionRequest,
  VisualizationRequest,
} from './tool-request-types';
