import { z } from 'zod';

export const AdaptiveSignalTypeSchema = z.enum([
  'question',
  'repeat_request',
  'frustration',
  'response_time_ms',
  'quiz_result',
  'flashcard_rating',
  'summary_request',
]);

export const AdaptiveSignalSourceSchema = z.enum([
  'chat',
  'voice',
  'quiz',
  'flashcard',
  'summary',
  'study-kit',
]);

export const AdaptiveSignalSchema = z.object({
  type: AdaptiveSignalTypeSchema,
  source: AdaptiveSignalSourceSchema,
  subject: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  value: z.number().optional(),
  rating: z.enum(['again', 'hard', 'good', 'easy']).optional(),
  responseTimeMs: z.number().int().min(0).optional(),
  baselineDifficulty: z.number().min(1).max(5).optional(),
  mode: z.enum(['manual', 'guided', 'balanced', 'automatic']).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();

export const AdaptiveSignalsPayloadSchema = z.object({
  signals: z.array(AdaptiveSignalSchema).min(1),
}).strict();

export const AdaptiveContextQuerySchema = z.object({
  subject: z.string().optional(),
  baselineDifficulty: z.coerce.number().min(1).max(5).optional(),
  pragmatic: z.enum(['true', 'false']).optional(),
  source: z.enum(['chat', 'voice', 'quiz', 'flashcard', 'summary', 'study-kit']).optional(),
}).strict();
