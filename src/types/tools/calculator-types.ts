// ============================================================================
// CALCULATOR TOOL TYPES
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
