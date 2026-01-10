'use client';

// ============================================================================
// ARCHIVE VIEW
// Unified view for browsing all saved materials (tools, PDFs, photos)
// Issue #37: Unified Archive page with bookmark, rating, filters
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import {
  Grid,
  List,
  Search,
  Calendar,
  ArrowUpDown,
  X,
  BookOpen,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getActiveMaterials } from '@/lib/storage/materials-db-utils';
import { deleteMaterial } from '@/lib/storage/materials-db-crud';

// Import extracted components
import {
  type FilterType,
  type SortBy,
  type ViewMode,
  type ArchiveItem,
  SORT_OPTIONS,
  FILTER_TABS,
  TOOL_LABELS,
  SUBJECT_LABELS,
  updateMaterialInteraction,
  EmptyState,
  GridView,
  ListView,
  MaterialViewer,
} from './archive';

// ============================================================================
// Main Component
// ============================================================================

export function ArchiveView() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [materials, setMaterials] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  // Subject filter (Issue #37)
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  // Date range filter (Issue #37)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query for fuzzy search (Task 7.13)
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Load materials from IndexedDB
  useEffect(() => {
    async function loadMaterials() {
      try {
        setIsLoading(true);
        const records = await getActiveMaterials();
        setMaterials(records as ArchiveItem[]);
      } catch (error) {
        logger.error('Failed to load materials', { error });
      } finally {
        setIsLoading(false);
      }
    }
    loadMaterials();
  }, []);

  // Extract unique subjects from materials
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    for (const item of materials) {
      if (item.subject) {
        subjects.add(item.subject);
      }
    }
    return Array.from(subjects).sort();
  }, [materials]);

  // Filter and sort materials
  const filtered = useMemo(() => {
    let result = [...materials];

    // Filter by type or bookmarked
    if (filter === 'bookmarked') {
      result = result.filter((item) => item.isBookmarked);
    } else if (filter !== 'all') {
      result = result.filter((item) => item.toolType === filter);
    }

    // Filter by subject (Issue #37)
    if (subjectFilter !== 'all') {
      result = result.filter((item) => item.subject === subjectFilter);
    }

    // Filter by date range (Issue #37)
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((item) => new Date(item.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((item) => new Date(item.createdAt) <= toDate);
    }

    // Filter by search query using fuzzy search (Task 7.13)
    if (debouncedQuery.trim()) {
      // Use Fuse.js fuzzy search on the pre-filtered results
      const fuseInstance = new Fuse(result, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'subject', weight: 1 },
          { name: 'maestroId', weight: 0.5 },
          { name: 'toolType', weight: 0.5 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
      result = fuseInstance.search(debouncedQuery).map(r => r.item);
    }

    // Sort
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

    return result;
  }, [materials, filter, debouncedQuery, sortBy, subjectFilter, dateFrom, dateTo]);

  // Handlers
  const handleDelete = async (toolId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo materiale?')) return;

    try {
      await deleteMaterial(toolId);
      setMaterials((prev) => prev.filter((m) => m.toolId !== toolId));
    } catch (error) {
      logger.error('Failed to delete material', { error });
    }
  };

  const handleView = useCallback((item: ArchiveItem) => {
    logger.debug('Opening material viewer', { toolId: item.toolId, toolType: item.toolType });
    setSelectedItem(item);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Bookmark handler
  const handleBookmark = useCallback(async (toolId: string, isBookmarked: boolean) => {
    const success = await updateMaterialInteraction(toolId, { isBookmarked });
    if (success) {
      setMaterials((prev) =>
        prev.map((m) => (m.toolId === toolId ? { ...m, isBookmarked } : m))
      );
    }
  }, []);

  // Rating handler
  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    const success = await updateMaterialInteraction(toolId, { userRating });
    if (success) {
      setMaterials((prev) =>
        prev.map((m) => (m.toolId === toolId ? { ...m, userRating } : m))
      );
    }
  }, []);

  // Count by type for tab badges
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {
      all: materials.length,
      bookmarked: materials.filter((m) => m.isBookmarked).length,
    };
    for (const item of materials) {
      counts[item.toolType] = (counts[item.toolType] || 0) + 1;
    }
    return counts;
  }, [materials]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Zaino
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tutti i tuoi materiali di studio salvati
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca materiali..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 w-full sm:w-48 h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Cerca materiali"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="appearance-none pl-8 pr-8 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              aria-label="Ordina per"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex border rounded-lg dark:border-slate-700">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-r-none',
                viewMode === 'grid' && 'bg-slate-100 dark:bg-slate-800'
              )}
              onClick={() => setViewMode('grid')}
              aria-label="Vista griglia"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-l-none',
                viewMode === 'list' && 'bg-slate-100 dark:bg-slate-800'
              )}
              onClick={() => setViewMode('list')}
              aria-label="Vista lista"
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtra per tipo">
        {FILTER_TABS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(value)}
            role="tab"
            aria-selected={filter === value}
            className="gap-1"
          >
            {label}
            {countByType[value] > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                filter === value
                  ? 'bg-white/20'
                  : 'bg-slate-200 dark:bg-slate-700'
              )}>
                {countByType[value]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Advanced Filters (Issue #37) */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtri:</span>
        </div>

        {/* Subject Filter */}
        <div className="relative">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="appearance-none pl-8 pr-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            aria-label="Filtra per materia"
          >
            <option value="all">Tutte le materie</option>
            {availableSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {SUBJECT_LABELS[subject] || subject}
              </option>
            ))}
          </select>
          <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pl-8 pr-3 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Data da"
            />
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-slate-400">-</span>
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pl-8 pr-3 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Data a"
            />
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(subjectFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSubjectFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs gap-1"
          >
            <X className="w-3 h-3" />
            Pulisci filtri
          </Button>
        )}
      </div>

      {/* Content */}
      <div role="tabpanel" aria-label={`Materiali ${filter === 'all' ? 'tutti' : filter === 'bookmarked' ? 'preferiti' : TOOL_LABELS[filter]}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : viewMode === 'grid' ? (
          <GridView
            items={filtered}
            onDelete={handleDelete}
            onView={handleView}
            onBookmark={handleBookmark}
            onRate={handleRate}
          />
        ) : (
          <ListView
            items={filtered}
            onDelete={handleDelete}
            onView={handleView}
            onBookmark={handleBookmark}
            onRate={handleRate}
          />
        )}
      </div>

      {/* Material Viewer Modal */}
      <AnimatePresence>
        {selectedItem && (
          <MaterialViewer item={selectedItem} onClose={handleCloseViewer} />
        )}
      </AnimatePresence>
    </div>
  );
}
