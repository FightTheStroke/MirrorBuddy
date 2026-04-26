// ============================================================================
// FLASHCARD HANDLER TESTS
// Comprehensive unit tests for flashcard creation and validation
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCards } from '../flashcard-handler';
import type { FlashcardData, ToolExecutionResult } from '@/types/tools';

// Mock dependencies
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-123'),
}));

vi.mock('../../tool-executor', () => ({
  registerToolHandler: vi.fn((name: string, handler: Function) => {
    // Store handler for testing
    (globalThis as any).__testHandlers = (globalThis as any).__testHandlers || {};
    (globalThis as any).__testHandlers[name] = handler;
  }),
}));

// Helper to get registered handler
function getHandler(name: string): Function {
  return (globalThis as any).__testHandlers?.[name];
}

// Import handler after mocks are set up
import '../flashcard-handler';

describe('flashcard-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCards', () => {
    describe('success cases', () => {
      it('should validate single valid card', () => {
        const cards = [
          { front: 'Question?', back: 'Answer!' },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate multiple valid cards', () => {
        const cards = [
          { front: 'Question 1?', back: 'Answer 1' },
          { front: 'Question 2?', back: 'Answer 2' },
          { front: 'Question 3?', back: 'Answer 3' },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate cards with maximum allowed length', () => {
        const cards = [
          {
            front: 'A'.repeat(1000), // Max 1000 chars
            back: 'B'.repeat(2000),  // Max 2000 chars
          },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate cards with special characters', () => {
        const cards = [
          {
            front: 'What is π (pi)?',
            back: 'Approximately 3.14159... 🥧',
          },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate cards with HTML entities', () => {
        const cards = [
          {
            front: 'What is &lt;div&gt;?',
            back: 'An HTML element for divisions',
          },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('error cases - empty or invalid input', () => {
      it('should reject empty array', () => {
        const cards: any[] = [];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('At least one flashcard is required');
      });

      it('should reject null input', () => {
        const result = validateCards(null as any);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('At least one flashcard is required');
      });

      it('should reject undefined input', () => {
        const result = validateCards(undefined as any);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('At least one flashcard is required');
      });
    });

    describe('error cases - missing required fields', () => {
      it('should reject card with missing front text', () => {
        const cards = [
          { back: 'Answer' } as any,
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is required');
      });

      it('should reject card with missing back text', () => {
        const cards = [
          { front: 'Question?' } as any,
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: back text is required');
      });

      it('should reject card with both fields missing', () => {
        const cards = [
          {} as any,
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is required');
      });

      it('should identify the correct card number in multi-card validation', () => {
        const cards = [
          { front: 'Q1?', back: 'A1' },
          { front: 'Q2?', back: 'A2' },
          { front: 'Q3?' } as any, // Missing back
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 3: back text is required');
      });
    });

    describe('error cases - invalid field types', () => {
      it('should reject card with non-string front text', () => {
        const cards = [
          { front: 123, back: 'Answer' } as any,
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is required');
      });

      it('should reject card with non-string back text', () => {
        const cards = [
          { front: 'Question?', back: { answer: 'Answer' } } as any,
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: back text is required');
      });

      it('should reject card with null front text', () => {
        const cards = [
          { front: null, back: 'Answer' } as any,
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is required');
      });

      it('should reject card with empty string front text', () => {
        const cards = [
          { front: '', back: 'Answer' },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is required');
      });

      it('should reject card with empty string back text', () => {
        const cards = [
          { front: 'Question?', back: '' },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: back text is required');
      });
    });

    describe('error cases - length validation', () => {
      it('should reject card with front text exceeding 1000 characters', () => {
        const cards = [
          {
            front: 'A'.repeat(1001), // 1 char over limit
            back: 'Answer',
          },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is too long (max 1000 chars)');
      });

      it('should reject card with back text exceeding 2000 characters', () => {
        const cards = [
          {
            front: 'Question?',
            back: 'B'.repeat(2001), // 1 char over limit
          },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: back text is too long (max 2000 chars)');
      });

      it('should reject card with both texts exceeding limits', () => {
        const cards = [
          {
            front: 'A'.repeat(1001),
            back: 'B'.repeat(2001),
          },
        ];

        const result = validateCards(cards);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card 1: front text is too long (max 1000 chars)');
      });
    });

    describe('edge cases', () => {
      it('should validate card with whitespace-only content that gets trimmed', () => {
        const cards = [
          { front: '   ', back: '   ' },
        ];

        const result = validateCards(cards);

        // Note: validateCards doesn't trim, so this will fail
        // The handler trims AFTER validation
        expect(result.valid).toBe(true);
      });

      it('should validate array with many cards', () => {
        const cards = Array.from({ length: 100 }, (_, i) => ({
          front: `Question ${i + 1}?`,
          back: `Answer ${i + 1}`,
        }));

        const result = validateCards(cards);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('create_flashcards handler', () => {
    let handler: Function;

    beforeEach(() => {
      handler = getHandler('create_flashcards');
      expect(handler).toBeDefined();
    });

    describe('success cases', () => {
      it('should create flashcards with valid input', async () => {
        const args = {
          topic: 'Italian Vocabulary',
          cards: [
            { front: 'Casa', back: 'House' },
            { front: 'Libro', back: 'Book' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);
        expect(result.toolId).toBe('test-nanoid-123');
        expect(result.toolType).toBe('flashcard');
        expect(result.error).toBeUndefined();

        const data = result.data as FlashcardData;
        expect(data.topic).toBe('Italian Vocabulary');
        expect(data.cards).toHaveLength(2);
        expect(data.cards[0]).toEqual({ front: 'Casa', back: 'House' });
        expect(data.cards[1]).toEqual({ front: 'Libro', back: 'Book' });
      });

      it('should trim whitespace from topic and card content', async () => {
        const args = {
          topic: '  Math Formulas  ',
          cards: [
            { front: '  a² + b² = c²  ', back: '  Pythagorean theorem  ' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.topic).toBe('Math Formulas');
        expect(data.cards[0].front).toBe('a² + b² = c²');
        expect(data.cards[0].back).toBe('Pythagorean theorem');
      });

      it('should create flashcards with single card', async () => {
        const args = {
          topic: 'Chemistry',
          cards: [
            { front: 'H₂O', back: 'Water' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards).toHaveLength(1);
        expect(data.cards[0]).toEqual({ front: 'H₂O', back: 'Water' });
      });

      it('should create flashcards with maximum valid length', async () => {
        const args = {
          topic: 'Test',
          cards: [
            {
              front: 'A'.repeat(1000),
              back: 'B'.repeat(2000),
            },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards[0].front).toHaveLength(1000);
        expect(data.cards[0].back).toHaveLength(2000);
      });

      it('should preserve special characters and formatting', async () => {
        const args = {
          topic: 'Physics',
          cards: [
            {
              front: 'What is the formula for kinetic energy?',
              back: 'KE = ½mv²\n\nWhere:\n- m = mass\n- v = velocity',
            },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards[0].back).toContain('\n');
        expect(data.cards[0].back).toContain('½');
      });
    });

    describe('error cases - invalid topic', () => {
      it('should reject missing topic', async () => {
        const args = {
          cards: [
            { front: 'Question?', back: 'Answer' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.toolId).toBeDefined();
        expect(result.toolType).toBe('flashcard');
        expect(result.error).toBe('Topic is required and must be a string');
      });

      it('should reject null topic', async () => {
        const args = {
          topic: null,
          cards: [
            { front: 'Question?', back: 'Answer' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Topic is required and must be a string');
      });

      it('should reject non-string topic', async () => {
        const args = {
          topic: 123,
          cards: [
            { front: 'Question?', back: 'Answer' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Topic is required and must be a string');
      });

      it('should reject empty string topic', async () => {
        const args = {
          topic: '',
          cards: [
            { front: 'Question?', back: 'Answer' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Topic is required and must be a string');
      });

      it('should accept whitespace-only topic and trim it to empty string', async () => {
        const args = {
          topic: '   ',
          cards: [
            { front: 'Question?', back: 'Answer' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        // Note: Current implementation accepts whitespace-only topics
        // because `'   '` passes the truthy check, then gets trimmed
        // This could be improved with explicit empty string validation
        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.topic).toBe(''); // Trimmed to empty string
      });
    });

    describe('error cases - invalid cards', () => {
      it('should reject empty cards array', async () => {
        const args = {
          topic: 'Test',
          cards: [],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('At least one flashcard is required');
      });

      it('should reject missing cards field', async () => {
        const args = {
          topic: 'Test',
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('At least one flashcard is required');
      });

      it('should reject card with missing front text', async () => {
        const args = {
          topic: 'Test',
          cards: [
            { back: 'Answer' } as any,
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Card 1: front text is required');
      });

      it('should reject card with missing back text', async () => {
        const args = {
          topic: 'Test',
          cards: [
            { front: 'Question?' } as any,
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Card 1: back text is required');
      });

      it('should reject card with front text exceeding limit', async () => {
        const args = {
          topic: 'Test',
          cards: [
            {
              front: 'A'.repeat(1001),
              back: 'Answer',
            },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Card 1: front text is too long (max 1000 chars)');
      });

      it('should reject card with back text exceeding limit', async () => {
        const args = {
          topic: 'Test',
          cards: [
            {
              front: 'Question?',
              back: 'B'.repeat(2001),
            },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Card 1: back text is too long (max 2000 chars)');
      });

      it('should report correct card number for validation errors', async () => {
        const args = {
          topic: 'Test',
          cards: [
            { front: 'Q1?', back: 'A1' },
            { front: 'Q2?', back: 'A2' },
            { front: 'Q3?' } as any, // Missing back
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Card 3: back text is required');
      });
    });

    describe('data normalization', () => {
      it('should normalize cards into consistent format', async () => {
        const args = {
          topic: ' Biology  ',
          cards: [
            { front: '  Cell  ', back: '  Basic unit of life  ' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.topic).toBe('Biology');
        expect(data.cards[0].front).toBe('Cell');
        expect(data.cards[0].back).toBe('Basic unit of life');
      });

      it('should preserve card order', async () => {
        const args = {
          topic: 'Numbers',
          cards: [
            { front: 'One', back: '1' },
            { front: 'Two', back: '2' },
            { front: 'Three', back: '3' },
            { front: 'Four', back: '4' },
            { front: 'Five', back: '5' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards).toHaveLength(5);
        expect(data.cards[0].front).toBe('One');
        expect(data.cards[4].front).toBe('Five');
      });
    });

    describe('integration with FSRS system', () => {
      it('should create flashcard data compatible with FSRS format', async () => {
        const args = {
          topic: 'Spanish Verbs',
          cards: [
            { front: 'hablar', back: 'to speak' },
            { front: 'comer', back: 'to eat' },
            { front: 'vivir', back: 'to live' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;

        // Verify structure matches FSRS expectations
        expect(data).toHaveProperty('topic');
        expect(data).toHaveProperty('cards');
        expect(Array.isArray(data.cards)).toBe(true);

        // Each card should have front and back
        data.cards.forEach((card) => {
          expect(card).toHaveProperty('front');
          expect(card).toHaveProperty('back');
          expect(typeof card.front).toBe('string');
          expect(typeof card.back).toBe('string');
        });
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle large number of cards', async () => {
        const cards = Array.from({ length: 100 }, (_, i) => ({
          front: `Question ${i + 1}`,
          back: `Answer ${i + 1}`,
        }));

        const args = {
          topic: 'Large Set',
          cards,
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards).toHaveLength(100);
      });

      it('should handle Unicode characters correctly', async () => {
        const args = {
          topic: 'Emoji & Unicode',
          cards: [
            { front: '🌍', back: 'Earth' },
            { front: '你好', back: 'Hello (Chinese)' },
            { front: 'Привет', back: 'Hello (Russian)' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards[0].front).toBe('🌍');
        expect(data.cards[1].front).toBe('你好');
        expect(data.cards[2].front).toBe('Привет');
      });

      it('should handle multiline content', async () => {
        const args = {
          topic: 'Programming',
          cards: [
            {
              front: 'What is a function?',
              back: 'A reusable block of code.\n\nExample:\nfunction greet() {\n  console.log("Hello");\n}',
            },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(true);

        const data = result.data as FlashcardData;
        expect(data.cards[0].back).toContain('\n');
      });
    });

    describe('toolId generation', () => {
      it('should always generate a toolId', async () => {
        const args = {
          topic: 'Test',
          cards: [
            { front: 'Q', back: 'A' },
          ],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.toolId).toBeDefined();
        expect(result.toolId).toBe('test-nanoid-123');
      });

      it('should generate toolId even on validation errors', async () => {
        const args = {
          topic: '',
          cards: [],
        };

        const result = await handler(args) as ToolExecutionResult;

        expect(result.success).toBe(false);
        expect(result.toolId).toBeDefined();
      });
    });
  });
});
