/**
 * Quiz Tool Plugin
 * Creates interactive quizzes with multiple choice questions
 * Integrates with maestro tools system via plugin architecture
 */

import { z } from 'zod';
import { ToolPlugin, ToolCategory, Permission } from '../plugin/types';
import type { ToolContext, ToolResult } from '@/types/tools';
import { validateQuestions } from '../handlers/quiz-handler';

/**
 * Zod schema for quiz plugin input validation
 * Supports topic-based quiz generation with difficulty levels
 */
const QuizPluginSchema = z.object({
  topic: z
    .string()
    .min(1, 'Topic is required')
    .max(500, 'Topic must be under 500 characters'),
  questionCount: z
    .number()
    .int()
    .min(1, 'At least 1 question required')
    .max(50, 'Maximum 50 questions'),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .default('intermediate'),
  questions: z
    .array(
      z.object({
        question: z.string().min(1, 'Question text is required'),
        options: z
          .array(z.string())
          .min(2, 'At least 2 options are required'),
        correctIndex: z
          .number()
          .int()
          .min(0, 'Valid answer index required'),
        explanation: z.string().optional(),
      })
    )
    .min(1, 'At least one question is required'),
});

/**
 * Quiz plugin handler
 * Validates input and creates quiz structure
 */
async function handleQuizPlugin(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    // Validate schema
    const validated = QuizPluginSchema.parse(args);

    // Validate questions structure
    const validation = validateQuestions(validated.questions);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid quiz structure',
      };
    }

    // Normalize questions
    const normalizedQuestions = validated.questions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correctIndex: q.correctIndex,
      explanation: q.explanation?.trim(),
    }));

    // Return quiz data structure
    return {
      success: true,
      data: {
        topic: validated.topic.trim(),
        difficulty: validated.difficulty,
        questionCount: validated.questions.length,
        questions: normalizedQuestions,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz creation failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Quiz Tool Plugin Definition
 * Enables maestri to create assessment tools via plugin system
 * Fulfills F-02 (Maestri can create tools) and F-03 (Tools integrate with system)
 */
export const quizPlugin: ToolPlugin = {
  id: 'create_quiz',
  name: 'Quiz',
  category: ToolCategory.ASSESSMENT,
  schema: QuizPluginSchema,
  handler: handleQuizPlugin,

  // Voice interaction configuration
  voicePrompt: {
    template: 'Vuoi creare un quiz su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare un quiz?',
  },
  voiceFeedback: {
    template: 'Ho creato un quiz con {questionCount} domande!',
    requiresContext: ['questionCount'],
    fallback: 'Quiz creato con successo!',
  },
  voiceEnabled: true,

  // Trigger phrases for voice and text detection
  triggers: [
    'quiz',
    'crea quiz',
    'verifica',
    'test',
    'domande',
    'assessment',
    'esame',
  ],

  // Execution requirements
  prerequisites: [],
  permissions: [Permission.WRITE_CONTENT, Permission.READ_CONVERSATION],
};

export default quizPlugin;
