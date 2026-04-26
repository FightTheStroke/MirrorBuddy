// ============================================================================
// TOOL STATE QUERIES
// Get, list, filter, and aggregate tool states
// ============================================================================

import { logger } from '@/lib/logger';
import type { ToolType } from '../tool-events';
import type { ToolStatus, ToolState } from './types';
import { activeTools, sessionTools } from './operations';

/**
 * Get tool state by ID
 */
export function getToolState(toolId: string): ToolState | null {
  return activeTools.get(toolId) || null;
}

/**
 * Get all tools for a session
 */
export function getSessionToolStates(sessionId: string): ToolState[] {
  const toolIds = sessionTools.get(sessionId);
  if (!toolIds) return [];

  const states: ToolState[] = [];
  toolIds.forEach((id) => {
    const state = activeTools.get(id);
    if (state) states.push(state);
  });

  return states;
}

/**
 * Get active (in-progress) tools for a session
 */
export function getActiveToolStates(sessionId: string): ToolState[] {
  return getSessionToolStates(sessionId).filter(
    (s) => s.status === 'initializing' || s.status === 'building'
  );
}

/**
 * Clean up old completed/failed tools (call periodically)
 * Keeps tools for maxAge milliseconds after completion
 */
export function cleanupOldTools(maxAge: number = 3600000): number {
  const now = Date.now();
  let cleanedCount = 0;

  activeTools.forEach((state, toolId) => {
    // Only clean up terminal states
    if (
      ['completed', 'error', 'cancelled'].includes(state.status) &&
      now - state.updatedAt > maxAge
    ) {
      activeTools.delete(toolId);

      const sessionToolSet = sessionTools.get(state.sessionId);
      if (sessionToolSet) {
        sessionToolSet.delete(toolId);
        if (sessionToolSet.size === 0) {
          sessionTools.delete(state.sessionId);
        }
      }

      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.info('Cleaned up old tool states', { cleanedCount });
  }

  return cleanedCount;
}

/**
 * Clear all tool states - FOR TESTING ONLY
 * This completely resets the in-memory state
 */
export function clearAllToolStates(): void {
  activeTools.clear();
  sessionTools.clear();
}

/**
 * Get stats for monitoring
 */
export function getToolStateStats(): {
  totalTools: number;
  byStatus: Record<ToolStatus, number>;
  byType: Record<ToolType, number>;
  activeSessions: number;
} {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};

  activeTools.forEach((state) => {
    byStatus[state.status] = (byStatus[state.status] || 0) + 1;
    byType[state.type] = (byType[state.type] || 0) + 1;
  });

  return {
    totalTools: activeTools.size,
    byStatus: byStatus as Record<ToolStatus, number>,
    byType: byType as Record<ToolType, number>,
    activeSessions: sessionTools.size,
  };
}
