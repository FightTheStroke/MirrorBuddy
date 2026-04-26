// ============================================================================
// TOOL STATE OPERATIONS
// Create, update, complete, fail, cancel tool states
// ============================================================================

import { logger } from '@/lib/logger';
import type { ToolType } from '../tool-events';
import type { ToolContent, ToolState } from './types';
import {
  scheduleToolCleanup,
  initializeContent,
} from './helpers';
import { activeTools, sessionTools } from './store';

// Re-export stores for backward compatibility
export { activeTools, sessionTools } from './store';

/**
 * Create a new tool state
 */
export function createToolState(params: {
  id: string;
  type: ToolType;
  sessionId: string;
  maestroId: string;
  title: string;
  subject?: string;
}): ToolState {
  const now = Date.now();

  const state: ToolState = {
    id: params.id,
    type: params.type,
    status: 'initializing',
    sessionId: params.sessionId,
    maestroId: params.maestroId,
    title: params.title,
    subject: params.subject,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    chunksReceived: 0,
    content: initializeContent(params.type),
    rawChunks: [],
  };

  // Store in maps
  activeTools.set(params.id, state);

  if (!sessionTools.has(params.sessionId)) {
    sessionTools.set(params.sessionId, new Set());
  }
  sessionTools.get(params.sessionId)!.add(params.id);

  logger.info('Tool state created', {
    toolId: params.id,
    type: params.type,
    sessionId: params.sessionId,
    maestroId: params.maestroId,
  });

  return state;
}

/**
 * Update tool state with new chunk
 */
export function updateToolState(
  toolId: string,
  update: {
    chunk?: string;
    progress?: number;
    content?: Partial<ToolContent>;
  }
): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for update', { toolId });
    return null;
  }

  // Update status if was initializing
  if (state.status === 'initializing') {
    state.status = 'building';
  }

  // Apply updates
  state.updatedAt = Date.now();

  if (update.chunk) {
    if (!state.rawChunks) {
      state.rawChunks = [];
    }
    state.rawChunks.push(update.chunk);
    state.chunksReceived++;
  }

  if (update.progress !== undefined) {
    state.progress = Math.min(100, Math.max(0, update.progress));
  }

  if (update.content) {
    state.content = { ...state.content, ...update.content };
  }

  activeTools.set(toolId, state);

  logger.debug('Tool state updated', {
    toolId,
    progress: state.progress,
    chunksReceived: state.chunksReceived,
  });

  return state;
}

/**
 * Mark tool as completed
 */
export function completeToolState(
  toolId: string,
  finalContent?: ToolContent
): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for completion', { toolId });
    return null;
  }

  state.status = 'completed';
  state.progress = 100;
  state.updatedAt = Date.now();

  if (finalContent) {
    state.content = finalContent;
  }

  activeTools.set(toolId, state);

  // #90: Schedule cleanup to prevent memory leak
  scheduleToolCleanup(toolId, state.sessionId);

  logger.info('Tool state completed', {
    toolId,
    type: state.type,
    chunksReceived: state.chunksReceived,
    duration: state.updatedAt - state.createdAt,
  });

  return state;
}

/**
 * Mark tool as failed
 */
export function failToolState(
  toolId: string,
  errorMessage: string
): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for failure', { toolId });
    return null;
  }

  state.status = 'error';
  state.errorMessage = errorMessage;
  state.updatedAt = Date.now();

  activeTools.set(toolId, state);

  // #90: Schedule cleanup to prevent memory leak
  scheduleToolCleanup(toolId, state.sessionId);

  logger.error('Tool state failed', {
    toolId,
    type: state.type,
    errorDetails: errorMessage,
  });

  return state;
}

/**
 * Cancel tool creation
 */
export function cancelToolState(toolId: string): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for cancellation', { toolId });
    return null;
  }

  state.status = 'cancelled';
  state.updatedAt = Date.now();

  activeTools.set(toolId, state);

  // #90: Schedule cleanup to prevent memory leak
  scheduleToolCleanup(toolId, state.sessionId);

  logger.info('Tool state cancelled', {
    toolId,
    type: state.type,
    progress: state.progress,
  });

  return state;
}
