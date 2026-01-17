/**
 * Formula Plugin
 * Tool plugin for mathematical formula rendering (KaTeX/LaTeX)
 * Supports both Italian and English voice triggers for accessibility
 */

import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolResult, FormulaData, ToolContext } from '@/types/tools';
import {
  isLatex,
  validateLatex,
  generateLatexFromDescription,
} from '../handlers/formula-handler';
import { logger } from '@/lib/logger';

/**
 * Zod schema for formula input validation
 * Accepts either LaTeX string or natural language description
 */
const FormulaInputSchema = z.object({
  latex: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Handler for formula creation
 * Generates or validates KaTeX/LaTeX formulas
 */
async function formulaHandler(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = FormulaInputSchema.parse(args);
    const { latex: inputLatex, description: inputDescription } = validated;

    // Validate input - must have either latex or description
    if (!inputLatex && !inputDescription) {
      return createErrorResult(
        'create_formula',
        ToolErrorCode.VALIDATION_FAILED,
        'Specifica una formula LaTeX o una descrizione matematica'
      );
    }

    let latex: string;
    let description: string | undefined;
    let displayMode: 'inline' | 'block' = 'block';

    // Case 1: LaTeX string provided
    if (inputLatex) {
      latex = inputLatex.trim();

      // Validate LaTeX syntax
      const validation = validateLatex(latex);
      if (!validation.valid) {
        return createErrorResult(
          'create_formula',
          ToolErrorCode.VALIDATION_FAILED,
          `LaTeX non valido: ${validation.error}`
        );
      }

      description = inputDescription;

      // Determine display mode based on complexity
      displayMode =
        latex.length > 30 || latex.includes('\\int') || latex.includes('\\sum')
          ? 'block'
          : 'inline';

      logger.info('Formula handler: LaTeX provided directly', {
        latexLength: latex.length,
        displayMode,
      });
    }
    // Case 2: Description provided, generate LaTeX
    else if (inputDescription) {
      // Check if description is actually LaTeX
      if (isLatex(inputDescription)) {
        latex = inputDescription.trim();

        const validation = validateLatex(latex);
        if (!validation.valid) {
          return createErrorResult(
            'create_formula',
            ToolErrorCode.VALIDATION_FAILED,
            `LaTeX non valido: ${validation.error}`
          );
        }

        description = undefined;
        displayMode = latex.length > 30 ? 'block' : 'inline';

        logger.info('Formula handler: Description was LaTeX', {
          latexLength: latex.length,
        });
      } else {
        // Generate LaTeX from natural language
        logger.info('Formula handler: Generating LaTeX from description', {
          descriptionLength: inputDescription.length,
        });

        const generated = await generateLatexFromDescription(inputDescription);

        if (!generated || !generated.latex) {
          return createErrorResult(
            'create_formula',
            ToolErrorCode.EXECUTION_FAILED,
            'Non sono riuscito a generare la formula. Prova a specificare il LaTeX direttamente.'
          );
        }

        latex = generated.latex;
        description = generated.explanation || inputDescription;
        displayMode = latex.length > 30 ? 'block' : 'inline';

        logger.info('Formula handler: LaTeX generated successfully', {
          generatedLength: latex.length,
          displayMode,
        });
      }
    } else {
      return createErrorResult(
        'create_formula',
        ToolErrorCode.VALIDATION_FAILED,
        'Input non valido'
      );
    }

    const data: FormulaData = {
      latex,
      description,
      displayMode,
    };

    return createSuccessResult('create_formula', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_formula',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Formula creation failed', { errorDetails: errorMessage });

    return createErrorResult(
      'create_formula',
      ToolErrorCode.EXECUTION_FAILED,
      errorMessage
    );
  }
}

/**
 * Formula Plugin Definition
 * Implements ToolPlugin interface for mathematical formula rendering
 * Supports voice interaction with Italian and English triggers
 */
export const formulaPlugin: ToolPlugin = {
  // Identification
  id: 'create_formula',
  name: 'Formula',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: FormulaInputSchema,

  // Execution
  handler: formulaHandler,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi creare una formula su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare una formula?',
  },
  voiceFeedback: {
    template: 'Ecco la formula: {latex}!',
    requiresContext: ['latex'],
    fallback: 'Ho creato la tua formula!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'formula',
    'equazione',
    'equation',
    'scrivi formula',
    'mostra formula',
    'latex',
    'matematica',
    'write formula',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default formulaPlugin;
