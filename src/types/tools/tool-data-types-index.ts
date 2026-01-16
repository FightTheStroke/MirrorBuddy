// ============================================================================
// TOOL DATA TYPES - BARREL EXPORT
// Re-exports all tool-specific data types for backward compatibility
// ============================================================================

// Educational types
export type {
  MindmapNode,
  MindmapData,
  QuizQuestion,
  QuizData,
  DemoData,
  SummarySection,
  SummaryData,
  DiagramData,
  TimelineEvent,
  TimelineData,
  FlashcardItem,
  FlashcardData,
} from './tool-data-types-educational';

// Utility types
export type {
  SearchResult,
  SearchData,
  CalculatorMode,
  CalculatorRequest,
  CalculatorStep,
  CalculatorData,
  CalculatorEventType,
  FormulaData,
  ChartData,
  PDFMetadata,
  PDFData,
  WebcamData,
} from './tool-data-types-utility';

// Student interaction types
export type {
  InlineComment,
  StudentSummarySection,
  StudentSummaryData,
} from './tool-data-types-student';

export {
  SUMMARY_STRUCTURE_TEMPLATE,
  createEmptyStudentSummary,
} from './tool-data-types-student';

// Text analysis utilities
export { countWords, calculateSummaryWordCount } from './tool-data-types-utils';
