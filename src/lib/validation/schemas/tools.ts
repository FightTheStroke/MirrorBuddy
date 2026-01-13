// ============================================================================
// VALIDATION SCHEMA: Tools API
// ============================================================================

import { z } from 'zod';
import {
  MaestroId,
  NonEmptyString,
  OptionalString,
  VALIDATION_LIMITS,
} from '../common';

// ============================================================================
// Tool type enum
// ============================================================================

/**
 * Valid tool types that can be created and saved
 * Combines types from both realtime and saved tools
 */
export const ToolTypeEnum = z.enum([
  'mindmap',
  'flashcards',
  'quiz',
  'summary',
  'timeline',
  'diagram',
  'demo',
  'search',
  'formula',
  'chart',
  'webcam',
  'pdf',
  'homework',
]);

// ============================================================================
// Tool action enum
// ============================================================================

/**
 * Valid actions for PATCH /api/tools/saved
 */
export const ToolActionEnum = z.enum(['rate', 'bookmark', 'view']);

// ============================================================================
// Session ID validation
// ============================================================================

/**
 * Session ID format: alphanumeric, dash, underscore (1-64 chars)
 */
export const SessionId = z.string().regex(
  /^[a-zA-Z0-9_-]{1,64}$/,
  'Session ID must be alphanumeric with dashes/underscores (1-64 chars)'
);

// ============================================================================
// Create tool schema (POST /api/tools/create)
// ============================================================================

/**
 * POST /api/tools/create request body schema
 * Creates a new tool from voice command
 */
export const CreateToolSchema = z.object({
  sessionId: SessionId,
  maestroId: MaestroId,
  toolType: ToolTypeEnum,
  title: NonEmptyString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  subject: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  content: z.record(z.string(), z.unknown()),
}).strict();

// ============================================================================
// Save tool schema (POST /api/tools/saved)
// ============================================================================

/**
 * POST /api/tools/saved request body schema
 * Saves a new tool to user's archive
 */
export const SaveToolSchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  type: ToolTypeEnum,
  title: NonEmptyString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  topic: OptionalString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  content: z.record(z.string(), z.unknown()),
  maestroId: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  conversationId: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  sessionId: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
}).strict();

// ============================================================================
// Get tools query params schema (GET /api/tools/saved)
// ============================================================================

/**
 * GET /api/tools/saved query parameters schema
 */
export const GetToolsQuerySchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  type: ToolTypeEnum.optional(),
  maestroId: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  bookmarked: z.enum(['true', 'false']).optional(),
  stats: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
  offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
}).strict();

// ============================================================================
// Update tool schema (PATCH /api/tools/saved)
// ============================================================================

/**
 * PATCH /api/tools/saved request body schema
 * Updates tool rating, bookmark, or view count
 */
export const UpdateToolSchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  toolId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  action: ToolActionEnum,
  rating: z.number().int().min(1).max(5).optional(),
}).strict().refine(
  (data) => {
    // If action is 'rate', rating must be provided
    if (data.action === 'rate') {
      return data.rating !== undefined;
    }
    return true;
  },
  {
    message: 'Rating is required when action is "rate"',
    path: ['rating'],
  }
);

// ============================================================================
// Export types
// ============================================================================

export type ToolType = z.infer<typeof ToolTypeEnum>;
export type ToolAction = z.infer<typeof ToolActionEnum>;
export type CreateToolInput = z.infer<typeof CreateToolSchema>;
export type SaveToolInput = z.infer<typeof SaveToolSchema>;
export type GetToolsQueryInput = z.infer<typeof GetToolsQuerySchema>;
export type UpdateToolInput = z.infer<typeof UpdateToolSchema>;
