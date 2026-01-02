/**
 * Unit Tests: Tool State Management
 * T-21: Unit tests for tool-executor + handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createToolState,
  updateToolState,
  completeToolState,
  failToolState,
  cancelToolState,
  getToolState,
  getSessionToolStates,
  getActiveToolStates,
  cleanupOldTools,
  clearAllToolStates,
  getToolStateStats,
} from '../tool-state';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Tool State Management', () => {
  // Reset state between tests
  beforeEach(() => {
    // Clear all tool states for proper test isolation
    clearAllToolStates();
  });

  describe('createToolState', () => {
    it('should create a new tool state with correct initial values', () => {
      const state = createToolState({
        id: 'tool-1',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Test Mindmap',
        subject: 'mathematics',
      });

      expect(state.id).toBe('tool-1');
      expect(state.type).toBe('mindmap');
      expect(state.status).toBe('initializing');
      expect(state.sessionId).toBe('session-1');
      expect(state.maestroId).toBe('archimede');
      expect(state.title).toBe('Test Mindmap');
      expect(state.subject).toBe('mathematics');
      expect(state.progress).toBe(0);
      expect(state.chunksReceived).toBe(0);
      expect(state.rawChunks).toEqual([]);
    });

    it('should initialize correct content structure for mindmap', () => {
      const state = createToolState({
        id: 'tool-mm',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Mindmap Test',
      });

      expect(state.content).toEqual({
        centralTopic: '',
        nodes: [],
      });
    });

    it('should initialize correct content structure for quiz', () => {
      const state = createToolState({
        id: 'tool-quiz',
        type: 'quiz',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Quiz Test',
      });

      expect(state.content).toEqual({
        questions: [],
      });
    });

    it('should initialize correct content structure for flashcards', () => {
      const state = createToolState({
        id: 'tool-fc',
        type: 'flashcards',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Flashcards Test',
      });

      expect(state.content).toEqual({
        cards: [],
      });
    });

    it('should initialize correct content structure for diagram', () => {
      const state = createToolState({
        id: 'tool-dia',
        type: 'diagram',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Diagram Test',
      });

      expect(state.content).toEqual({
        type: 'flowchart',
        mermaidCode: '',
      });
    });
  });

  describe('getToolState', () => {
    it('should retrieve existing tool state', () => {
      createToolState({
        id: 'tool-get',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Get Test',
      });

      const state = getToolState('tool-get');
      expect(state).not.toBeNull();
      expect(state?.id).toBe('tool-get');
    });

    it('should return null for non-existent tool', () => {
      const state = getToolState('non-existent');
      expect(state).toBeNull();
    });
  });

  describe('updateToolState', () => {
    it('should update tool progress', () => {
      createToolState({
        id: 'tool-update',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Update Test',
      });

      const updated = updateToolState('tool-update', { progress: 50 });
      expect(updated?.progress).toBe(50);
      expect(updated?.status).toBe('building');
    });

    it('should add chunks to rawChunks array', () => {
      createToolState({
        id: 'tool-chunk',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Chunk Test',
      });

      updateToolState('tool-chunk', { chunk: 'first chunk' });
      updateToolState('tool-chunk', { chunk: 'second chunk' });

      const state = getToolState('tool-chunk');
      expect(state?.rawChunks).toEqual(['first chunk', 'second chunk']);
      expect(state?.chunksReceived).toBe(2);
    });

    it('should merge content updates', () => {
      createToolState({
        id: 'tool-content',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Content Test',
      });

      updateToolState('tool-content', {
        content: { centralTopic: 'Math Concepts' },
      });

      const state = getToolState('tool-content');
      expect(state?.content).toMatchObject({ centralTopic: 'Math Concepts' });
    });

    it('should clamp progress between 0 and 100', () => {
      createToolState({
        id: 'tool-clamp',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Clamp Test',
      });

      const over = updateToolState('tool-clamp', { progress: 150 });
      expect(over?.progress).toBe(100);

      const under = updateToolState('tool-clamp', { progress: -50 });
      expect(under?.progress).toBe(0);
    });

    it('should return null for non-existent tool', () => {
      const result = updateToolState('non-existent', { progress: 50 });
      expect(result).toBeNull();
    });
  });

  describe('completeToolState', () => {
    it('should mark tool as completed with 100% progress', () => {
      createToolState({
        id: 'tool-complete',
        type: 'quiz',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Complete Test',
      });

      const completed = completeToolState('tool-complete');
      expect(completed?.status).toBe('completed');
      expect(completed?.progress).toBe(100);
    });

    it('should set final content if provided', () => {
      createToolState({
        id: 'tool-final',
        type: 'quiz',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Final Content Test',
      });

      const finalContent = {
        questions: [
          {
            id: 'q1',
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
          },
        ],
      };

      const completed = completeToolState('tool-final', finalContent);
      expect(completed?.content).toEqual(finalContent);
    });

    it('should return null for non-existent tool', () => {
      const result = completeToolState('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('failToolState', () => {
    it('should mark tool as error with message', () => {
      createToolState({
        id: 'tool-fail',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Fail Test',
      });

      const failed = failToolState('tool-fail', 'Network error');
      expect(failed?.status).toBe('error');
      expect(failed?.errorMessage).toBe('Network error');
    });

    it('should return null for non-existent tool', () => {
      const result = failToolState('non-existent', 'error');
      expect(result).toBeNull();
    });
  });

  describe('cancelToolState', () => {
    it('should mark tool as cancelled', () => {
      createToolState({
        id: 'tool-cancel',
        type: 'mindmap',
        sessionId: 'session-1',
        maestroId: 'archimede',
        title: 'Cancel Test',
      });

      const cancelled = cancelToolState('tool-cancel');
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should return null for non-existent tool', () => {
      const result = cancelToolState('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getSessionToolStates', () => {
    it('should return all tools for a session', () => {
      createToolState({
        id: 'tool-s1-1',
        type: 'mindmap',
        sessionId: 'session-multi',
        maestroId: 'archimede',
        title: 'Tool 1',
      });

      createToolState({
        id: 'tool-s1-2',
        type: 'quiz',
        sessionId: 'session-multi',
        maestroId: 'archimede',
        title: 'Tool 2',
      });

      createToolState({
        id: 'tool-s2',
        type: 'flashcards',
        sessionId: 'session-other',
        maestroId: 'archimede',
        title: 'Other Session',
      });

      const sessionTools = getSessionToolStates('session-multi');
      expect(sessionTools).toHaveLength(2);
      expect(sessionTools.map((t) => t.id).sort()).toEqual(['tool-s1-1', 'tool-s1-2'].sort());
    });

    it('should return empty array for unknown session', () => {
      const sessionTools = getSessionToolStates('unknown-session');
      expect(sessionTools).toEqual([]);
    });
  });

  describe('getActiveToolStates', () => {
    it('should return only active tools (initializing or building)', () => {
      createToolState({
        id: 'tool-active-1',
        type: 'mindmap',
        sessionId: 'session-active',
        maestroId: 'archimede',
        title: 'Active 1',
      });

      createToolState({
        id: 'tool-active-2',
        type: 'quiz',
        sessionId: 'session-active',
        maestroId: 'archimede',
        title: 'Active 2',
      });

      // Update one to building
      updateToolState('tool-active-1', { progress: 50 });

      // Complete the other
      completeToolState('tool-active-2');

      const activeTools = getActiveToolStates('session-active');
      expect(activeTools).toHaveLength(1);
      expect(activeTools[0].id).toBe('tool-active-1');
    });
  });

  describe('getToolStateStats', () => {
    it('should return correct statistics', () => {
      // Get baseline stats
      const baseline = getToolStateStats();

      createToolState({
        id: 'stat-1',
        type: 'mindmap',
        sessionId: 'session-stats',
        maestroId: 'archimede',
        title: 'Stat 1',
      });

      createToolState({
        id: 'stat-2',
        type: 'mindmap',
        sessionId: 'session-stats',
        maestroId: 'archimede',
        title: 'Stat 2',
      });

      createToolState({
        id: 'stat-3',
        type: 'quiz',
        sessionId: 'session-stats-2',
        maestroId: 'archimede',
        title: 'Stat 3',
      });

      completeToolState('stat-2');

      const stats = getToolStateStats();
      expect(stats.totalTools).toBe(baseline.totalTools + 3);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(2);
      expect(stats.byType.mindmap).toBeGreaterThanOrEqual(2);
      expect(stats.byType.quiz).toBeGreaterThanOrEqual(1);
      expect(stats.byStatus.initializing).toBeGreaterThanOrEqual(2);
      expect(stats.byStatus.completed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cleanupOldTools', () => {
    it('should remove old completed tools', () => {
      createToolState({
        id: 'cleanup-1',
        type: 'mindmap',
        sessionId: 'session-cleanup',
        maestroId: 'archimede',
        title: 'Cleanup Test',
      });

      completeToolState('cleanup-1');

      // Force old timestamp
      const toolState = getToolState('cleanup-1');
      if (toolState) {
        toolState.updatedAt = Date.now() - 3700000; // More than 1 hour ago
      }

      const cleaned = cleanupOldTools(3600000); // 1 hour
      expect(cleaned).toBe(1);
      expect(getToolState('cleanup-1')).toBeNull();
    });

    it('should not remove active tools', () => {
      createToolState({
        id: 'cleanup-active',
        type: 'mindmap',
        sessionId: 'session-cleanup-active',
        maestroId: 'archimede',
        title: 'Active Tool',
      });

      const cleaned = cleanupOldTools(0);
      expect(cleaned).toBe(0);
      expect(getToolState('cleanup-active')).not.toBeNull();
    });
  });
});
