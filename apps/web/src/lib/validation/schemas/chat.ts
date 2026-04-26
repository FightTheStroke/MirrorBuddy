// ============================================================================
// VALIDATION SCHEMA: Chat API
// ============================================================================

import { z } from 'zod';
import {
  MaestroId,
  VALIDATION_LIMITS,
  createArraySchema,
} from '../common';

// ============================================================================
// Message schema
// ============================================================================

/**
 * Chat message role enum
 */
export const ChatMessageRole = z.enum(['user', 'assistant', 'system']);

/**
 * Individual chat message schema
 */
export const ChatMessageSchema = z.object({
  role: ChatMessageRole,
  content: z.string().min(1, 'Message content cannot be empty').max(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH),
});

// ============================================================================
// Tool type schema
// ============================================================================

/**
 * Requested tool type enum - tools that can be requested in chat
 */
export const RequestedToolType = z.enum([
  'mindmap',
  'quiz',
  'flashcard',
  'demo',
  'summary',
  'search',
  'pdf',
  'webcam',
  'homework',
  'study-kit',
]);

// ============================================================================
// Chat request schema
// ============================================================================

/**
 * POST /api/chat request body schema
 */
export const ChatRequestSchema = z.object({
  messages: createArraySchema(ChatMessageSchema, {
    min: VALIDATION_LIMITS.MIN_MESSAGES,
    max: VALIDATION_LIMITS.MAX_MESSAGES,
    errorMessage: `Messages array must contain between ${VALIDATION_LIMITS.MIN_MESSAGES} and ${VALIDATION_LIMITS.MAX_MESSAGES} messages`,
  }),
  systemPrompt: z.string().min(1, 'System prompt cannot be empty').max(VALIDATION_LIMITS.EXTRA_LONG_STRING_MAX),
  maestroId: MaestroId,
  enableTools: z.boolean().optional(),
  enableMemory: z.boolean().optional(),
  requestedTool: RequestedToolType.optional(),
}).strict();

// Export types
export type ChatMessageRole = z.infer<typeof ChatMessageRole>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type RequestedToolType = z.infer<typeof RequestedToolType>;
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
