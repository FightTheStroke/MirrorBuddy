// ============================================================================
// Validation schemas for /api/study-kit
// Issue #92: Input validation for API routes
// ============================================================================

import { z } from 'zod';

// Valid study kit status values (must match StudyKit status in database)
const STUDY_KIT_STATUSES = ['processing', 'ready', 'error'] as const;

// Schema for GET /api/study-kit (query params)
export const ListStudyKitsQuerySchema = z.object({
  status: z.enum(STUDY_KIT_STATUSES).optional(),
  subject: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).strict();

// Schema for POST /api/study-kit/upload (form data)
export const UploadStudyKitSchema = z.object({
  title: z.string().min(1).max(500),
  subject: z.string().max(200).optional(),
  // file validation handled separately in route (multipart/form-data)
}).strict();
