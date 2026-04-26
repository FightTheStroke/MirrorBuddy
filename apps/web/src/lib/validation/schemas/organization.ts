// ============================================================================
// VALIDATION SCHEMA: Organization API (Tags & Collections)
// ============================================================================

import { z } from 'zod';
import { NonEmptyString, OptionalString, NonNegativeInt } from '../common';

// ============================================================================
// Common field schemas
// ============================================================================

/**
 * Hex color code (e.g., #FF5733)
 */
const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)');

/**
 * CUID string for Prisma IDs
 */
const CuidString = z.string().cuid();

// ============================================================================
// Tag schemas
// ============================================================================

/**
 * POST /api/tags request body schema
 */
export const CreateTagSchema = z.object({
  name: NonEmptyString(50).transform(s => s.toLowerCase().trim()),
  color: HexColor.optional(),
}).strict();

/**
 * PUT /api/tags/[id] request body schema
 */
export const UpdateTagSchema = z.object({
  name: NonEmptyString(50).transform(s => s.toLowerCase().trim()).optional(),
  color: HexColor.nullable().optional(),
}).strict();

// ============================================================================
// Collection schemas
// ============================================================================

/**
 * POST /api/collections request body schema
 */
export const CreateCollectionSchema = z.object({
  name: NonEmptyString(100),
  description: OptionalString(500),
  color: HexColor.optional(),
  icon: OptionalString(50),
  parentId: CuidString.optional(),
  sortOrder: NonNegativeInt.optional(),
}).strict();

/**
 * PUT /api/collections/[id] request body schema
 */
export const UpdateCollectionSchema = z.object({
  name: NonEmptyString(100).optional(),
  description: OptionalString(500),
  color: HexColor.optional(),
  icon: OptionalString(50),
  parentId: CuidString.nullable().optional(),
  sortOrder: NonNegativeInt.optional(),
}).strict();

// Export types
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;
