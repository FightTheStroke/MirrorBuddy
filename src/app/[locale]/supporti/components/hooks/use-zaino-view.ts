/**
 * @file use-zaino-view.ts
 * @brief Custom hook for zaino view logic with local state filtering
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import { logger } from '@/lib/logger';
import { getActiveMaterials } from '@/lib/storage/materials-db-utils';
import { deleteMaterial } from '@/lib/storage/materials-db-crud';
import { updateMaterialInteraction } from '@/components/education/archive';
import type { SortBy, ViewMode, ArchiveItem } from '@/components/education/archive';
import { DATE_FILTERS, DATE_FILTER_IDS } from '../constants';

interface UseZainoViewProps {
  initialType?: string;
  initialSubject?: string;
}

export function useZainoView({
  initialType,
  initialSubject,
}: UseZainoViewProps) {
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [materials, setMaterials] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typeFilter, setTypeFilter] = useState(initialType || 'all');
  const [dateFilter, setDateFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState<string | null>(initialSubject || null);

  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const isBookmarked = typeFilter === 'bookmarked';
  const isPercorsi = typeFilter === 'percorsi';

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const records = await getActiveMaterials();
        setMaterials(records as ArchiveItem[]);
      } catch (err) {
        logger.error('Failed to load materials', undefined, err);
        setError('Impossibile caricare i materiali. Riprova più tardi.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const result = {
      total: materials.length,
      bookmarked: 0,
      byType: {} as Record<string, number>,
      bySubject: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
    };
    
    for (const item of materials) {
      if (item.isBookmarked) result.bookmarked++;
      result.byType[item.toolType] = (result.byType[item.toolType] || 0) + 1;
      if (item.subject)
        result.bySubject[item.subject] =
          (result.bySubject[item.subject] || 0) + 1;
    }
    
    for (const id of DATE_FILTER_IDS) {
      const filter = DATE_FILTERS.find((f) => f.id === id);
      if (filter) {
        const { start, end } = filter.getRange();
        const count = materials.filter((m) => {
          try {
            const created = new Date(m.createdAt);
            return created >= start && created <= end;
          } catch {
            return false;
          }
        }).length;
        result.byDate[id] = count;
      }
    }
    
    return result;
  }, [materials]);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(materials.map((m) => m.subject).filter(Boolean) as string[])
      ).sort(),
    [materials]
  );

  const filtered = useMemo(() => {
    if (materials.length === 0) return [];

    let result = [...materials];

    try {
      if (isBookmarked) {
        result = result.filter((item) => item.isBookmarked);
      } else if (isPercorsi) {
        // Percorsi is handled separately in UI via LearningPathsView
        // Don't filter materials here - return empty to show only paths view
        return [];
      } else if (typeFilter && typeFilter !== 'all') {
        result = result.filter((item) => item.toolType === typeFilter);
      }

      if (subjectFilter) {
        result = result.filter((item) => item.subject === subjectFilter);
      }

      if (dateFilter && dateFilter !== 'all') {
        const filter = DATE_FILTERS.find((f) => f.id === dateFilter);
        if (filter) {
          const { start, end } = filter.getRange();
          result = result.filter((item) => {
            try {
              const created = new Date(item.createdAt);
              return created >= start && created <= end;
            } catch {
              return true;
            }
          });
        }
      }

      if (debouncedQuery.trim()) {
        const fuse = new Fuse(result, {
          keys: [
            { name: 'title', weight: 2 },
            { name: 'subject', weight: 1 },
          ],
          threshold: 0.3,
          ignoreLocation: true,
          minMatchCharLength: 2,
        });
        result = fuse.search(debouncedQuery).map((r) => r.item);
      }

      result.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'type':
            return a.toolType.localeCompare(b.toolType);
          case 'rating':
            return (b.userRating || 0) - (a.userRating || 0);
          case 'views':
            return (b.viewCount || 0) - (a.viewCount || 0);
          default:
            return 0;
        }
      });
    } catch (err) {
      logger.error('Filter error', undefined, err);
    }

    return result;
  }, [
    materials,
    typeFilter,
    subjectFilter,
    dateFilter,
    isBookmarked,
    isPercorsi,
    debouncedQuery,
    sortBy,
  ]);

  const handleTypeFilter = useCallback((type: string) => {
    setSelectedPathId(null);
    setSelectedTopicId(null);
    setTypeFilter(type);
  }, []);

  const handleDateFilter = useCallback((date: string) => {
    setDateFilter(date);
  }, []);

  const handleSubjectFilter = useCallback((subject: string | null) => {
    setSubjectFilter(subject);
  }, []);

  const clearAllFilters = useCallback(() => {
    setTypeFilter('all');
    setDateFilter('all');
    setSubjectFilter(null);
    setSearchQuery('');
  }, []);

  const getFilterCount = useCallback((id: string): number => {
    if (id === 'all') return counts.total;
    if (id === 'bookmarked') return counts.bookmarked;
    return counts.byType[id] || 0;
  }, [counts]);

  const getDateFilterCount = useCallback((id: string): number => {
    return counts.byDate[id] || 0;
  }, [counts]);

  const getSubjectFilterCount = useCallback((id: string): number => {
    return counts.bySubject[id] || 0;
  }, [counts]);

  const hasActiveFilters = typeFilter !== 'all' || dateFilter !== 'all' || subjectFilter !== null || searchQuery.trim() !== '';

  const handleDelete = useCallback(async (toolId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo materiale?')) return;
    try {
      await deleteMaterial(toolId);
      setMaterials((prev) => prev.filter((m) => m.toolId !== toolId));
    } catch (err) {
      logger.error('Failed to delete', undefined, err);
    }
  }, []);

  const handleView = useCallback((item: ArchiveItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleBookmark = useCallback(async (toolId: string, isBookmarked: boolean) => {
    try {
      const success = await updateMaterialInteraction(toolId, { isBookmarked });
      if (success) {
        setMaterials((prev) =>
          prev.map((m) =>
            m.toolId === toolId ? { ...m, isBookmarked } : m
          )
        );
      }
    } catch (err) {
      logger.error('Failed to update bookmark', undefined, err);
    }
  }, []);

  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    try {
      const success = await updateMaterialInteraction(toolId, { userRating });
      if (success) {
        setMaterials((prev) =>
          prev.map((m) => (m.toolId === toolId ? { ...m, userRating } : m))
        );
      }
    } catch (err) {
      logger.error('Failed to update rating', undefined, err);
    }
  }, []);

  return {
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    materials,
    isLoading,
    error,
    selectedItem,
    filtered,
    typeFilter,
    dateFilter,
    subjectFilter,
    subjects,
    isBookmarked,
    isPercorsi,
    counts,
    selectedPathId,
    setSelectedPathId,
    selectedTopicId,
    setSelectedTopicId,
    handleDelete,
    handleView,
    handleCloseViewer,
    handleBookmark,
    handleRate,
    handleTypeFilter,
    handleDateFilter,
    handleSubjectFilter,
    clearAllFilters,
    getFilterCount,
    getDateFilterCount,
    getSubjectFilterCount,
    hasActiveFilters,
    debouncedQuery,
  };
}
