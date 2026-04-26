/**
 * Knowledge Hub Main View Area
 * Renders different views based on view mode
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  ExplorerView,
  GalleryView,
  TimelineView,
  CalendarView,
  type KnowledgeHubMaterial,
} from './views';
import type { ViewMode } from './knowledge-hub/types';
import type { Collection } from './components/sidebar-navigation';

interface MainViewProps {
  viewMode: ViewMode;
  isSearching: boolean;
  displayedMaterials: KnowledgeHubMaterial[];
  selectedMaterialIds: Set<string>;
  expandedFolders: Set<string>;
  collectionTree: Collection[];
  selectedCollectionId: string | null;
  onSelectMaterial: (material: KnowledgeHubMaterial) => void;
  onFindSimilar: (toolId: string) => void;
  onToggleMaterialSelection: (id: string) => void;
  onSelectCollection: (id: string | null) => void;
  onToggleFolder: (id: string) => void;
}

export function MainView({
  viewMode,
  isSearching,
  displayedMaterials,
  selectedMaterialIds,
  expandedFolders,
  collectionTree,
  selectedCollectionId,
  onSelectMaterial,
  onFindSimilar,
  onToggleMaterialSelection,
  onSelectCollection,
  onToggleFolder,
}: MainViewProps) {
  const commonProps = {
    materials: displayedMaterials,
    onSelectMaterial,
    onFindSimilar,
    selectedMaterialIds,
    onToggleMaterialSelection,
  };

  const renderView = () => {
    switch (viewMode) {
      case 'explorer':
        return (
          <ExplorerView
            {...commonProps}
            collections={collectionTree}
            selectedCollectionId={selectedCollectionId}
            expandedFolders={expandedFolders}
            onSelectCollection={onSelectCollection}
            onToggleFolder={onToggleFolder}
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
  );
}
