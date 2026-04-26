/**
 * Homework Plugin
 * Tool plugin for homework assistance with maieutic guidance
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
import type { ToolResult, ToolContext } from '@/types/tools';
import { analyzeHomework, extractTextFromImage } from '../handlers/homework-handler';
import { extractTextFromPDF } from '../handlers/study-kit-handler';
import { logger } from '@/lib/logger';

/**
 * Zod schema for homework input validation
 * Supports text, PDF, or image input
 */
const HomeworkInputSchema = z.object({
  text: z.string().optional(),
  fileData: z.union([z.string(), z.instanceof(ArrayBuffer)]).optional(),
  fileType: z.enum(['pdf', 'image']).optional(),
});

/**
 * Homework data structure for maieutic assistance
 */
interface HomeworkData {
  type: 'homework';
  exerciseType: string;
  problemStatement: string;
  givenData?: string[];
  topic?: string;
  difficulty?: string;
  hints?: string[];
  originalText?: string;
  sourceType: 'pdf' | 'image' | 'text';
}

/**
 * Handler for homework assistance
 * Processes uploaded exercises and provides maieutic guidance
 */
async function homeworkHandler(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = HomeworkInputSchema.parse(args);
    const { text, fileData, fileType } = validated;

    let extractedText: string;
    let sourceType: 'pdf' | 'image' | 'text';

    // Extract text from different sources
    if (text) {
      extractedText = text;
      sourceType = 'text';
    } else if (fileType === 'pdf' && fileData) {
      const buffer =
        typeof fileData === 'string'
          ? Buffer.from(fileData, 'base64')
          : Buffer.from(fileData);
      const result = await extractTextFromPDF(buffer);
      extractedText = result.text;
      sourceType = 'pdf';
    } else if (fileType === 'image' && fileData) {
      const imageDataUrl =
        typeof fileData === 'string'
          ? fileData
          : `data:image/jpeg;base64,${Buffer.from(fileData).toString('base64')}`;
      extractedText = await extractTextFromImage(imageDataUrl);
      sourceType = 'image';
    } else {
      return createErrorResult(
        'homework_help',
        ToolErrorCode.VALIDATION_FAILED,
        'Devi fornire un file PDF, un\'immagine, o del testo.'
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return createErrorResult(
        'homework_help',
        ToolErrorCode.EXECUTION_FAILED,
        'Nessun testo trovato nel file caricato.'
      );
    }

    const analysis = await analyzeHomework(extractedText, sourceType);
    const homeworkData: HomeworkData = {
      type: 'homework',
      sourceType,
      ...analysis,
    };

    logger.info('Homework processed', {
      exerciseType: homeworkData.exerciseType,
      topic: homeworkData.topic,
    });

    return createSuccessResult('homework_help', homeworkData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'homework_help',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to process homework', { errorDetails: errorMessage });

    return createErrorResult(
      'homework_help',
      ToolErrorCode.EXECUTION_FAILED,
      `Errore elaborazione: ${errorMessage}`
    );
  }
}

/**
 * Homework Plugin Definition
 * Implements ToolPlugin interface for homework assistance
 * Supports voice interaction with Italian and English triggers
 */
export const homeworkPlugin: ToolPlugin = {
  // Identification
  id: 'homework_help',
  name: 'Aiuto Compiti',

  // Organization
  category: ToolCategory.EDUCATIONAL,

  // Validation
  schema: HomeworkInputSchema,

  // Execution
  handler: homeworkHandler,

  // Voice interaction
  voicePrompt: {
    template: 'Hai bisogno di aiuto con i compiti?',
    requiresContext: [],
    fallback: 'Vuoi aiuto con un esercizio?',
  },
  voiceFeedback: {
    template: 'Ho analizzato l\'esercizio! Iniziamo insieme!',
    requiresContext: [],
    fallback: 'Pronto ad aiutarti con i compiti!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'aiuto compiti',
    'aiutami con',
    'esercizio',
    'homework',
    'homework help',
    'problem',
    'compiti',
    'help homework',
    'problema',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [
    Permission.FILE_ACCESS,
    Permission.READ_CONVERSATION,
    Permission.WRITE_CONTENT,
    Permission.VOICE_OUTPUT,
  ],
};

export default homeworkPlugin;
