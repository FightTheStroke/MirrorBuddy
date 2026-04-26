// ============================================================================
// QUIZ HANDLER TESTS
// Comprehensive unit tests for quiz creation and validation
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { QuizQuestion, ToolExecutionResult } from '@/types/tools';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-quiz-id-123'),
}));

// Mock the tool executor module using globalThis to avoid hoisting issues
vi.mock('../../tool-executor', () => ({
  registerToolHandler: vi.fn((name: string, handler: any) => {
    (globalThis as any).__quizHandler = handler;
  }),
}));

// Import the handler after mocks are set up
import { validateQuestions } from '../quiz-handler';
// This import triggers the handler registration via side effects
import '../quiz-handler';

// Helper to get the registered handler
function getQuizHandler(): ((args: Record<string, unknown>) => Promise<ToolExecutionResult>) | null {
  return (globalThis as any).__quizHandler ?? null;
}

// Helper that throws if handler not registered (avoids TS null checks)
function requireQuizHandler(): (args: Record<string, unknown>) => Promise<ToolExecutionResult> {
  const handler = getQuizHandler();
  if (!handler) throw new Error('Handler not registered');
  return handler;
}

describe('Quiz Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateQuestions', () => {
    it('should validate correct questions structure', () => {
      const questions: QuizQuestion[] = [
        {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctIndex: 1,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty questions array', () => {
      const result = validateQuestions([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one question is required');
    });

    it('should reject null questions array', () => {
      const result = validateQuestions(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one question is required');
    });

    it('should reject undefined questions array', () => {
      const result = validateQuestions(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one question is required');
    });

    it('should reject question without text', () => {
      const questions = [
        {
          options: ['A', 'B'],
          correctIndex: 0,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: question text is required');
    });

    it('should reject question with non-string text', () => {
      const questions = [
        {
          question: 123,
          options: ['A', 'B'],
          correctIndex: 0,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: question text is required');
    });

    it('should reject question without options', () => {
      const questions = [
        {
          question: 'What is X?',
          correctIndex: 0,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: at least 2 options are required');
    });

    it('should reject question with less than 2 options', () => {
      const questions = [
        {
          question: 'What is X?',
          options: ['Only one'],
          correctIndex: 0,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: at least 2 options are required');
    });

    it('should reject question with non-array options', () => {
      const questions = [
        {
          question: 'What is X?',
          options: 'not an array',
          correctIndex: 0,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: at least 2 options are required');
    });

    it('should reject question without correctIndex', () => {
      const questions = [
        {
          question: 'What is X?',
          options: ['A', 'B'],
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: correctIndex must be a valid index');
    });

    it('should reject question with negative correctIndex', () => {
      const questions = [
        {
          question: 'What is X?',
          options: ['A', 'B'],
          correctIndex: -1,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: correctIndex must be a valid index');
    });

    it('should reject question with correctIndex out of bounds', () => {
      const questions = [
        {
          question: 'What is X?',
          options: ['A', 'B'],
          correctIndex: 5,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: correctIndex must be a valid index');
    });

    it('should reject question with non-number correctIndex', () => {
      const questions = [
        {
          question: 'What is X?',
          options: ['A', 'B'],
          correctIndex: 'not a number',
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 1: correctIndex must be a valid index');
    });

    it('should validate multiple questions correctly', () => {
      const questions: QuizQuestion[] = [
        {
          question: 'Question 1?',
          options: ['A', 'B'],
          correctIndex: 0,
        },
        {
          question: 'Question 2?',
          options: ['C', 'D', 'E'],
          correctIndex: 1,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should report correct question number in error for second question', () => {
      const questions = [
        {
          question: 'Valid question?',
          options: ['A', 'B'],
          correctIndex: 0,
        },
        {
          question: 'Invalid question?',
          options: ['X'],
          correctIndex: 0,
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question 2: at least 2 options are required');
    });

    it('should accept questions with optional explanation', () => {
      const questions: QuizQuestion[] = [
        {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctIndex: 1,
          explanation: 'Basic arithmetic',
        },
      ];

      const result = validateQuestions(questions);
      expect(result.valid).toBe(true);
    });
  });

  describe('Quiz Handler Registration', () => {
    it('should have a registered handler available', () => {
      expect(getQuizHandler()).not.toBeNull();
      expect(typeof getQuizHandler()).toBe('function');
    });
  });

  describe('Quiz Creation', () => {
    it('should create a valid quiz successfully', async () => {
      const args = {
        topic: 'Mathematics',
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
            explanation: 'Two plus two equals four',
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('test-quiz-id-123');
      expect(result.toolType).toBe('quiz');
      expect(result.data).toBeDefined();

      const data = result.data as any;
      expect(data.topic).toBe('Mathematics');
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].question).toBe('What is 2 + 2?');
      expect(data.questions[0].options).toEqual(['3', '4', '5', '6']);
      expect(data.questions[0].correctIndex).toBe(1);
      expect(data.questions[0].explanation).toBe('Two plus two equals four');
    });

    it('should normalize whitespace in topic and questions', async () => {
      const args = {
        topic: '  Mathematics  ',
        questions: [
          {
            question: '  What is 2 + 2?  ',
            options: ['  3  ', '  4  ', '  5  ', '  6  '],
            correctIndex: 1,
            explanation: '  Basic math  ',
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('Mathematics');
      expect(data.questions[0].question).toBe('What is 2 + 2?');
      expect(data.questions[0].options).toEqual(['3', '4', '5', '6']);
      expect(data.questions[0].explanation).toBe('Basic math');
    });

    it('should handle questions without explanation', async () => {
      const args = {
        topic: 'Science',
        questions: [
          {
            question: 'What is H2O?',
            options: ['Water', 'Oxygen', 'Hydrogen', 'Carbon'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].explanation).toBeUndefined();
    });

    it('should handle multiple questions', async () => {
      const args = {
        topic: 'General Knowledge',
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
          },
          {
            question: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correctIndex: 1,
          },
          {
            question: 'What color is the sky?',
            options: ['Red', 'Blue', 'Green', 'Yellow'],
            correctIndex: 1,
            explanation: 'The sky appears blue due to Rayleigh scattering',
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions).toHaveLength(3);
      expect(data.questions[0].question).toBe('What is 2 + 2?');
      expect(data.questions[1].question).toBe('What is the capital of France?');
      expect(data.questions[2].question).toBe('What color is the sky?');
    });
  });

  describe('Quiz Validation Errors', () => {
    it('should return error when topic is missing', async () => {
      const args = {
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.toolId).toBe('test-quiz-id-123');
      expect(result.toolType).toBe('quiz');
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error when topic is not a string', async () => {
      const args = {
        topic: 123,
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error when topic is empty string', async () => {
      const args = {
        topic: '',
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error when questions array is empty', async () => {
      const args = {
        topic: 'Test Topic',
        questions: [],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one question is required');
    });

    it('should return error when question text is missing', async () => {
      const args = {
        topic: 'Test Topic',
        questions: [
          {
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question 1: question text is required');
    });

    it('should return error when options are insufficient', async () => {
      const args = {
        topic: 'Test Topic',
        questions: [
          {
            question: 'What is X?',
            options: ['Only one option'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question 1: at least 2 options are required');
    });

    it('should return error when correctIndex is invalid', async () => {
      const args = {
        topic: 'Test Topic',
        questions: [
          {
            question: 'What is X?',
            options: ['A', 'B'],
            correctIndex: 5,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question 1: correctIndex must be a valid index');
    });

    it('should return error when correctIndex is negative', async () => {
      const args = {
        topic: 'Test Topic',
        questions: [
          {
            question: 'What is X?',
            options: ['A', 'B'],
            correctIndex: -1,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Question 1: correctIndex must be a valid index');
    });
  });

  describe('Multiple Choice Handling', () => {
    it('should accept exactly 2 options', async () => {
      const args = {
        topic: 'True/False',
        questions: [
          {
            question: 'Is the sky blue?',
            options: ['True', 'False'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].options).toHaveLength(2);
    });

    it('should accept 4 options (standard multiple choice)', async () => {
      const args = {
        topic: 'Standard Quiz',
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['1', '2', '3', '4'],
            correctIndex: 3,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].options).toHaveLength(4);
    });

    it('should accept more than 4 options', async () => {
      const args = {
        topic: 'Extended Quiz',
        questions: [
          {
            question: 'Choose the prime number',
            options: ['1', '2', '4', '6', '8', '9'],
            correctIndex: 1,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].options).toHaveLength(6);
    });

    it('should validate correctIndex is within options bounds', async () => {
      const args = {
        topic: 'Bounds Test',
        questions: [
          {
            question: 'Test question',
            options: ['A', 'B', 'C'],
            correctIndex: 2, // Last valid index
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].correctIndex).toBe(2);
    });

    it('should handle correctIndex at zero', async () => {
      const args = {
        topic: 'Index Zero Test',
        questions: [
          {
            question: 'Test question',
            options: ['Correct', 'Wrong', 'Wrong'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].correctIndex).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long question text', async () => {
      const longQuestion = 'A'.repeat(1000);
      const args = {
        topic: 'Long Text Test',
        questions: [
          {
            question: longQuestion,
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].question).toBe(longQuestion);
    });

    it('should handle special characters in topic', async () => {
      const args = {
        topic: 'Tëst Tópïc with 中文 & émojis 🎓',
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('Tëst Tópïc with 中文 & émojis 🎓');
    });

    it('should handle special characters in questions and options', async () => {
      const args = {
        topic: 'Special Characters',
        questions: [
          {
            question: 'What is <HTML> & "quotes"?',
            options: ['<tag>', '"quoted"', "&amp;", 'Normal'],
            correctIndex: 0,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].question).toBe('What is <HTML> & "quotes"?');
      expect(data.questions[0].options[0]).toBe('<tag>');
    });

    it('should handle undefined explanation gracefully', async () => {
      const args = {
        topic: 'No Explanation',
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B'],
            correctIndex: 0,
            explanation: undefined,
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].explanation).toBeUndefined();
    });

    it('should trim whitespace-only explanation', async () => {
      const args = {
        topic: 'Whitespace Test',
        questions: [
          {
            question: 'Test?',
            options: ['A', 'B'],
            correctIndex: 0,
            explanation: '   ',
          },
        ],
      };

      const result = await requireQuizHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.questions[0].explanation).toBe('');
    });
  });
});
