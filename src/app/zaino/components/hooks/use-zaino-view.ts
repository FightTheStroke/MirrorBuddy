/**
 * @file use-zaino-view.ts
 * @brief Custom hook for zaino view logic
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import { logger } from '@/lib/logger';
import { getActiveMaterials, deleteMaterial } from '@/lib/storage/materials-db';
import { getAllMaestri } from '@/data/maestri';
import { updateMaterialInteraction } from '@/components/education/archive';
import type { SortBy, ViewMode, ArchiveItem } from '@/components/education/archive';

interface UseZainoViewProps {
  initialType?: string;
  initialSubject?: string;
  initialMaestro?: string;
}

export function useZainoView({
  initialType,
  initialSubject,
  initialMaestro,
}: UseZainoViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [materials, setMaterials] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const typeFilter = searchParams.get('type') || initialType || 'all';
  const subjectFilter = searchParams.get('subject') || initialSubject || null;
  const maestroFilter = searchParams.get('maestro') || initialMaestro || null;
  const isBookmarked = typeFilter === 'bookmarked';
  const isPercorsi = typeFilter === 'percorsi';

  const allMaestri = useMemo(
    () => getAllMaestri().map((m) => ({ id: m.id, name: m.name })),
    []
  );

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const records = await getActiveMaterials();
        setMaterials(records as ArchiveItem[]);
      } catch (error) {
        logger.error('Failed to load materials', { error });
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const result = {
      total: materials.length,
      bookmarked: 0,
      byType: {} as Record<string, number>,
      bySubject: {} as Record<string, number>,
      byMaestro: {} as Record<string, number>,
    };
    for (const item of materials) {
      if (item.isBookmarked) result.bookmarked++;
      result.byType[item.toolType] = (result.byType[item.toolType] || 0) + 1;
      if (item.subject)
        result.bySubject[item.subject] =
          (result.bySubject[item.subject] || 0) + 1;
      if (item.maestroId)
        result.byMaestro[item.maestroId] =
          (result.byMaestro[item.maestroId] || 0) + 1;
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
    let result = [...materials];

    if (isBookmarked) {
      result = result.filter((item) => item.isBookmarked);
    } else if (typeFilter && typeFilter !== 'all') {
      result = result.filter((item) => item.toolType === typeFilter);
    }

    if (subjectFilter) {
      result = result.filter((item) => item.subject === subjectFilter);
    }

    if (maestroFilter) {
      result = result.filter((item) => item.maestroId === maestroFilter);
    }

    if (debouncedQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'subject', weight: 1 },
          { name: 'maestroId', weight: 0.5 },
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
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
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

    return result;
  }, [
    materials,
    typeFilter,
    subjectFilter,
    maestroFilter,
    isBookmarked,
    debouncedQuery,
    sortBy,
  ]);

  const navigate = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          current.set(key, value);
        } else {
          current.delete(key);
        }
      }
      router.push(`/zaino?${current.toString()}`);
    },
    [router, searchParams]
  );

  const handleDelete = async (toolId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo materiale?')) return;
    try {
      await deleteMaterial(toolId);
      setMaterials((prev) => prev.filter((m) => m.toolId !== toolId));
    } catch (error) {
      logger.error('Failed to delete', { error });
    }
  };

  const handleView = useCallback(
    (item: ArchiveItem) => setSelectedItem(item),
    []
  );
  const handleCloseViewer = useCallback(() => setSelectedItem(null), []);

  const handleBookmark = useCallback(
    async (toolId: string, isBookmarked: boolean) => {
      const success = await updateMaterialInteraction(toolId, { isBookmarked });
      if (success)
        setMaterials((prev) =>
          prev.map((m) =>
            m.toolId === toolId ? { ...m, isBookmarked } : m
          )
        );
    },
    []
  );

  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    const success = await updateMaterialInteraction(toolId, { userRating });
    if (success)
      setMaterials((prev) =>
        prev.map((m) => (m.toolId === toolId ? { ...m, userRating } : m))
      );
  }, []);

  const handleTypeFilter = (type: string) => {
    setSelectedPathId(null);
    setSelectedTopicId(null);

    if (type === 'bookmarked') {
      navigate({ type: 'bookmarked', subject: null, maestro: null });
    } else if (type === 'all') {
      navigate({ type: null, subject: null, maestro: null });
    } else {
      navigate({ type, subject: subjectFilter, maestro: maestroFilter });
    }
  };

  const getFilterCount = (id: string): number => {
    if (id === 'all') return counts.total;
    if (id === 'bookmarked') return counts.bookmarked;
    return counts.byType[id] || 0;
  };

  const hasAdvancedFilters = !!(subjectFilter || maestroFilter);

  return {
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    materials,
    isLoading,
    selectedItem,
    filtered,
    showFilters,
    setShowFilters,
    typeFilter,
    subjectFilter,
    maestroFilter,
    isBookmarked,
    isPercorsi,
    counts,
    subjects,
    allMaestri,
    hasAdvancedFilters,
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
    getFilterCount,
    navigate,
    debouncedQuery,
  };
}

