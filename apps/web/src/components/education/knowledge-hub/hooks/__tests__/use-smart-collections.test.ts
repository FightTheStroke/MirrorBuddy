/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartCollections, type MaterialWithExtras } from '../use-smart-collections';
import type { ToolType } from '@/types/tools';

type MockMaterialInput = Omit<Partial<MaterialWithExtras>, 'createdAt'> & {
  createdAt?: Date | string;
};

const createMockMaterial = (overrides: MockMaterialInput = {}): MaterialWithExtras => {
  const { createdAt, ...rest } = overrides;
  return {
    id: `mat-${Date.now()}-${Math.random()}`,
    title: 'Test Material',
    toolType: 'quiz' as ToolType,
    createdAt: createdAt instanceof Date
      ? createdAt
      : createdAt
        ? new Date(createdAt)
        : new Date(),
    subject: 'Matematica',
    searchableText: 'test material matematica',
    ...rest,
  };
};

describe('useSmartCollections', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('recentMaterials', () => {
    it('includes materials from last 7 days', () => {
      const materials = [
        createMockMaterial({ id: 'recent', createdAt: '2025-01-14T12:00:00.000Z' }),
        createMockMaterial({ id: 'old', createdAt: '2025-01-01T12:00:00.000Z' }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.recentMaterials.count).toBe(1);
      expect(result.current.recentMaterials.materials[0].id).toBe('recent');
    });

    it('excludes archived materials', () => {
      const materials = [
        createMockMaterial({ id: 'recent', createdAt: '2025-01-14T12:00:00.000Z' }),
        createMockMaterial({ id: 'archived', createdAt: '2025-01-14T12:00:00.000Z', isArchived: true }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.recentMaterials.count).toBe(1);
    });

    it('has correct metadata', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      expect(result.current.recentMaterials.id).toBe('smart-recent');
      expect(result.current.recentMaterials.name).toBe('Recenti');
      expect(result.current.recentMaterials.icon).toBe('clock');
    });
  });

  describe('favorites', () => {
    it('includes only favorite materials', () => {
      const materials = [
        createMockMaterial({ id: 'fav', isFavorite: true }),
        createMockMaterial({ id: 'normal', isFavorite: false }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.favorites.count).toBe(1);
      expect(result.current.favorites.materials[0].id).toBe('fav');
    });

    it('excludes archived favorites', () => {
      const materials = [
        createMockMaterial({ id: 'fav', isFavorite: true }),
        createMockMaterial({ id: 'archived-fav', isFavorite: true, isArchived: true }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.favorites.count).toBe(1);
    });
  });

  describe('archived', () => {
    it('includes only archived materials', () => {
      const materials = [
        createMockMaterial({ id: 'archived', isArchived: true }),
        createMockMaterial({ id: 'normal', isArchived: false }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.archived.count).toBe(1);
      expect(result.current.archived.materials[0].id).toBe('archived');
    });
  });

  describe('today', () => {
    it('includes materials from today', () => {
      // Use dates relative to mocked time (2025-01-15T12:00:00Z)
      const now = new Date('2025-01-15T12:00:00.000Z');
      const todayMorning = new Date(now);
      todayMorning.setHours(6, 0, 0, 0);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const materials = [
        createMockMaterial({ id: 'today', createdAt: todayMorning.toISOString() }),
        createMockMaterial({ id: 'yesterday', createdAt: yesterday.toISOString() }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      // Today should include at least the 'today' material
      expect(result.current.today.materials.some(m => m.id === 'today')).toBe(true);
      expect(result.current.today.materials.some(m => m.id === 'yesterday')).toBe(false);
    });

    it('has correct metadata', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      expect(result.current.today.id).toBe('smart-today');
      expect(result.current.today.name).toBe('Oggi');
    });
  });

  describe('thisWeek', () => {
    it('includes materials from current week', () => {
      // Use relative dates - "this week" vs "last week"
      const now = new Date('2025-01-15T12:00:00.000Z');

      // Create a date that's definitely this week (2 days ago)
      const thisWeekDate = new Date(now);
      thisWeekDate.setDate(thisWeekDate.getDate() - 2);

      // Create a date that's definitely last week (10 days ago)
      const lastWeekDate = new Date(now);
      lastWeekDate.setDate(lastWeekDate.getDate() - 10);

      const materials = [
        createMockMaterial({ id: 'this-week', createdAt: thisWeekDate.toISOString() }),
        createMockMaterial({ id: 'last-week', createdAt: lastWeekDate.toISOString() }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.thisWeek.materials.some(m => m.id === 'this-week')).toBe(true);
      expect(result.current.thisWeek.materials.some(m => m.id === 'last-week')).toBe(false);
    });
  });

  describe('thisMonth', () => {
    it('includes materials from current month', () => {
      // Use relative dates to avoid timezone issues
      const now = new Date('2025-01-15T12:00:00.000Z');

      // Create a date definitely in this month (Jan 10)
      const thisMonthDate = new Date(now);
      thisMonthDate.setDate(10);

      // Create a date definitely in last month (Dec 15)
      const lastMonthDate = new Date(now);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

      const materials = [
        createMockMaterial({ id: 'this-month', createdAt: thisMonthDate.toISOString() }),
        createMockMaterial({ id: 'last-month', createdAt: lastMonthDate.toISOString() }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.thisMonth.materials.some(m => m.id === 'this-month')).toBe(true);
      expect(result.current.thisMonth.materials.some(m => m.id === 'last-month')).toBe(false);
    });
  });

  describe('byType', () => {
    it('groups materials by tool type', () => {
      const materials = [
        createMockMaterial({ id: 'quiz-1', toolType: 'quiz' }),
        createMockMaterial({ id: 'quiz-2', toolType: 'quiz' }),
        createMockMaterial({ id: 'mindmap-1', toolType: 'mindmap' }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.byType.quiz.count).toBe(2);
      expect(result.current.byType.mindmap.count).toBe(1);
      expect(result.current.byType.flashcard.count).toBe(0);
    });

    it('excludes archived from type counts', () => {
      const materials = [
        createMockMaterial({ id: 'quiz-1', toolType: 'quiz' }),
        createMockMaterial({ id: 'quiz-archived', toolType: 'quiz', isArchived: true }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      expect(result.current.byType.quiz.count).toBe(1);
    });

    it('has correct labels for types', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      expect(result.current.byType.mindmap.name).toBe('Mappe Mentali');
      expect(result.current.byType.quiz.name).toBe('Quiz');
      expect(result.current.byType.flashcard.name).toBe('Flashcard');
      expect(result.current.byType.summary.name).toBe('Riassunti');
    });

    it('includes all tool types', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      const expectedTypes: ToolType[] = [
        'mindmap', 'quiz', 'flashcard', 'summary', 'demo',
        'diagram', 'timeline', 'formula', 'chart', 'pdf',
        'webcam', 'homework', 'search',
      ];

      for (const type of expectedTypes) {
        expect(result.current.byType[type]).toBeDefined();
      }
    });
  });

  describe('sorting', () => {
    it('sorts materials by date descending', () => {
      const materials = [
        createMockMaterial({ id: 'old', createdAt: '2025-01-10T12:00:00.000Z' }),
        createMockMaterial({ id: 'new', createdAt: '2025-01-14T12:00:00.000Z' }),
        createMockMaterial({ id: 'medium', createdAt: '2025-01-12T12:00:00.000Z' }),
      ];

      const { result } = renderHook(() =>
        useSmartCollections({ materials })
      );

      const recent = result.current.recentMaterials.materials;
      expect(recent[0].id).toBe('new');
      expect(recent[1].id).toBe('medium');
      expect(recent[2].id).toBe('old');
    });
  });

  describe('allCollections', () => {
    it('returns all smart collections as array', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      const allCollections = result.current.allCollections;

      // Should include: recent, favorites, today, week, month, 13 types, archived
      expect(allCollections.length).toBeGreaterThan(15);
      expect(allCollections.some(c => c.id === 'smart-recent')).toBe(true);
      expect(allCollections.some(c => c.id === 'smart-favorites')).toBe(true);
      expect(allCollections.some(c => c.id === 'smart-archived')).toBe(true);
      expect(allCollections.some(c => c.id === 'smart-type-quiz')).toBe(true);
    });
  });

  describe('getCollection', () => {
    it('returns collection by ID', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      const collection = result.current.getCollection('smart-recent');
      expect(collection?.name).toBe('Recenti');
    });

    it('returns undefined for unknown ID', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      const collection = result.current.getCollection('unknown');
      expect(collection).toBeUndefined();
    });

    it('returns type-specific collections', () => {
      const { result } = renderHook(() =>
        useSmartCollections({ materials: [] })
      );

      const quizCollection = result.current.getCollection('smart-type-quiz');
      expect(quizCollection?.name).toBe('Quiz');
    });
  });

  describe('memoization', () => {
    it('returns equivalent data when materials unchanged', () => {
      const materials = [createMockMaterial({ id: 'test-mat' })];

      const { result, rerender } = renderHook(() =>
        useSmartCollections({ materials })
      );

      const firstRecent = result.current.recentMaterials;
      rerender();
      const secondRecent = result.current.recentMaterials;

      // Check that data is equivalent (same structure and values)
      expect(firstRecent.id).toBe(secondRecent.id);
      expect(firstRecent.count).toBe(secondRecent.count);
      expect(firstRecent.materials.length).toBe(secondRecent.materials.length);
    });
  });
});
