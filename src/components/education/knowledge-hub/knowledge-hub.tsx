'use client';

/**
 * Knowledge Hub Main Component
 * Unified interface for browsing, organizing, and previewing saved materials
 *
 * Phase 7: Tasks 7.14-7.16
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderTree,
  LayoutGrid,
  Calendar,
  Clock,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SidebarNavigation, type Collection } from './components/sidebar-navigation';
import { MaterialCard } from './components/material-card';
import { SimilarMaterialsPanel } from './components/similar-materials-panel';
import {
  ExplorerView,
  GalleryView,
  TimelineView,
  CalendarView,
  type KnowledgeHubMaterial,
} from './views';
import { useMaterialsSearch } from './hooks/use-materials-search';
import { useCollections } from './hooks/use-collections';
import type { SearchableMaterial } from '@/lib/search/searchable-text';

import type { ViewMode, ViewOption, KnowledgeHubProps } from './knowledge-hub/types';

export type { ViewMode, ViewOption, KnowledgeHubProps } from './knowledge-hub/types';

export interface KnowledgeHubPropsInternal {
  /** Initial materials data */
  materials?: KnowledgeHubMaterial[];
  /** Initial collections data */
  collections?: Collection[];
  /** Callback when material is opened */
  onOpenMaterial?: (material: KnowledgeHubMaterial) => void;
  /** Callback when materials are deleted */
  onDeleteMaterials?: (ids: string[]) => Promise<void>;
  /** Callback when materials are moved */
  onMoveMaterials?: (ids: string[], collectionId: string | null) => Promise<void>;
  /** Callback when collection is created */
  onCreateCollection?: (name: string, parentId?: string | null) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'explorer',
    label: 'Esplora',
    icon: <FolderTree className="w-4 h-4" />,
    description: 'Vista a cartelle con navigazione gerarchica',
  },
  {
    id: 'gallery',
    label: 'Galleria',
    icon: <LayoutGrid className="w-4 h-4" />,
    description: 'Griglia con anteprime grandi',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: <Clock className="w-4 h-4" />,
    description: 'Materiali ordinati cronologicamente',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Vista calendario per data',
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function KnowledgeHub({
  materials = [],
  collections: initialCollections = [],
  onOpenMaterial,
  onDeleteMaterials,
  onMoveMaterials,
  onCreateCollection,
  className,
}: KnowledgeHubProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [previewMaterial, setPreviewMaterial] = useState<KnowledgeHubMaterial | null>(null);
  const [similarToolId, setSimilarToolId] = useState<string | null>(null);

  // Convert KnowledgeHubMaterial to SearchableMaterial for search
  const searchableMaterials = useMemo<SearchableMaterial[]>(() => {
    return materials.map((m) => ({
      id: m.id,
      title: m.title,
      toolType: m.toolType,
      createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt),
    }));
  }, [materials]);

  // Search hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching,
    hasSearched,
    clearSearch,
  } = useMaterialsSearch(searchableMaterials);

  // Collections hook
  const {
    collections: _collections, // Available for future features
    collectionTree,
    selectedCollectionId,
    selectCollection,
    createCollection: _createCollection, // Available for future features
  } = useCollections({
    initialCollections: initialCollections.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      materialCount: c.count,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    onCreateCollection: async (col) => {
      if (onCreateCollection) {
        await onCreateCollection(col.name, col.parentId);
      }
    },
    onMoveToCollection: async (ids, colId) => {
      if (onMoveMaterials) {
        await onMoveMaterials(ids, colId);
      }
    },
  });

  // Filter materials based on search and selection
  const displayedMaterials = useMemo<KnowledgeHubMaterial[]>(() => {
    if (hasSearched && searchResults.length > 0) {
      const searchIds = new Set(searchResults.map((r) => r.item.id));
      return materials.filter((m: KnowledgeHubMaterial) => searchIds.has(m.id));
    }
    if (hasSearched) {
      return [];
    }
    if (selectedCollectionId) {
      return materials.filter((m: KnowledgeHubMaterial) => m.collectionId === selectedCollectionId);
    }
    return materials;
  }, [materials, searchResults, hasSearched, selectedCollectionId]);

  // Handlers
  const handleSelectMaterial = useCallback(
    (material: KnowledgeHubMaterial) => {
      onOpenMaterial?.(material);
    },
    [onOpenMaterial]
  );

  const handleFindSimilar = useCallback((toolId: string) => {
    setSimilarToolId(toolId);
  }, []);

  const handleSelectSimilar = useCallback((toolId: string) => {
    const target = materials.find((m) => (m.toolId ?? m.id) === toolId);
    if (target) {
      onOpenMaterial?.(target);
    }
    setSimilarToolId(null);
  }, [materials, onOpenMaterial]);

  const handleToggleMaterialSelection = useCallback((id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Preview on hover - currently unused, will be connected in future UX update
  const _handleMaterialHover = useCallback((material: KnowledgeHubMaterial | null) => {
    setPreviewMaterial(material);
  }, []);

  // Render current view
  const renderView = () => {
    const commonProps = {
      materials: displayedMaterials,
      onSelectMaterial: handleSelectMaterial,
      onFindSimilar: handleFindSimilar,
      selectedMaterialIds,
      onToggleMaterialSelection: handleToggleMaterialSelection,
    };

    switch (viewMode) {
      case 'explorer':
        return (
          <ExplorerView
            {...commonProps}
            collections={collectionTree}
            selectedCollectionId={selectedCollectionId}
            expandedFolders={expandedFolders}
            onSelectCollection={selectCollection}
            onToggleFolder={handleToggleFolder}
          />
        );
      case 'gallery':
        return <GalleryView {...commonProps} cardSize="medium" />;
      case 'timeline':
        return <TimelineView {...commonProps} />;
      case 'calendar':
        return <CalendarView {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-slate-50 dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Knowledge Hub
          </h1>

          {/* View Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
            {VIEW_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={viewMode === option.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(option.id)}
                className={cn(
                  'gap-2',
                  viewMode === option.id && 'bg-white dark:bg-slate-600 shadow-sm'
                )}
                title={option.description}
                aria-label={option.label}
                aria-pressed={viewMode === option.id}
              >
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca materiali..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-8 h-9 rounded-lg border',
              'border-slate-200 dark:border-slate-600',
              'bg-white dark:bg-slate-700',
              'text-sm text-slate-900 dark:text-white',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
            )}
            aria-label="Cerca materiali"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600"
              aria-label="Cancella ricerca"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        {!isSidebarCollapsed && viewMode !== 'explorer' && (
          <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            <SidebarNavigation
              collections={collectionTree}
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={selectCollection}
              onCreateCollection={() => {
                // Open collection creation dialog
              }}
              tags={[]}
              onToggleTag={() => {}}
            />
          </div>
        )}

        {/* Main View */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                renderView()
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Preview Panel (Task 7.16) */}
        <AnimatePresence>
          {previewMaterial && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-4 w-80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Anteprima
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewMaterial(null)}
                    aria-label="Chiudi anteprima"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <MaterialCard
                  material={{
                    id: previewMaterial.id,
                    title: previewMaterial.title,
                    type: previewMaterial.toolType,
                    createdAt: previewMaterial.createdAt instanceof Date
                      ? previewMaterial.createdAt
                      : new Date(previewMaterial.createdAt),
                    updatedAt: previewMaterial.updatedAt
                      ? (previewMaterial.updatedAt instanceof Date
                          ? previewMaterial.updatedAt
                          : new Date(previewMaterial.updatedAt))
                      : (previewMaterial.createdAt instanceof Date
                          ? previewMaterial.createdAt
                          : new Date(previewMaterial.createdAt)),
                    tags: previewMaterial.tags,
                    isFavorite: previewMaterial.isFavorite,
                  }}
                  onOpen={() => handleSelectMaterial(previewMaterial)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar Toggle */}
      {viewMode !== 'explorer' && (
        <button
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 z-10',
            'p-1 rounded-r-lg',
            'bg-white dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
            'transition-colors'
          )}
          aria-label={isSidebarCollapsed ? 'Mostra sidebar' : 'Nascondi sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Selection Status Bar */}
      <AnimatePresence>
        {selectedMaterialIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg flex items-center gap-4"
          >
            <span className="text-sm">
              {selectedMaterialIds.size} materiali selezionati
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedMaterialIds(new Set())}
              >
                Deseleziona
              </Button>
              {onDeleteMaterials && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteMaterials(Array.from(selectedMaterialIds))}
                >
                  Elimina
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SimilarMaterialsPanel
        open={!!similarToolId}
        toolId={similarToolId ?? undefined}
        onClose={() => setSimilarToolId(null)}
        onSelect={handleSelectSimilar}
      />
    </div>
  );
}
