// ============================================================================
// Validation schemas for conversations API routes
// ============================================================================

import { z } from 'zod';

/**
 * Schema for creating a new conversation
 * Used in POST /api/conversations
 */
export const ConversationCreateSchema = z.object({
  maestroId: z.string().min(1, 'maestroId is required'),
  title: z.string().max(200).optional(),
}).strict();

export type ConversationCreateInput = z.infer<typeof ConversationCreateSchema>;
