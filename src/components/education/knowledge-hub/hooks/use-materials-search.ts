'use client';

/**
 * Knowledge Hub Materials Search Hook
 *
 * Provides fuzzy search functionality for materials using Fuse.js.
 * Integrates with the searchable-text utilities.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import type { ToolType } from '@/types/tools';
import type { FuseResult } from '@/lib/search/searchable-text';
import {
  createMaterialSearch,
  searchMaterials,
  highlightMatches,
  type SearchableMaterial,
} from '@/lib/search/searchable-text';

export interface UseMaterialsSearchOptions {
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
  /** Maximum results to return (default 50) */
  limit?: number;
  /** Filter by tool types */
  typeFilter?: ToolType | 'all';
  /** Custom Fuse.js threshold (default 0.3) */
  threshold?: number;
}

export interface MaterialSearchResult {
  /** The material item */
  item: SearchableMaterial;
  /** Search score (0 = perfect match) */
  score?: number;
  /** Match indices for highlighting */
  matches?: FuseResult<SearchableMaterial>['matches'];
}

export interface UseMaterialsSearchReturn {
  /** Current search query */
  query: string;
  /** Set search query (debounced) */
  setQuery: (query: string) => void;
  /** Search results */
  results: MaterialSearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Whether a search has been performed */
  hasSearched: boolean;
  /** Clear search */
  clearSearch: () => void;
  /** Highlight text with match indices */
  highlightText: typeof highlightMatches;
}

/**
 * Hook for searching materials with fuzzy matching.
 */
export function useMaterialsSearch(
  materials: SearchableMaterial[],
  options: UseMaterialsSearchOptions = {}
): UseMaterialsSearchReturn {
  const {
    debounceMs = 300,
    limit = 50,
    typeFilter = 'all',
    threshold = 0.3,
  } = options;

  const [query, setQueryInternal] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter materials by type before creating search index
  const filteredMaterials = useMemo(() => {
    if (typeFilter === 'all') return materials;
    return materials.filter((m) => m.toolType === typeFilter);
  }, [materials, typeFilter]);

  // Create Fuse.js search instance
  const fuse = useMemo(() => {
    return createMaterialSearch(filteredMaterials, { threshold });
  }, [filteredMaterials, threshold]);

  // Debounce query changes - use callback pattern to avoid setState in effect
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Empty query - handled synchronously in setQuery callback
    if (!query) {
      return;
    }

    // Start debounce timer for non-empty queries
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
      setHasSearched(true);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [query, debounceMs]);

  // Perform search
  const results = useMemo<MaterialSearchResult[]>(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const searchResults = searchMaterials(fuse, debouncedQuery, limit);

    return searchResults.map((result) => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));
  }, [fuse, debouncedQuery, limit]);

  // Set query handler - handle empty query synchronously
  const setQuery = useCallback((newQuery: string) => {
    setQueryInternal(newQuery);
    if (newQuery) {
      setIsSearching(true);
    } else {
      // Clear state immediately for empty query
      setDebouncedQuery('');
      setIsSearching(false);
      setHasSearched(false);
    }
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryInternal('');
    setDebouncedQuery('');
    setIsSearching(false);
    setHasSearched(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
    clearSearch,
    highlightText: highlightMatches,
  };
}

/**
 * Get materials sorted by relevance and recency.
 * Used when no search query is active.
 */
export function sortMaterialsByRecency(
  materials: SearchableMaterial[]
): SearchableMaterial[] {
  return [...materials].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filter materials by multiple criteria.
 */
export function filterMaterials(
  materials: SearchableMaterial[],
  filters: {
    types?: ToolType[];
    subjects?: string[];
    maestroIds?: string[];
    dateRange?: { from: Date; to: Date };
  }
): SearchableMaterial[] {
  return materials.filter((m) => {
    // Type filter
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(m.toolType)) return false;
    }

    // Subject filter
    if (filters.subjects && filters.subjects.length > 0) {
      if (!m.subject || !filters.subjects.includes(m.subject)) return false;
    }

    // Maestro filter
    if (filters.maestroIds && filters.maestroIds.length > 0) {
      if (!m.maestroId || !filters.maestroIds.includes(m.maestroId)) return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const date = new Date(m.createdAt);
      if (date < filters.dateRange.from || date > filters.dateRange.to) {
        return false;
      }
    }

    return true;
  });
}
