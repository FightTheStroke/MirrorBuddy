/**
 * Saved tools helpers
 */

import type { ToolType } from '@/types/tools';
import type { GetToolsFilter } from '@/lib/tools/tool-persistence-utils';
import { VALID_TOOL_TYPES, VALID_PATCH_ACTIONS, type PatchAction } from './constants';

/**
 * Build filter object from query parameters
 */
export function buildGetToolsFilter(searchParams: URLSearchParams): GetToolsFilter {
  const filter: GetToolsFilter = {};

  const type = searchParams.get('type');
  if (type && VALID_TOOL_TYPES.includes(type as ToolType)) {
    filter.type = type as ToolType;
  }

  const maestroId = searchParams.get('maestroId');
  if (maestroId) {
    filter.maestroId = maestroId;
  }

  const bookmarked = searchParams.get('bookmarked');
  if (bookmarked === 'true') {
    filter.isBookmarked = true;
  }

  const limit = searchParams.get('limit');
  if (limit) {
    filter.limit = Math.min(parseInt(limit, 10), 100);
  }

  const offset = searchParams.get('offset');
  if (offset) {
    filter.offset = parseInt(offset, 10);
  }

  return filter;
}

/**
 * Validate POST request body for saving a tool
 */
export function validateSaveToolInput(body: unknown): {
  valid: boolean;
  error?: string;
  data?: {
    userId: string;
    type: ToolType;
    title: string;
    topic?: string;
    content: unknown;
    maestroId?: string;
    conversationId?: string;
    sessionId?: string;
  };
} {
  const payload = body as Record<string, unknown>;
  const { userId, type, title, topic, content, maestroId, conversationId, sessionId } = payload;

  if (!userId || !type || !title || !content) {
    return {
      valid: false,
      error: 'Missing required fields: userId, type, title, content',
    };
  }

  if (!VALID_TOOL_TYPES.includes(type as ToolType)) {
    return {
      valid: false,
      error: `Invalid tool type: ${type}`,
    };
  }

  return {
    valid: true,
    data: {
      userId: String(userId),
      type: type as ToolType,
      title: String(title),
      topic: topic ? String(topic) : undefined,
      content,
      maestroId: maestroId ? String(maestroId) : undefined,
      conversationId: conversationId ? String(conversationId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
    },
  };
}

/**
 * Validate PATCH request body
 */
export function validatePatchToolInput(body: unknown): {
  valid: boolean;
  error?: string;
  data?: {
    userId: string;
    toolId: string;
    action: PatchAction;
    rating?: number;
  };
} {
  const payload = body as Record<string, unknown>;
  const { userId, toolId, action, rating } = payload;

  if (!userId || !toolId || !action) {
    return {
      valid: false,
      error: 'Missing required fields: userId, toolId, action',
    };
  }

  if (!VALID_PATCH_ACTIONS.includes(action as PatchAction)) {
    return {
      valid: false,
      error: `Invalid action: ${action}`,
    };
  }

  if (action === 'rate') {
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return {
        valid: false,
        error: 'Rating must be a number between 1 and 5',
      };
    }
  }

  return {
    valid: true,
    data: {
      userId: String(userId),
      toolId: String(toolId),
      action: action as PatchAction,
      rating: rating ? Number(rating) : undefined,
    },
  };
}

/**
 * Validate DELETE request body
 */
export function validateDeleteToolInput(body: unknown): {
  valid: boolean;
  error?: string;
  data?: {
    userId: string;
    toolId: string;
  };
} {
  const payload = body as Record<string, unknown>;
  const { userId, toolId } = payload;

  if (!userId || !toolId) {
    return {
      valid: false,
      error: 'Missing required fields: userId, toolId',
    };
  }

  return {
    valid: true,
    data: {
      userId: String(userId),
      toolId: String(toolId),
    },
  };
}
