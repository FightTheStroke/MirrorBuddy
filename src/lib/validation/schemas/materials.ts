// ============================================================================
// Validation schemas for /api/materials
// Issue #92: Input validation for API routes
// ============================================================================

import { z } from 'zod';

// Valid material types (must match MaterialType in materials route)
const MATERIAL_TYPES = [
  'mindmap',
  'quiz',
  'flashcard',
  'demo',
  'webcam',
  'pdf',
  'search',
  'diagram',
  'timeline',
  'summary',
  'formula',
  'chart',
] as const;

// Schema for POST /api/materials (create material)
export const CreateMaterialSchema = z.object({
  toolId: z.string().min(1).max(255),
  toolType: z.enum(MATERIAL_TYPES),
  title: z.string().min(1).max(500),
  content: z.record(z.unknown()),
  maestroId: z.string().max(100).optional(),
  sessionId: z.string().max(100).optional(),
  subject: z.string().max(200).optional(),
  preview: z.string().max(1000).optional(),
  collectionId: z.string().optional(),
  tagIds: z.array(z.string()).max(50).optional(),
  // userId is handled via cookie, but allow in body for backwards compatibility
  userId: z.string().optional(),
}).strict();

// Schema for PATCH /api/materials (update material)
export const UpdateMaterialSchema = z.object({
  toolId: z.string().min(1).max(255),
  title: z.string().min(1).max(500).optional(),
  content: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  userRating: z.number().int().min(1).max(5).optional(),
  isBookmarked: z.boolean().optional(),
  collectionId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).max(50).optional(),
}).strict();
