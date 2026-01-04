'use client';

/**
 * Zaino View (Backpack - School Metaphor)
 * Redesigned with faceted filtering, no hierarchical navigation
 * Integrated into main app layout like Astuccio
 */

import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import {
  Grid,
  List,
  Search,
  X,
  Loader2,
  Backpack,
  BookmarkCheck,
  Filter,
  SlidersHorizontal,
  Brain,
  HelpCircle,
  Layers,
  Play,
  FileText,
  Camera,
  GitBranch,
  Clock,
  Calculator,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getActiveMaterials, deleteMaterial } from '@/lib/storage/materials-db';
import { getAllMaestri } from '@/data/maestri';
import {
  type SortBy,
  type ViewMode,
  type ArchiveItem,
  type FilterType,
  SORT_OPTIONS,
  TOOL_LABELS,
  SUBJECT_LABELS,
  updateMaterialInteraction,
  EmptyState,
  GridView,
  ListView,
  MaterialViewer,
} from '@/components/education/archive';
import type { ToolType } from '@/types/tools';

interface ZainoViewProps {
  initialType?: string;
  initialSubject?: string;
  initialMaestro?: string;
}

// Tool filter chips with icons and colors
const TYPE_FILTERS: Array<{
  id: ToolType | 'all' | 'bookmarked';
  label: string;
  icon: typeof Brain;
  color: string;
}> = [
  { id: 'all', label: 'Tutti', icon: Backpack, color: 'slate' },
  { id: 'bookmarked', label: 'Preferiti', icon: BookmarkCheck, color: 'amber' },
  { id: 'mindmap', label: 'Mappe', icon: Brain, color: 'blue' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'green' },
  { id: 'flashcard', label: 'Flashcard', icon: Layers, color: 'orange' },
  { id: 'summary', label: 'Riassunti', icon: FileText, color: 'cyan' },
  { id: 'demo', label: 'Demo', icon: Play, color: 'purple' },
  { id: 'diagram', label: 'Diagrammi', icon: GitBranch, color: 'indigo' },
  { id: 'timeline', label: 'Timeline', icon: Clock, color: 'amber' },
  { id: 'formula', label: 'Formule', icon: Calculator, color: 'rose' },
  { id: 'chart', label: 'Grafici', icon: BarChart3, color: 'emerald' },
  { id: 'homework', label: 'Compiti', icon: BookOpen, color: 'violet' },
  { id: 'webcam', label: 'Foto', icon: Camera, color: 'pink' },
  { id: 'pdf', label: 'PDF', icon: FileText, color: 'teal' },
];

