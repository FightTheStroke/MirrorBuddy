// ============================================================================
// Validation schemas for conversations API routes
// ============================================================================

import { z } from 'zod';

/**
 * Schema for creating a new conversation
 * Used in POST /api/conversations
 */
export const ConversationCreateSchema = z
  .object({
    maestroId: z.string().min(1, 'maestroId is required'),
    title: z.string().max(200).optional(),
  })
  .strict();

export type ConversationCreateInput = z.infer<typeof ConversationCreateSchema>;

// ----------------------------------------------------------------------------
// Response contract for GET /api/conversations
// The route answers with an `{ items, pagination }` envelope and JSON-decodes
// `topics`/`keyFacts` before serialising. Rows written by other paths can still
// carry the raw JSON strings stored in the database, so both shapes are decoded.
// ----------------------------------------------------------------------------

export const ConversationKeyFactsSchema = z
  .object({
    decisions: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
    learned: z.array(z.string()).optional(),
  })
  .loose();

export const ConversationTopicsSchema = z.array(z.string());

export const ConversationListItemSchema = z
  .object({
    id: z.string(),
    maestroId: z.string(),
    title: z.string().nullish(),
    summary: z.string().nullish(),
    keyFacts: z.unknown(),
    topics: z.unknown(),
    lastMessage: z.string().nullish(),
  })
  .loose();

export const ConversationListPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const ConversationListResponseSchema = z.object({
  items: z.array(ConversationListItemSchema),
  pagination: ConversationListPaginationSchema,
});

export type ConversationKeyFacts = z.infer<typeof ConversationKeyFactsSchema>;
export type ConversationListItem = z.infer<typeof ConversationListItemSchema>;
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;

export type DecodeResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Summarise validation issues as `path: code` pairs only.
 * Values are never included, so decode diagnostics stay free of user content.
 */
function summarizeIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.code}`)
    .join('; ');
}

/** Decode the GET /api/conversations envelope. Never throws. */
export function decodeConversationListResponse(
  payload: unknown,
): DecodeResult<ConversationListResponse> {
  const parsed = ConversationListResponseSchema.safeParse(payload);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, error: summarizeIssues(parsed.error.issues) };
}

function decodeJsonBackedField<T>(
  value: unknown,
  schema: z.ZodType<T>,
): DecodeResult<T | undefined> {
  if (value === null || value === undefined) {
    return { ok: true, data: undefined };
  }

  let candidate = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return { ok: false, error: 'invalid_json' };
    }
    if (candidate === null) {
      return { ok: true, data: undefined };
    }
  }

  const parsed = schema.safeParse(candidate);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, error: summarizeIssues(parsed.error.issues) };
}

/** Decode `keyFacts`, accepting the parsed object or the stored JSON string. */
export function decodeConversationKeyFacts(
  value: unknown,
): DecodeResult<ConversationKeyFacts | undefined> {
  return decodeJsonBackedField(value, ConversationKeyFactsSchema);
}

/** Decode `topics`, accepting the parsed array or the stored JSON string. */
export function decodeConversationTopics(value: unknown): DecodeResult<string[] | undefined> {
  return decodeJsonBackedField(value, ConversationTopicsSchema);
}
