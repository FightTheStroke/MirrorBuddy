'use client';

// ============================================================================
// ARCHIVE VIEW
// Unified view for browsing all saved materials (tools, PDFs, photos)
// T-18: Unified Archive page
// ============================================================================

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid,
  List,
  Search,
  Calendar,
  Brain,
  HelpCircle,
  Layers,
  Play,
  Camera,
  FileText,
  ArrowUpDown,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  getActiveMaterials,
  deleteMaterial,
  type MaterialRecord,
} from '@/lib/storage/materials-db';
import type { ToolType } from '@/types/tools';

// ============================================================================
// Types
// ============================================================================

type FilterType = 'all' | ToolType;
type SortBy = 'date' | 'type';
type ViewMode = 'grid' | 'list';

interface ArchiveItem extends MaterialRecord {
  title?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TOOL_ICONS: Record<ToolType, typeof Brain> = {
  mindmap: Brain,
  quiz: HelpCircle,
  flashcard: Layers,
  demo: Play,
  search: Search,
  diagram: FileText,
  timeline: Calendar,
  summary: FileText,
  formula: FileText,
  chart: FileText,
  webcam: Camera,
  pdf: FileText,
};

const TOOL_LABELS: Record<ToolType, string> = {
  mindmap: 'Mappe Mentali',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  demo: 'Demo',
  search: 'Ricerche',
  diagram: 'Diagrammi',
  timeline: 'Timeline',
  summary: 'Riassunti',
  formula: 'Formule',
  chart: 'Grafici',
  webcam: 'Foto',
  pdf: 'PDF',
};

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'mindmap', label: 'Mappe' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'flashcard', label: 'Flashcard' },
  { value: 'demo', label: 'Demo' },
  { value: 'webcam', label: 'Foto' },
  { value: 'pdf', label: 'PDF' },
];

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Empty state when no materials match the filter
 */
function EmptyState({ filter }: { filter: FilterType }) {
  const Icon = filter === 'all' ? FileText : TOOL_ICONS[filter];
  const label = filter === 'all' ? 'materiali' : TOOL_LABELS[filter].toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        Nessun {label} salvato
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        I materiali creati durante le tue sessioni di studio appariranno qui.
        Inizia una conversazione con un Maestro per creare nuovi contenuti!
      </p>
    </motion.div>
  );
}

/**
 * Grid view for materials
 */
function GridView({
  items,
  onDelete,
  onView,
}: {
  items: ArchiveItem[];
  onDelete: (id: string) => void;
  onView: (item: ArchiveItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const Icon = TOOL_ICONS[item.toolType];
          const label = TOOL_LABELS[item.toolType];

          return (
            <motion.div
              key={item.toolId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="group cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onView(item)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDelete(item.toolId);
                      }}
                      aria-label="Elimina"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base line-clamp-2 mb-2">
                    {item.title || `${label} del ${formatDate(item.createdAt)}`}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.createdAt)}</span>
                    {item.maestroId && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="capitalize">{item.maestroId}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * List view for materials
 */
function ListView({
  items,
  onDelete,
  onView,
}: {
  items: ArchiveItem[];
  onDelete: (id: string) => void;
  onView: (item: ArchiveItem) => void;
}) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const Icon = TOOL_ICONS[item.toolType];
          const label = TOOL_LABELS[item.toolType];

          return (
            <motion.div
              key={item.toolId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.03 }}
              className="group flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              onClick={() => onView(item)}
            >
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 dark:text-white truncate">
                  {item.title || `${label} del ${formatDate(item.createdAt)}`}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">{label}</span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(item.createdAt)}</span>
                  {item.maestroId && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span className="capitalize">{item.maestroId}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onView(item);
                  }}
                  aria-label="Apri"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete(item.toolId);
                  }}
                  aria-label="Elimina"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Utils
// ============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

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

  // Filter and sort materials
  const filtered = useMemo(() => {
    let result = [...materials];

    // Filter by type
    if (filter !== 'all') {
      result = result.filter((item) => item.toolType === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.maestroId?.toLowerCase().includes(query) ||
          item.toolType.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.toolType.localeCompare(b.toolType);
    });

    return result;
  }, [materials, filter, searchQuery, sortBy]);

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

  const handleView = (item: ArchiveItem) => {
    // TODO: Open material viewer modal or navigate to detail page
    logger.debug('View material', { item });
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Count by type for tab badges
  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: materials.length };
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
            Archivio
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

          {/* Sort toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'date' ? 'type' : 'date')}
            className="gap-1"
            aria-label={`Ordina per ${sortBy === 'date' ? 'tipo' : 'data'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">
              {sortBy === 'date' ? 'Data' : 'Tipo'}
            </span>
          </Button>

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

      {/* Content */}
      <div role="tabpanel" aria-label={`Materiali ${filter === 'all' ? 'tutti' : TOOL_LABELS[filter]}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : viewMode === 'grid' ? (
          <GridView items={filtered} onDelete={handleDelete} onView={handleView} />
        ) : (
          <ListView items={filtered} onDelete={handleDelete} onView={handleView} />
        )}
      </div>
    </div>
  );
}
