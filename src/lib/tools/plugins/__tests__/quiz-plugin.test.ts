/**
 * Tests for Quiz Plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { quizPlugin } from '../quiz-plugin';
import { ToolCategory, Permission } from '../../plugin/types';

// Extract schema for testing
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

describe('quiz-plugin', () => {
  describe('plugin configuration', () => {
    it('has correct id', () => {
      expect(quizPlugin.id).toBe('create_quiz');
    });

    it('has correct name', () => {
      expect(quizPlugin.name).toBe('Quiz');
    });

    it('has correct category', () => {
      expect(quizPlugin.category).toBe(ToolCategory.ASSESSMENT);
    });

    it('has required permissions', () => {
      expect(quizPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(quizPlugin.permissions).toContain(Permission.READ_CONVERSATION);
    });

    it('has voice triggers', () => {
      expect(quizPlugin.triggers).toContain('quiz');
      expect(quizPlugin.triggers).toContain('crea quiz');
      expect(quizPlugin.triggers).toContain('test');
    });

    it('is voice enabled', () => {
      expect(quizPlugin.voiceEnabled).toBe(true);
    });

    it('has voice prompt with topic placeholder', () => {
      expect(quizPlugin.voicePrompt?.template).toContain('{topic}');
      expect(quizPlugin.voicePrompt?.requiresContext).toContain('topic');
    });

    it('has voice feedback with questionCount', () => {
      expect(quizPlugin.voiceFeedback?.template).toContain('{questionCount}');
      expect(quizPlugin.voiceFeedback?.requiresContext).toContain('questionCount');
    });

    it('has no prerequisites', () => {
      expect(quizPlugin.prerequisites).toEqual([]);
    });

    it('has handler function', () => {
      expect(typeof quizPlugin.handler).toBe('function');
    });
  });

  describe('schema validation', () => {
    const validQuestion = {
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      explanation: 'Basic arithmetic',
    };

    it('accepts valid input', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Mathematics',
        questionCount: 5,
        difficulty: 'beginner',
        questions: [validQuestion],
      });
      expect(result.success).toBe(true);
    });

    it('applies default difficulty', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        questions: [validQuestion],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty).toBe('intermediate');
      }
    });

    it('rejects empty topic', () => {
      const result = QuizPluginSchema.safeParse({
        topic: '',
        questionCount: 1,
        questions: [validQuestion],
      });
      expect(result.success).toBe(false);
    });

    it('rejects topic exceeding max length', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'a'.repeat(501),
        questionCount: 1,
        questions: [validQuestion],
      });
      expect(result.success).toBe(false);
    });

    it('rejects questionCount below minimum', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 0,
        questions: [validQuestion],
      });
      expect(result.success).toBe(false);
    });

    it('rejects questionCount above maximum', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 51,
        questions: [validQuestion],
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid difficulty levels', () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];
      for (const difficulty of difficulties) {
        const result = QuizPluginSchema.safeParse({
          topic: 'Test',
          questionCount: 1,
          difficulty,
          questions: [validQuestion],
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid difficulty', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        difficulty: 'expert',
        questions: [validQuestion],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty questions array', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        questions: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects question without text', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        questions: [{ ...validQuestion, question: '' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects question with less than 2 options', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        questions: [{ ...validQuestion, options: ['Only one'] }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative correctIndex', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        questions: [{ ...validQuestion, correctIndex: -1 }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts question without explanation', () => {
      const questionNoExplanation = {
        question: 'Test?',
        options: ['A', 'B'],
        correctIndex: 0,
      };
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 1,
        questions: [questionNoExplanation],
      });
      expect(result.success).toBe(true);
    });

    it('accepts multiple questions', () => {
      const result = QuizPluginSchema.safeParse({
        topic: 'Test',
        questionCount: 3,
        questions: [
          validQuestion,
          { ...validQuestion, question: 'Q2' },
          { ...validQuestion, question: 'Q3' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('voice triggers', () => {
    it('includes Italian triggers', () => {
      expect(quizPlugin.triggers).toContain('quiz');
      expect(quizPlugin.triggers).toContain('crea quiz');
      expect(quizPlugin.triggers).toContain('verifica');
      expect(quizPlugin.triggers).toContain('domande');
      expect(quizPlugin.triggers).toContain('esame');
    });

    it('includes English triggers', () => {
      expect(quizPlugin.triggers).toContain('test');
      expect(quizPlugin.triggers).toContain('assessment');
    });
  });
});
