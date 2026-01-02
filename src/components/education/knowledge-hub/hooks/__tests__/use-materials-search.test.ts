/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMaterialsSearch,
  sortMaterialsByRecency,
  filterMaterials,
} from '../use-materials-search';
import type { SearchableMaterial } from '@/lib/search/searchable-text';
import type { ToolType } from '@/types/tools';

type MockMaterialInput = Omit<Partial<SearchableMaterial>, 'createdAt'> & {
  createdAt?: Date | string;
};

const createMockMaterial = (overrides: MockMaterialInput = {}): SearchableMaterial => {
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

describe('useMaterialsSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty query', () => {
      const { result } = renderHook(() => useMaterialsSearch([]));

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.hasSearched).toBe(false);
    });
  });

  describe('setQuery', () => {
    it('updates query immediately', () => {
      const { result } = renderHook(() => useMaterialsSearch([]));

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.query).toBe('test');
    });

    it('sets isSearching while debouncing', () => {
      const { result } = renderHook(() => useMaterialsSearch([]));

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.isSearching).toBe(true);
    });

    it('debounces search execution', () => {
      const materials = [
        createMockMaterial({ title: 'Test One', searchableText: 'test one' }),
      ];

      const { result } = renderHook(() => useMaterialsSearch(materials));

      act(() => {
        result.current.setQuery('test');
      });

      // Results not yet available
      expect(result.current.results).toHaveLength(0);

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results.length).toBeGreaterThan(0);
    });

    it('uses custom debounce delay', () => {
      const materials = [
        createMockMaterial({ title: 'Test', searchableText: 'test' }),
      ];

      const { result } = renderHook(() =>
        useMaterialsSearch(materials, { debounceMs: 500 })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results).toHaveLength(0);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.results.length).toBeGreaterThan(0);
    });
  });

  describe('search results', () => {
    it('finds materials by title', async () => {
      const materials = [
        createMockMaterial({ id: 'mat-1', title: 'Algebra Quiz', searchableText: 'algebra quiz' }),
        createMockMaterial({ id: 'mat-2', title: 'Geometry Test', searchableText: 'geometry test' }),
      ];

      const { result } = renderHook(() => useMaterialsSearch(materials));

      act(() => {
        result.current.setQuery('algebra');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].item.id).toBe('mat-1');
    });

    it('finds materials by searchableText', () => {
      const materials = [
        createMockMaterial({
          id: 'mat-1',
          title: 'Test',
          searchableText: 'pitagora teorema triangolo'
        }),
      ];

      const { result } = renderHook(() => useMaterialsSearch(materials));

      act(() => {
        result.current.setQuery('pitagora');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results).toHaveLength(1);
    });

    it('includes score in results', () => {
      const materials = [
        createMockMaterial({ title: 'Exact Match', searchableText: 'exact match' }),
      ];

      const { result } = renderHook(() => useMaterialsSearch(materials));

      act(() => {
        result.current.setQuery('exact match');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results[0].score).toBeDefined();
      expect(result.current.results[0].score).toBeLessThan(0.5);
    });

    it('respects limit option', () => {
      const materials = Array.from({ length: 20 }, (_, i) =>
        createMockMaterial({
          id: `mat-${i}`,
          title: `Test ${i}`,
          searchableText: `test ${i}`
        })
      );

      const { result } = renderHook(() =>
        useMaterialsSearch(materials, { limit: 5 })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('type filter', () => {
    it('filters by tool type', () => {
      const materials = [
        createMockMaterial({ id: 'quiz', toolType: 'quiz', title: 'Quiz Test', searchableText: 'quiz test' }),
        createMockMaterial({ id: 'mindmap', toolType: 'mindmap', title: 'Mindmap Test', searchableText: 'mindmap test' }),
      ];

      const { result } = renderHook(() =>
        useMaterialsSearch(materials, { typeFilter: 'quiz' })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].item.toolType).toBe('quiz');
    });

    it('returns all types with "all" filter', () => {
      const materials = [
        createMockMaterial({ id: 'quiz', toolType: 'quiz', title: 'Test', searchableText: 'test' }),
        createMockMaterial({ id: 'mindmap', toolType: 'mindmap', title: 'Test', searchableText: 'test' }),
      ];

      const { result } = renderHook(() =>
        useMaterialsSearch(materials, { typeFilter: 'all' })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results.length).toBe(2);
    });
  });

  describe('clearSearch', () => {
    it('clears query and results', () => {
      const materials = [
        createMockMaterial({ title: 'Test', searchableText: 'test' }),
      ];

      const { result } = renderHook(() => useMaterialsSearch(materials));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.results.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toHaveLength(0);
      expect(result.current.hasSearched).toBe(false);
    });
  });

  describe('hasSearched', () => {
    it('becomes true after search completes', () => {
      const { result } = renderHook(() => useMaterialsSearch([]));

      expect(result.current.hasSearched).toBe(false);

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.hasSearched).toBe(true);
    });

    it('resets to false when query cleared', () => {
      const { result } = renderHook(() => useMaterialsSearch([]));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.setQuery('');
      });

      expect(result.current.hasSearched).toBe(false);
    });
  });

  describe('highlightText', () => {
    it('exports highlightMatches function', () => {
      const { result } = renderHook(() => useMaterialsSearch([]));

      expect(result.current.highlightText).toBeDefined();
      expect(typeof result.current.highlightText).toBe('function');
    });
  });
});

describe('sortMaterialsByRecency', () => {
  it('sorts newest first', () => {
    const materials = [
      createMockMaterial({ id: 'old', createdAt: '2024-01-01T00:00:00.000Z' }),
      createMockMaterial({ id: 'new', createdAt: '2025-01-01T00:00:00.000Z' }),
      createMockMaterial({ id: 'medium', createdAt: '2024-06-01T00:00:00.000Z' }),
    ];

    const sorted = sortMaterialsByRecency(materials);

    expect(sorted[0].id).toBe('new');
    expect(sorted[1].id).toBe('medium');
    expect(sorted[2].id).toBe('old');
  });

  it('does not mutate original array', () => {
    const materials = [
      createMockMaterial({ id: 'a', createdAt: '2024-01-01T00:00:00.000Z' }),
      createMockMaterial({ id: 'b', createdAt: '2025-01-01T00:00:00.000Z' }),
    ];

    const sorted = sortMaterialsByRecency(materials);

    expect(materials[0].id).toBe('a');
    expect(sorted[0].id).toBe('b');
  });
});

describe('filterMaterials', () => {
  it('filters by types', () => {
    const materials = [
      createMockMaterial({ id: 'quiz', toolType: 'quiz' }),
      createMockMaterial({ id: 'mindmap', toolType: 'mindmap' }),
      createMockMaterial({ id: 'flashcard', toolType: 'flashcard' }),
    ];

    const filtered = filterMaterials(materials, { types: ['quiz', 'mindmap'] });

    expect(filtered).toHaveLength(2);
    expect(filtered.some(m => m.id === 'quiz')).toBe(true);
    expect(filtered.some(m => m.id === 'mindmap')).toBe(true);
  });

  it('filters by subjects', () => {
    const materials = [
      createMockMaterial({ id: 'math', subject: 'Matematica' }),
      createMockMaterial({ id: 'science', subject: 'Scienze' }),
    ];

    const filtered = filterMaterials(materials, { subjects: ['Matematica'] });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('math');
  });

  it('filters by maestroIds', () => {
    const materials = [
      createMockMaterial({ id: 'mat-1', maestroId: 'maestro-1' }),
      createMockMaterial({ id: 'mat-2', maestroId: 'maestro-2' }),
    ];

    const filtered = filterMaterials(materials, { maestroIds: ['maestro-1'] });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('mat-1');
  });

  it('filters by date range', () => {
    const materials = [
      createMockMaterial({ id: 'old', createdAt: '2024-01-01T00:00:00.000Z' }),
      createMockMaterial({ id: 'in-range', createdAt: '2024-06-15T00:00:00.000Z' }),
      createMockMaterial({ id: 'new', createdAt: '2025-01-01T00:00:00.000Z' }),
    ];

    const filtered = filterMaterials(materials, {
      dateRange: {
        from: new Date('2024-06-01'),
        to: new Date('2024-12-31'),
      },
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('in-range');
  });

  it('combines multiple filters', () => {
    const materials = [
      createMockMaterial({ id: 'match', toolType: 'quiz', subject: 'Matematica' }),
      createMockMaterial({ id: 'wrong-type', toolType: 'mindmap', subject: 'Matematica' }),
      createMockMaterial({ id: 'wrong-subject', toolType: 'quiz', subject: 'Scienze' }),
    ];

    const filtered = filterMaterials(materials, {
      types: ['quiz'],
      subjects: ['Matematica'],
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('match');
  });

  it('returns all when no filters applied', () => {
    const materials = [
      createMockMaterial({ id: 'a' }),
      createMockMaterial({ id: 'b' }),
    ];

    const filtered = filterMaterials(materials, {});

    expect(filtered).toHaveLength(2);
  });

  it('handles empty types array', () => {
    const materials = [createMockMaterial({ id: 'a' })];

    const filtered = filterMaterials(materials, { types: [] });

    expect(filtered).toHaveLength(1);
  });

  it('handles materials without subject', () => {
    const materials = [
      createMockMaterial({ id: 'no-subject', subject: undefined }),
    ];

    const filtered = filterMaterials(materials, { subjects: ['Matematica'] });

    expect(filtered).toHaveLength(0);
  });

  it('handles materials without maestroId', () => {
    const materials = [
      createMockMaterial({ id: 'no-maestro', maestroId: undefined }),
    ];

    const filtered = filterMaterials(materials, { maestroIds: ['maestro-1'] });

    expect(filtered).toHaveLength(0);
  });
});
