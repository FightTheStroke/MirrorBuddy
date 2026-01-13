// ============================================================================
// CALCULATOR HANDLER
// Evaluates mathematical expressions with step-by-step visualization
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { Parser } from 'expr-eval';
import { nanoid } from 'nanoid';
import { formatNumberColored } from '@/lib/education/accessibility/dyscalculia';
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
  const dangerousPatterns = /eval|function|constructor|prototype|__proto__|window|document|global/gi;
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
    // For now, simple implementation: show original expression and result
    // TODO: Enhance with actual step-by-step breakdown using AST traversal
    steps.push({
      stepNumber: 1,
      description: 'Valuta l\'espressione',
      expression: `${expression} = ${result}`,
      result,
      visual: formatNumberColored(result, true)
    });

    return steps;
  } catch (error) {
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
  } = args as CalculatorRequest;

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
    // Create parser and evaluate
    const parser = new Parser();

    // Add custom constants (support both uppercase and lowercase)
    parser.consts.PI = Math.PI;
    parser.consts.pi = Math.PI;
    parser.consts.E = Math.E;
    parser.consts.e = Math.E;

    const result = parser.evaluate(expression.trim());

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
