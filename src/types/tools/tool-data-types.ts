// ============================================================================
// TOOL DATA TYPES - Tool-specific data structures
// ============================================================================

// ============================================================================
// Mindmap specific types
// ============================================================================

export interface MindmapNode {
  id: string;
  label: string;
  parentId?: string | null;
  children?: MindmapNode[];
}

export interface MindmapData {
  title: string; // ADR 0020: Standardized on 'title' (was 'topic')
  topic?: string; // Deprecated: for backward compatibility
  nodes: MindmapNode[];
  markdown?: string;
}

// ============================================================================
// Quiz specific types
// ============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

// ============================================================================
// Demo specific types
// ============================================================================

export interface DemoData {
  title: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
}

// ============================================================================
// Search specific types
// ============================================================================

export interface SearchResult {
  type: 'web' | 'youtube';
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  duration?: string; // YouTube only
}

export interface SearchData {
  query: string;
  searchType: 'web' | 'youtube' | 'all';
  results: SearchResult[];
  /** Source used for web search: 'brave' (real-time) or 'wikipedia' (fallback) */
  searchSource?: 'brave' | 'wikipedia';
}

// ============================================================================
// Flashcard specific types
// ============================================================================

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface FlashcardData {
  topic: string;
  cards: FlashcardItem[];
}

// ============================================================================
// Summary specific types
// ============================================================================

export interface SummarySection {
  title: string;
  content: string;
  keyPoints?: string[];
}

export interface SummaryData {
  topic: string;
  sections: SummarySection[];
  length?: 'short' | 'medium' | 'long';
}

// ============================================================================
// Student Summary types (maieutic method - student writes, AI guides)
// Issue #70: Collaborative summary writing
// ============================================================================

/**
 * Inline comment from Maestro on student's text
 */
export interface InlineComment {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  maestroId: string;
  createdAt: Date;
  resolved?: boolean;
}

/**
 * A guided section in student's summary
 */
export interface StudentSummarySection {
  id: string;
  heading: string;
  guidingQuestion: string;
  content: string;
  comments: InlineComment[];
}

/**
 * Student-written summary
 */
export interface StudentSummaryData {
  id: string;
  title: string;
  topic: string;
  sections: StudentSummarySection[];
  wordCount: number;
  createdAt: Date;
  lastModifiedAt: Date;
  maestroId?: string;
  sessionId?: string;
}

/**
 * Default guided structure template
 */
export const SUMMARY_STRUCTURE_TEMPLATE: Omit<StudentSummarySection, 'comments'>[] = [
  {
    id: 'intro',
    heading: 'Introduzione',
    guidingQuestion: 'Di cosa parla questo argomento? Qual è il tema principale?',
    content: '',
  },
  {
    id: 'main',
    heading: 'Sviluppo',
    guidingQuestion: 'Quali sono i punti chiave? Cosa hai capito di importante?',
    content: '',
  },
  {
    id: 'conclusion',
    heading: 'Conclusione',
    guidingQuestion: 'Quali conclusioni puoi trarre? Cosa è importante ricordare?',
    content: '',
  },
];

/**
 * Creates a new empty student summary
 */
export function createEmptyStudentSummary(
  topic: string,
  maestroId?: string,
  sessionId?: string
): StudentSummaryData {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    title: topic,
    topic,
    sections: SUMMARY_STRUCTURE_TEMPLATE.map((section) => ({
      ...section,
      comments: [],
    })),
    wordCount: 0,
    createdAt: now,
    lastModifiedAt: now,
    maestroId,
    sessionId,
  };
}

// ============================================================================
// Diagram specific types
// ============================================================================

export interface DiagramData {
  topic: string;
  diagramType: 'flowchart' | 'sequence' | 'class' | 'er';
  mermaidCode: string;
}

// ============================================================================
// Timeline specific types
// ============================================================================

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
}

export interface TimelineData {
  topic: string;
  period?: string;
  events: TimelineEvent[];
}

// ============================================================================
// Calculator specific types
// ============================================================================

/**
 * Calculator modes
 */
export type CalculatorMode = 'simple' | 'scientific';

/**
 * Calculator request structure (from AI tool call)
 */
export interface CalculatorRequest {
  /** Mathematical expression to evaluate (e.g., "2+3*4", "sin(PI/2)") */
  expression: string;

  /** Calculator mode (default: 'scientific' for Euclide) */
  mode?: CalculatorMode;

  /** Show step-by-step breakdown (CRITICAL for dyscalculia support) */
  showSteps?: boolean;

  /** Description/context for the calculation */
  description?: string;
}

/**
 * Single step in calculation breakdown (for dyscalculia visualization)
 */
export interface CalculatorStep {
  /** Step number (1-indexed) */
  stepNumber: number;

  /** Human-readable description (e.g., "First, multiply 3 × 4") */
  description: string;

  /** Expression at this step (e.g., "3 × 4 = 12") */
  expression: string;

  /** Intermediate result */
  result: number | string;

  /** Visual representation (HTML with color-coded numbers) */
  visual?: string;
}

/**
 * Calculator result data
 */
export interface CalculatorData {
  /** Original expression */
  expression: string;

  /** Final result */
  result: number;

  /** Step-by-step breakdown (if showSteps=true) */
  steps?: CalculatorStep[];

  /** Variables used (if any) */
  variables?: Record<string, number>;

  /** LaTeX representation for formula display */
  latex?: string;

  /** Description/context for the calculation */
  description?: string;
}

/**
 * Calculator tool event types (for SSE streaming)
 */
export type CalculatorEventType =
  | 'calculator:step'      // Emitted for each calculation step
  | 'calculator:result'    // Final result computed
  | 'calculator:error';    // Error during calculation

// ============================================================================
// Formula specific types
// ============================================================================

export interface FormulaData {
  /** LaTeX/KaTeX formula string */
  latex: string;
  /** Human-readable description of the formula */
  description?: string;
  /** Display mode: inline (within text) or block (centered, larger) */
  displayMode?: 'inline' | 'block';
}

// ============================================================================
// Chart specific types
// ============================================================================

/**
 * Chart.js configuration data
 * Supports common chart types for data visualization
 */
export interface ChartData {
  /** Chart title */
  title: string;

  /** Type of chart */
  chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'polarArea';

  /** Complete Chart.js configuration object */
  config: Record<string, unknown>;

  /** Description of what the chart shows */
  description?: string;

  /** Data source or context */
  dataSource?: string;
}

// ============================================================================
// PDF specific types
// ============================================================================

export interface PDFMetadata {
  pageCount: number;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: Date;
}

export interface PDFData {
  text: string;
  metadata: PDFMetadata;
}

// ============================================================================
// Webcam specific types
// ============================================================================

export interface WebcamData {
  imageBase64: string;
  extractedText?: string;
  imageDescription?: string;
  analysisTimestamp: Date;
}

// ============================================================================
// Text Analysis Utilities
// ============================================================================

/**
 * Counts words in a text string, removing markdown formatting
 */
export function countWords(content: string): number {
  if (!content) return 0;
  return content
    .replace(/[#*_`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

/**
 * Calculates total word count for a SummaryData structure
 */
export function calculateSummaryWordCount(sections: SummarySection[]): number {
  return sections.reduce((total, section) => {
    const contentWords = countWords(section.content);
    const keyPointsWords = (section.keyPoints || []).reduce(
      (sum, point) => sum + countWords(point),
      0
    );
    return total + contentWords + keyPointsWords;
  }, 0);
}
