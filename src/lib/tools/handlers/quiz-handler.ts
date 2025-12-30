// ============================================================================
// QUIZ HANDLER
// Creates interactive quizzes with multiple choice questions
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { QuizData, QuizQuestion, ToolExecutionResult } from '@/types/tools';

/**
 * Validate quiz questions structure
 */
function validateQuestions(
  questions: unknown[]
): { valid: boolean; error?: string } {
  if (!questions || questions.length === 0) {
    return { valid: false, error: 'At least one question is required' };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Partial<QuizQuestion>;

    if (!q.question || typeof q.question !== 'string') {
      return {
        valid: false,
        error: `Question ${i + 1}: question text is required`,
      };
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      return {
        valid: false,
        error: `Question ${i + 1}: at least 2 options are required`,
      };
    }

    if (
      typeof q.correctIndex !== 'number' ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.options.length
    ) {
      return {
        valid: false,
        error: `Question ${i + 1}: correctIndex must be a valid index`,
      };
    }
  }

  return { valid: true };
}

/**
 * Register the quiz handler
 */
registerToolHandler('create_quiz', async (args): Promise<ToolExecutionResult> => {
  const { topic, questions } = args as {
    topic: string;
    questions: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }>;
  };

  // Validate topic
  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'quiz',
      error: 'Topic is required and must be a string',
    };
  }

  // Validate questions
  const validation = validateQuestions(questions);
  if (!validation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'quiz',
      error: validation.error,
    };
  }

  // Normalize questions structure
  const normalizedQuestions: QuizQuestion[] = questions.map((q) => ({
    question: q.question.trim(),
    options: q.options.map((o) => o.trim()),
    correctIndex: q.correctIndex,
    explanation: q.explanation?.trim(),
  }));

  const data: QuizData = {
    topic: topic.trim(),
    questions: normalizedQuestions,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'quiz',
    data,
  };
});

export { validateQuestions };
