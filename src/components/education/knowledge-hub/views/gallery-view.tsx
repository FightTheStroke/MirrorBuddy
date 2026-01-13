'use client';

/**
 * Gallery View
 * Grid layout with larger thumbnails/previews
 *
 * Phase 7: Task 7.10
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MaterialCard, type Material } from '../components/material-card';
import type { KnowledgeHubMaterial } from './explorer-view';

/** Convert KnowledgeHubMaterial to Material for MaterialCard */
function toMaterial(m: KnowledgeHubMaterial): Material {
  return {
    id: m.id,
    title: m.title,
    type: m.toolType,
    createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt),
    updatedAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt),
    collectionId: m.collectionId,
    isFavorite: m.isFavorite,
    isArchived: m.isArchived,
    tags: m.tags,
  };
}

export interface GalleryViewProps {
  materials: KnowledgeHubMaterial[];
  onSelectMaterial: (material: KnowledgeHubMaterial) => void;
  onFindSimilar?: (toolId: string) => void;
  selectedMaterialIds?: Set<string>;
  onToggleMaterialSelection?: (id: string) => void;
  /** Size of gallery cards: 'small' | 'medium' | 'large' */
  cardSize?: 'small' | 'medium' | 'large';
  className?: string;
}

const GRID_CLASSES = {
  small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const CARD_CLASSES = {
  small: 'h-32',
  medium: 'h-48',
  large: 'h-64',
};

export function GalleryView({
  materials,
  onSelectMaterial,
  onFindSimilar,
  selectedMaterialIds = new Set(),
  onToggleMaterialSelection,
  cardSize = 'medium',
  className,
}: GalleryViewProps) {
  // Group materials by type for visual variety
  const sortedMaterials = useMemo(() => {
    return [...materials].sort((a, b) => {
      // Sort by creation date, newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [materials]);

  return (
    <div className={cn('p-4', className)}>
      <AnimatePresence mode="popLayout">
        {sortedMaterials.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-64 text-slate-400"
          >
            Nessun materiale trovato
          </motion.div>
        ) : (
          <div className={cn('grid gap-4', GRID_CLASSES[cardSize])}>
            {sortedMaterials.map((material, index) => (
              <motion.div
                key={material.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
                className={CARD_CLASSES[cardSize]}
              >
                <MaterialCard
                  material={toMaterial(material)}
                  onOpen={() => onSelectMaterial(material)}
                  onFindSimilar={
                    onFindSimilar
                      ? () => onFindSimilar(material.toolId ?? material.id)
                      : undefined
                  }
                  isSelected={selectedMaterialIds.has(material.id)}
                  onSelect={
                    onToggleMaterialSelection
                      ? () => onToggleMaterialSelection(material.id)
                      : undefined
                  }
                  className="h-full"
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