// Color mappings for filter chips
const CHIP_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    activeBg: 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    activeBg: 'bg-amber-500 dark:bg-amber-400 text-white dark:text-amber-950',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    activeBg: 'bg-blue-500 dark:bg-blue-400 text-white dark:text-blue-950',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    activeBg: 'bg-green-500 dark:bg-green-400 text-white dark:text-green-950',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    activeBg: 'bg-orange-500 dark:bg-orange-400 text-white dark:text-orange-950',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    activeBg: 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-cyan-950',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    activeBg: 'bg-purple-500 dark:bg-purple-400 text-white dark:text-purple-950',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    activeBg: 'bg-indigo-500 dark:bg-indigo-400 text-white dark:text-indigo-950',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    activeBg: 'bg-rose-500 dark:bg-rose-400 text-white dark:text-rose-950',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    activeBg: 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    activeBg: 'bg-violet-500 dark:bg-violet-400 text-white dark:text-violet-950',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    activeBg: 'bg-pink-500 dark:bg-pink-400 text-white dark:text-pink-950',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    activeBg: 'bg-teal-500 dark:bg-teal-400 text-white dark:text-teal-950',
  },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export function ZainoView({
  initialType,
  initialSubject,
  initialMaestro,
}: ZainoViewProps) {
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

  // Get current filters from URL
  const typeFilter = searchParams.get('type') || initialType || 'all';
  const subjectFilter = searchParams.get('subject') || initialSubject || null;
  const maestroFilter = searchParams.get('maestro') || initialMaestro || null;
  const isBookmarked = typeFilter === 'bookmarked';

  // Load all maestri
  const allMaestri = useMemo(() =>
    getAllMaestri().map(m => ({ id: m.id, name: m.name })),
  []);

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Load materials
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

  // Compute counts
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
      if (item.subject) result.bySubject[item.subject] = (result.bySubject[item.subject] || 0) + 1;
      if (item.maestroId) result.byMaestro[item.maestroId] = (result.byMaestro[item.maestroId] || 0) + 1;
    }
    return result;
  }, [materials]);

  // Extract unique subjects
  const subjects = useMemo(() =>
    Array.from(new Set(materials.map(m => m.subject).filter(Boolean) as string[])).sort(),
  [materials]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...materials];

    // Type/bookmarked filter
    if (isBookmarked) {
      result = result.filter(item => item.isBookmarked);
    } else if (typeFilter && typeFilter !== 'all') {
      result = result.filter(item => item.toolType === typeFilter);
    }

    // Subject filter
    if (subjectFilter) {
      result = result.filter(item => item.subject === subjectFilter);
    }

    // Maestro filter
    if (maestroFilter) {
      result = result.filter(item => item.maestroId === maestroFilter);
    }

    // Fuzzy search
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
      result = fuse.search(debouncedQuery).map(r => r.item);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'type': return a.toolType.localeCompare(b.toolType);
        case 'rating': return (b.userRating || 0) - (a.userRating || 0);
        case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
        default: return 0;
      }
    });

    return result;
  }, [materials, typeFilter, subjectFilter, maestroFilter, isBookmarked, debouncedQuery, sortBy]);

  // Navigation helper
  const navigate = useCallback((params: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    }
    router.push(`/zaino?${current.toString()}`);
  }, [router, searchParams]);

  // Handlers
  const handleDelete = async (toolId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo materiale?')) return;
    try {
      await deleteMaterial(toolId);
      setMaterials(prev => prev.filter(m => m.toolId !== toolId));
    } catch (error) {
      logger.error('Failed to delete', { error });
    }
  };

  const handleView = useCallback((item: ArchiveItem) => setSelectedItem(item), []);
  const handleCloseViewer = useCallback(() => setSelectedItem(null), []);
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);

  const handleBookmark = useCallback(async (toolId: string, isBookmarked: boolean) => {
    const success = await updateMaterialInteraction(toolId, { isBookmarked });
    if (success) setMaterials(prev => prev.map(m => m.toolId === toolId ? { ...m, isBookmarked } : m));
  }, []);

  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    const success = await updateMaterialInteraction(toolId, { userRating });
    if (success) setMaterials(prev => prev.map(m => m.toolId === toolId ? { ...m, userRating } : m));
  }, []);

  const handleTypeFilter = (type: string) => {
    if (type === 'bookmarked') {
      navigate({ type: 'bookmarked', subject: null, maestro: null });
    } else if (type === 'all') {
      navigate({ type: null, subject: null, maestro: null });
    } else {
      navigate({ type, subject: subjectFilter, maestro: maestroFilter });
    }
  };

  // Get count for a filter
  const getFilterCount = (id: string): number => {
    if (id === 'all') return counts.total;
    if (id === 'bookmarked') return counts.bookmarked;
    return counts.byType[id] || 0;
  };

  // Check if advanced filters are active
  const hasAdvancedFilters = subjectFilter || maestroFilter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Backpack className="w-10 h-10 text-primary" aria-hidden="true" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Il Tuo Zaino
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Tutti i materiali che hai creato con i Maestri.
            Cerca, filtra e ritrova i tuoi contenuti.
          </p>
        </motion.div>

        {/* Filter Chips - Horizontal Scrollable */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
            {TYPE_FILTERS.map(filter => {
              const count = getFilterCount(filter.id);
              const isActive = typeFilter === filter.id || (filter.id === 'all' && typeFilter === 'all');
              const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;
              const Icon = filter.icon;

              return (
                <button
                  key={filter.id}
                  onClick={() => handleTypeFilter(filter.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap',
                    'min-h-[44px] min-w-[44px]', // WCAG touch target
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isActive
                      ? colors.activeBg
                      : cn(colors.bg, colors.text, colors.border, 'hover:scale-105')
                  )}
                  aria-pressed={isActive}
                  aria-label={`Filtra per ${filter.label}, ${count} elementi`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">{filter.label}</span>
                  {count > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-white/20'
                        : 'bg-slate-200 dark:bg-slate-700'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Search and Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca nei tuoi materiali..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 h-11 text-base"
                aria-label="Cerca materiali"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  aria-label="Cancella ricerca"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant={showFilters || hasAdvancedFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'gap-2 h-11 min-w-[44px]',
                hasAdvancedFilters && 'ring-2 ring-primary'
              )}
              aria-expanded={showFilters}
              aria-label="Filtri avanzati"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtri</span>
              {hasAdvancedFilters && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {(subjectFilter ? 1 : 0) + (maestroFilter ? 1 : 0)}
                </span>
              )}
            </Button>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-full sm:w-[160px] h-11" aria-label="Ordina per">
                <SelectValue placeholder="Ordina per" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border rounded-lg dark:border-slate-700">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-r-none h-11 w-11',
                  viewMode === 'grid' && 'bg-slate-100 dark:bg-slate-700'
                )}
                onClick={() => setViewMode('grid')}
                aria-label="Vista griglia"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-l-none h-11 w-11',
                  viewMode === 'list' && 'bg-slate-100 dark:bg-slate-700'
                )}
                onClick={() => setViewMode('list')}
                aria-label="Vista lista"
                aria-pressed={viewMode === 'list'}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Subject Filter */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        <Filter className="w-4 h-4 inline mr-2" />
                        Materia
                      </label>
                      <Select
                        value={subjectFilter || 'all'}
                        onValueChange={(v) => navigate({ subject: v === 'all' ? null : v })}
                      >
                        <SelectTrigger className="h-11" aria-label="Filtra per materia">
                          <SelectValue placeholder="Tutte le materie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutte le materie</SelectItem>
                          {subjects.map(subject => (
                            <SelectItem key={subject} value={subject}>
                              {SUBJECT_LABELS[subject] || subject}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({counts.bySubject[subject] || 0})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Maestro Filter */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        <Filter className="w-4 h-4 inline mr-2" />
                        Maestro
                      </label>
                      <Select
                        value={maestroFilter || 'all'}
                        onValueChange={(v) => navigate({ maestro: v === 'all' ? null : v })}
                      >
                        <SelectTrigger className="h-11" aria-label="Filtra per maestro">
                          <SelectValue placeholder="Tutti i maestri" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i maestri</SelectItem>
                          {allMaestri.filter(m => counts.byMaestro[m.id] > 0).map(maestro => (
                            <SelectItem key={maestro.id} value={maestro.id}>
                              {maestro.name}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({counts.byMaestro[maestro.id] || 0})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {hasAdvancedFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ subject: null, maestro: null })}
                      className="mt-4 text-muted-foreground"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rimuovi filtri avanzati
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-4 text-sm text-slate-600 dark:text-slate-400"
        >
          {filtered.length} {filtered.length === 1 ? 'materiale' : 'materiali'}
          {debouncedQuery && ` per "${debouncedQuery}"`}
          {typeFilter && typeFilter !== 'all' && (
            <span> in {TOOL_LABELS[typeFilter as ToolType] || typeFilter}</span>
          )}
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-slate-600 dark:text-slate-400">Caricamento materiali...</span>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <EmptyState filter={(typeFilter || 'all') as FilterType} />
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {viewMode === 'grid' ? (
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
          </motion.div>
        )}

        {/* Empty Backpack Tips */}
        {!isLoading && counts.total === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800"
          >
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
              <Backpack className="w-5 h-5" aria-hidden="true" />
              Il tuo Zaino e vuoto
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
              Inizia a creare materiali di studio con i Maestri!
              Vai nell&apos;Astuccio per scegliere uno strumento.
            </p>
            <Button
              onClick={() => router.push('/astuccio')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Vai all&apos;Astuccio
            </Button>
          </motion.div>
        )}
      </div>

      {/* Material Viewer Modal */}
      <AnimatePresence>
        {selectedItem && <MaterialViewer item={selectedItem} onClose={handleCloseViewer} />}
      </AnimatePresence>
    </div>
  );
}
