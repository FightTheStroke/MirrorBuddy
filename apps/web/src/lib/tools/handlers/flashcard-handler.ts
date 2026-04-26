// ============================================================================
// FLASHCARD HANDLER
// Creates flashcard sets for spaced repetition learning
// Compatible with the existing FSRS system
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { FlashcardData, FlashcardItem, ToolExecutionResult } from '@/types/tools';

/**
 * Validate flashcard items
 */
function validateCards(
  cards: unknown[]
): { valid: boolean; error?: string } {
  if (!cards || cards.length === 0) {
    return { valid: false, error: 'At least one flashcard is required' };
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as Partial<FlashcardItem>;

    if (!card.front || typeof card.front !== 'string') {
      return {
        valid: false,
        error: `Card ${i + 1}: front text is required`,
      };
    }

    if (!card.back || typeof card.back !== 'string') {
      return {
        valid: false,
        error: `Card ${i + 1}: back text is required`,
      };
    }

    // Check for reasonable length
    if (card.front.length > 1000) {
      return {
        valid: false,
        error: `Card ${i + 1}: front text is too long (max 1000 chars)`,
      };
    }

    if (card.back.length > 2000) {
      return {
        valid: false,
        error: `Card ${i + 1}: back text is too long (max 2000 chars)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Register the flashcard handler
 */
registerToolHandler('create_flashcards', async (args): Promise<ToolExecutionResult> => {
  const { topic, cards } = args as {
    topic: string;
    cards: Array<{ front: string; back: string }>;
  };

  // Validate topic
  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'flashcard',
      error: 'Topic is required and must be a string',
    };
  }

  // Validate cards
  const validation = validateCards(cards);
  if (!validation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'flashcard',
      error: validation.error,
    };
  }

  // Normalize card content
  const normalizedCards: FlashcardItem[] = cards.map((card) => ({
    front: card.front.trim(),
    back: card.back.trim(),
  }));

  const data: FlashcardData = {
    topic: topic.trim(),
    cards: normalizedCards,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'flashcard',
    data,
  };
});

export { validateCards };
