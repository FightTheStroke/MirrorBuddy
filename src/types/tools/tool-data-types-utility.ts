// ============================================================================
// UTILITY TOOL DATA TYPES
// Search, Calculator, Formula, Chart, PDF, Webcam
// ============================================================================

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
