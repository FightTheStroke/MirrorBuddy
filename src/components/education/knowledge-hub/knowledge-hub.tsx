'use client';

/**
 * Knowledge Hub Main Component
 * Unified interface for browsing, organizing, and previewing saved materials
 *
 * Phase 7: Tasks 7.14-7.16
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SimilarMaterialsPanel } from './components/similar-materials-panel';
import { type KnowledgeHubMaterial } from './views';
import { useMaterialsSearch } from './hooks/use-materials-search';
import { useCollections } from './hooks/use-collections';
import type { SearchableMaterial } from '@/lib/search/searchable-text';
import type { ViewMode, KnowledgeHubProps } from './knowledge-hub/types';
import { KnowledgeHubHeader } from './header';
import { PreviewPanel } from './preview-panel';
import { SelectionStatusBar } from './status-bar';
import { KnowledgeHubSidebar } from './sidebar';
import { MainView } from './main-view';

export type { ViewMode, ViewOption, KnowledgeHubProps } from './knowledge-hub/types';
export type { KnowledgeHubPropsInternal } from './types';

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

  // Convert materials for search
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
  const { collectionTree, selectedCollectionId, selectCollection } = useCollections({
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
      onCreateCollection?.(col.name, col.parentId);
    },
    onMoveToCollection: async (ids, colId) => {
      onMoveMaterials?.(ids, colId);
    },
  });

  // Filter materials
  const displayedMaterials = useMemo<KnowledgeHubMaterial[]>(() => {
    if (hasSearched && searchResults.length > 0) {
      const searchIds = new Set(searchResults.map((r) => r.item.id));
      return materials.filter((m) => searchIds.has(m.id));
    }
    if (hasSearched) return [];
    if (selectedCollectionId) {
      return materials.filter((m) => m.collectionId === selectedCollectionId);
    }
    return materials;
  }, [materials, searchResults, hasSearched, selectedCollectionId]);

  // Handlers
  const handleSelectMaterial = useCallback(
    (material: KnowledgeHubMaterial) => onOpenMaterial?.(material),
    [onOpenMaterial]
  );

  const handleFindSimilar = useCallback((toolId: string) => {
    setSimilarToolId(toolId);
  }, []);

  const handleSelectSimilar = useCallback((toolId: string) => {
    const target = materials.find((m) => (m.toolId ?? m.id) === toolId);
    if (target) onOpenMaterial?.(target);
    setSimilarToolId(null);
  }, [materials, onOpenMaterial]);

  const handleToggleMaterialSelection = useCallback((id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      return next.has(id) ? (next.delete(id), next) : (next.add(id), next);
    });
  }, []);

  const handleToggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      return next.has(id) ? (next.delete(id), next) : (next.add(id), next);
    });
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-slate-50 dark:bg-slate-900', className)}>
      <KnowledgeHubHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={clearSearch}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <KnowledgeHubSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          viewMode={viewMode}
          collections={collectionTree}
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={selectCollection}
        />

        <MainView
          viewMode={viewMode}
          isSearching={isSearching}
          displayedMaterials={displayedMaterials}
          selectedMaterialIds={selectedMaterialIds}
          expandedFolders={expandedFolders}
          collectionTree={collectionTree}
          selectedCollectionId={selectedCollectionId}
          onSelectMaterial={handleSelectMaterial}
          onFindSimilar={handleFindSimilar}
          onToggleMaterialSelection={handleToggleMaterialSelection}
          onSelectCollection={selectCollection}
          onToggleFolder={handleToggleFolder}
        />

        <PreviewPanel
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
          onOpenMaterial={handleSelectMaterial}
        />
      </div>

      <SelectionStatusBar
        selectedCount={selectedMaterialIds.size}
        onDeselectAll={() => setSelectedMaterialIds(new Set())}
        onDelete={
          onDeleteMaterials
            ? () => onDeleteMaterials(Array.from(selectedMaterialIds))
            : undefined
        }
      />

      <SimilarMaterialsPanel
        open={!!similarToolId}
        toolId={similarToolId ?? undefined}
        onClose={() => setSimilarToolId(null)}
        onSelect={handleSelectSimilar}
      />
    </div>
  );
}
