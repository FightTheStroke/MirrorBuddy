'use client';

/**
 * Knowledge Hub Smart Collections Hook
 *
 * Provides dynamic collections based on criteria like:
 * - Recent materials
 * - Favorites
 * - By type
 * - By date range
 * - By subject/maestro
 */

import { useMemo } from 'react';
import type { ToolType } from '@/types/tools';
import type { SearchableMaterial } from '@/lib/search/searchable-text';

export interface SmartCollectionDefinition {
  id: string;
  name: string;
  icon: string;
  filter: (material: MaterialWithExtras) => boolean;
  sort?: (a: MaterialWithExtras, b: MaterialWithExtras) => number;
}

export interface MaterialWithExtras extends SearchableMaterial {
  isFavorite?: boolean;
  isArchived?: boolean;
  collectionId?: string | null;
  tags?: string[];
}

export interface UseSmartCollectionsOptions {
  /** All materials to filter */
  materials: MaterialWithExtras[];
  /** Custom smart collections */
  customCollections?: SmartCollectionDefinition[];
}

export interface SmartCollection {
  id: string;
  name: string;
  icon: string;
  count: number;
  materials: MaterialWithExtras[];
}

export interface UseSmartCollectionsReturn {
  /** Recent materials (last 7 days) */
  recentMaterials: SmartCollection;
  /** Favorite materials */
  favorites: SmartCollection;
  /** Archived materials */
  archived: SmartCollection;
  /** Materials by type */
  byType: Record<ToolType, SmartCollection>;
  /** Today's materials */
  today: SmartCollection;
  /** This week's materials */
  thisWeek: SmartCollection;
  /** This month's materials */
  thisMonth: SmartCollection;
  /** All smart collections as array */
  allCollections: SmartCollection[];
  /** Get smart collection by ID */
  getCollection: (id: string) => SmartCollection | undefined;
}

// Default sort: newest first
const defaultSort = (a: MaterialWithExtras, b: MaterialWithExtras) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// Date helpers
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Hook for smart/dynamic material collections.
 */
export function useSmartCollections(
  options: UseSmartCollectionsOptions
): UseSmartCollectionsReturn {
  const { materials } = options;

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const sevenDaysAgo = daysAgo(7);

  // Recent materials (last 7 days, not archived)
  const recentMaterials = useMemo<SmartCollection>(() => {
    const filtered = materials
      .filter((m) => !m.isArchived && new Date(m.createdAt) >= sevenDaysAgo)
      .sort(defaultSort);

    return {
      id: 'smart-recent',
      name: 'Recenti',
      icon: 'clock',
      count: filtered.length,
      materials: filtered,
    };
  }, [materials, sevenDaysAgo]);

  // Favorites
  const favorites = useMemo<SmartCollection>(() => {
    const filtered = materials
      .filter((m) => m.isFavorite && !m.isArchived)
      .sort(defaultSort);

    return {
      id: 'smart-favorites',
      name: 'Preferiti',
      icon: 'star',
      count: filtered.length,
      materials: filtered,
    };
  }, [materials]);

  // Archived
  const archived = useMemo<SmartCollection>(() => {
    const filtered = materials.filter((m) => m.isArchived).sort(defaultSort);

    return {
      id: 'smart-archived',
      name: 'Archiviati',
      icon: 'archive',
      count: filtered.length,
      materials: filtered,
    };
  }, [materials]);

  // Today
  const today = useMemo<SmartCollection>(() => {
    const filtered = materials
      .filter((m) => !m.isArchived && new Date(m.createdAt) >= todayStart)
      .sort(defaultSort);

    return {
      id: 'smart-today',
      name: 'Oggi',
      icon: 'calendar-day',
      count: filtered.length,
      materials: filtered,
    };
  }, [materials, todayStart]);

  // This week
  const thisWeek = useMemo<SmartCollection>(() => {
    const filtered = materials
      .filter((m) => !m.isArchived && new Date(m.createdAt) >= weekStart)
      .sort(defaultSort);

    return {
      id: 'smart-week',
      name: 'Questa settimana',
      icon: 'calendar-week',
      count: filtered.length,
      materials: filtered,
    };
  }, [materials, weekStart]);

  // This month
  const thisMonth = useMemo<SmartCollection>(() => {
    const filtered = materials
      .filter((m) => !m.isArchived && new Date(m.createdAt) >= monthStart)
      .sort(defaultSort);

    return {
      id: 'smart-month',
      name: 'Questo mese',
      icon: 'calendar-month',
      count: filtered.length,
      materials: filtered,
    };
  }, [materials, monthStart]);

  // By type
  const byType = useMemo<Record<ToolType, SmartCollection>>(() => {
    const types: ToolType[] = [
      'mindmap',
      'quiz',
      'flashcard',
      'summary',
      'demo',
      'diagram',
      'timeline',
      'formula',
      'chart',
      'pdf',
      'webcam',
      'homework',
      'search',
    ];

    const typeLabels: Record<ToolType, string> = {
      mindmap: 'Mappe Mentali',
      quiz: 'Quiz',
      flashcard: 'Flashcard',
      summary: 'Riassunti',
      demo: 'Demo',
      diagram: 'Diagrammi',
      timeline: 'Timeline',
      formula: 'Formule',
      chart: 'Grafici',
      pdf: 'PDF',
      webcam: 'Immagini',
      homework: 'Compiti',
      search: 'Ricerche',
    };

    const result = {} as Record<ToolType, SmartCollection>;

    for (const type of types) {
      const filtered = materials
        .filter((m) => m.toolType === type && !m.isArchived)
        .sort(defaultSort);

      result[type] = {
        id: `smart-type-${type}`,
        name: typeLabels[type],
        icon: type,
        count: filtered.length,
        materials: filtered,
      };
    }

    return result;
  }, [materials]);

  // All collections as array
  const allCollections = useMemo<SmartCollection[]>(() => {
    return [
      recentMaterials,
      favorites,
      today,
      thisWeek,
      thisMonth,
      ...Object.values(byType),
      archived,
    ];
  }, [recentMaterials, favorites, today, thisWeek, thisMonth, byType, archived]);

  // Get collection by ID
  const getCollection = useMemo(() => {
    const collectionMap = new Map<string, SmartCollection>();
    for (const col of allCollections) {
      collectionMap.set(col.id, col);
    }
    return (id: string) => collectionMap.get(id);
  }, [allCollections]);

  return {
    recentMaterials,
    favorites,
    archived,
    byType,
    today,
    thisWeek,
    thisMonth,
    allCollections,
    getCollection,
  };
}
