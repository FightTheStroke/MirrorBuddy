// ============================================================================
// VALIDATION SCHEMA: Parent-Professor Conversations
// ============================================================================

import { z } from 'zod';
import {
  NonEmptyString,
  UuidString,
  MaestroId,
  VALIDATION_LIMITS,
} from '../common';

// ============================================================================
// Parent chat schema
// ============================================================================

/**
 * POST /api/parent-professor request body schema
 */
export const ParentChatSchema = z.object({
  maestroId: z.union([MaestroId, z.literal('all')]),
  studentId: UuidString,
  studentName: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  message: NonEmptyString(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH),
  conversationId: UuidString.optional(),
  maestroSystemPrompt: NonEmptyString(VALIDATION_LIMITS.EXTRA_LONG_STRING_MAX),
  maestroDisplayName: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
}).strict();

// ============================================================================
// Export types
// ============================================================================

export type ParentChatInput = z.infer<typeof ParentChatSchema>;
