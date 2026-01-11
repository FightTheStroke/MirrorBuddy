/**
 * Flashcard Tool Plugin
 * Integrates flashcard creation with the plugin system
 * Supports voice interaction and system integration (F-02, F-03)
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
import type { ToolContext, ToolResult, FlashcardData, FlashcardItem } from '@/types/tools';

/**
 * Input validation schema for flashcard creation
 * Validates topic and card array structure
 */
const FlashcardInputSchema = z.object({
  topic: z.string()
    .min(1, 'Topic is required')
    .max(200, 'Topic must be under 200 characters'),
  cards: z.array(
    z.object({
      front: z.string()
        .min(1, 'Card front is required')
        .max(1000, 'Card front must be under 1000 characters'),
      back: z.string()
        .min(1, 'Card back is required')
        .max(2000, 'Card back must be under 2000 characters'),
    }),
    { message: 'Cards must be an array of front/back pairs' }
  ).min(1, 'At least one flashcard is required'),
});

type FlashcardInput = z.infer<typeof FlashcardInputSchema>;

/**
 * Handler for flashcard creation
 * Validates input and creates flashcard data for FSRS integration
 */
async function handleFlashcardCreation(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    // Validate input against schema
    const validated = FlashcardInputSchema.parse(args) as FlashcardInput;

    // Normalize card content
    const normalizedCards: FlashcardItem[] = validated.cards.map((card) => ({
      front: card.front.trim(),
      back: card.back.trim(),
    }));

    // Build flashcard data
    const data: FlashcardData = {
      topic: validated.topic.trim(),
      cards: normalizedCards,
    };

    return createSuccessResult('create_flashcard', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_flashcard',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation failed: ${error.message}`,
        { validationError: error.message }
      );
    }

    return createErrorResult(
      'create_flashcard',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Failed to create flashcards'
    );
  }
}

/**
 * Flashcard Plugin Definition
 * Enables voice-driven flashcard creation with system integration
 * Addresses F-02 (maestri create tools) and F-03 (tool integration)
 */
export const flashcardPlugin: ToolPlugin = {
  // Identification
  id: 'create_flashcard',
  name: 'Flashcard',

  // Organization
  category: ToolCategory.CREATION,

  // Input validation
  schema: FlashcardInputSchema,

  // Execution handler
  handler: handleFlashcardCreation,

  // Voice interaction with template support
  // Maestri can say: "Vuoi creare delle flashcard su [topic]?"
  voicePrompt: {
    template: 'Vuoi creare delle flashcard su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare delle flashcard?',
  },

  // Feedback after creation with dynamic count
  // System responds: "Ho creato [N] flashcard pronte per lo studio!"
  voiceFeedback: {
    template: 'Ho creato {itemCount} flashcard pronte per lo studio!',
    requiresContext: ['itemCount'],
    fallback: 'Ho creato le flashcard!',
  },

  // Voice triggers for natural language detection
  triggers: ['flashcard', 'crea flashcard', 'carte', 'schede'],

  // No prerequisites for flashcard creation
  prerequisites: [],

  // Required permissions
  permissions: [Permission.WRITE_CONTENT],
};

export default flashcardPlugin;
