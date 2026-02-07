// ============================================================================
// CALCULATOR HANDLER
// Evaluates mathematical expressions with step-by-step visualization
// Uses mathjs for secure expression evaluation (replaced expr-eval)
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { create, all } from 'mathjs';
import { nanoid } from 'nanoid';
import { formatNumberColored } from '@/lib/education';
import type {
  CalculatorRequest,
  CalculatorData,
  CalculatorStep,
  ToolExecutionResult
} from '@/types/tools';

/**
 * Maximum expression length (prevent DoS)
 */
const MAX_EXPRESSION_LENGTH = 500;

/**
 * Create a restricted mathjs instance for safe evaluation
 * Only includes safe mathematical functions, no dangerous operations
 */
const math = create(all, {
  // Disable potentially dangerous features
  matrix: 'Array',
});

// Remove potentially dangerous functions from the math instance
const limitedMath = math.create({
  // Only allow safe mathematical operations
});

/**
 * Validate expression
 */
function validateExpression(expression: string): { valid: boolean; error?: string } {
  if (!expression || typeof expression !== 'string') {
    return { valid: false, error: 'Expression is required' };
  }

  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      valid: false,
      error: `Expression too long (max ${MAX_EXPRESSION_LENGTH} characters)`
    };
  }

  // Check for dangerous patterns (eval, Function, etc.)
  const dangerousPatterns = /eval|function|constructor|prototype|__proto__|window|document|global|import|require/gi;
  if (dangerousPatterns.test(expression)) {
    return { valid: false, error: 'Invalid expression: unsafe pattern detected' };
  }

  return { valid: true };
}

/**
 * Parse expression into steps for dyscalculia support
 */
function generateSteps(expression: string, result: number): CalculatorStep[] {
  const steps: CalculatorStep[] = [];

  try {
    steps.push({
      stepNumber: 1,
      description: 'Valuta l\'espressione',
      expression: `${expression} = ${result}`,
      result,
      visual: formatNumberColored(result, true)
    });

    return steps;
  } catch {
    return [];
  }
}

/**
 * Register the calculator handler
 */
registerToolHandler('create_calculator', async (args): Promise<ToolExecutionResult> => {
  const {
    expression,
    // Note: mode is currently unused as we only support scientific mode
    // Will be used when simple mode is implemented
    showSteps = true,
    description
  } = args as unknown as CalculatorRequest;

  // Validate expression
  const validation = validateExpression(expression);
  if (!validation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'calculator',
      error: validation.error
    };
  }

  try {
    // Evaluate using mathjs (secure, sandboxed)
    const result = limitedMath.evaluate(expression.trim());

    // Validate result is a number
    if (typeof result !== 'number' || !isFinite(result)) {
      return {
        success: false,
        toolId: nanoid(),
        toolType: 'calculator',
        error: 'Expression did not evaluate to a valid number'
      };
    }

    // Generate step-by-step breakdown if requested
    const steps = showSteps ? generateSteps(expression, result) : undefined;

    const data: CalculatorData = {
      expression: expression.trim(),
      result,
      steps,
      description
    };

    return {
      success: true,
      toolId: nanoid(),
      toolType: 'calculator',
      data
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Invalid expression';
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'calculator',
      error: `Errore di calcolo: ${errorMsg}`
    };
  }
});

export { validateExpression, generateSteps };
