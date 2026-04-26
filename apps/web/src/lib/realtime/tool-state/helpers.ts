// ============================================================================
// TOOL STATE HELPERS
// Helper functions for tool state management (cleanup, initialization, etc.)
// ============================================================================

import { logger } from '@/lib/logger';
import type { ToolType } from '../tool-events';
import type { ToolContent, ToolState } from './types';
import { activeTools, sessionTools } from './store';

// #90: Schedule automatic cleanup for terminal states to prevent memory leaks
// Default: cleanup after 5 minutes for terminal states
const TERMINAL_STATE_TTL_MS = 5 * 60 * 1000;

/**
 * Schedule automatic cleanup of a tool from memory after it reaches terminal state
 */
export function scheduleToolCleanup(toolId: string, sessionId: string): void {
  setTimeout(() => {
    const state = activeTools.get(toolId);
    // Only delete if still in terminal state (might have been recreated)
    if (state && ['completed', 'error', 'cancelled'].includes(state.status)) {
      activeTools.delete(toolId);
      const sessionToolSet = sessionTools.get(sessionId);
      if (sessionToolSet) {
        sessionToolSet.delete(toolId);
        if (sessionToolSet.size === 0) {
          sessionTools.delete(sessionId);
        }
      }
      logger.debug('Tool state auto-cleaned', { toolId });
    }
  }, TERMINAL_STATE_TTL_MS);
}

/**
 * Initialize empty content structure based on tool type
 */
export function initializeContent(type: ToolType): Partial<ToolContent> {
  switch (type) {
    case 'mindmap':
      return { centralTopic: '', nodes: [] };
    case 'flashcard':
      return { cards: [] };
    case 'quiz':
      return { questions: [] };
    case 'summary':
      return { sections: [] };
    case 'timeline':
      return { events: [] };
    case 'diagram':
      return { type: 'flowchart', mermaidCode: '' };
    default:
      return {};
  }
}

/**
 * Check if a tool state is in a terminal state
 */
export function isTerminalState(status: ToolState['status']): boolean {
  return ['completed', 'error', 'cancelled'].includes(status);
}
