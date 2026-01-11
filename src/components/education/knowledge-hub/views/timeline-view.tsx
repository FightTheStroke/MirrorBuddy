'use client';

/**
 * Timeline View
 * Chronological timeline of materials
 *
 * Phase 7: Task 7.11
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
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

export interface TimelineViewProps {
  materials: KnowledgeHubMaterial[];
  onSelectMaterial: (material: KnowledgeHubMaterial) => void;
  onFindSimilar?: (toolId: string) => void;
  selectedMaterialIds?: Set<string>;
  onToggleMaterialSelection?: (id: string) => void;
  className?: string;
}

interface TimelineGroup {
  date: string;
  label: string;
  materials: KnowledgeHubMaterial[];
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const materialDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (materialDate.getTime() === today.getTime()) {
    return 'Oggi';
  }
  if (materialDate.getTime() === yesterday.getTime()) {
    return 'Ieri';
  }

  const diffDays = Math.floor((today.getTime() - materialDate.getTime()) / 86400000);
  if (diffDays < 7) {
    return date.toLocaleDateString('it-IT', { weekday: 'long' });
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} settimane fa`;
  }

  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function TimelineView({
  materials,
  onSelectMaterial,
  onFindSimilar,
  selectedMaterialIds = new Set(),
  onToggleMaterialSelection,
  className,
}: TimelineViewProps) {
  // Group materials by date
  const groups = useMemo<TimelineGroup[]>(() => {
    const groupMap = new Map<string, KnowledgeHubMaterial[]>();

    // Sort materials by date, newest first
    const sorted = [...materials].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    sorted.forEach((material) => {
      const date = new Date(material.createdAt);
      const key = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(material);
    });

    return Array.from(groupMap.entries()).map(([dateKey, mats]) => ({
      date: dateKey,
      label: formatDateLabel(new Date(dateKey)),
      materials: mats,
    }));
  }, [materials]);

  return (
    <div className={cn('p-4', className)}>
      <AnimatePresence mode="popLayout">
        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-64 text-slate-400"
          >
            Nessun materiale trovato
          </motion.div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-8">
              {groups.map((group, groupIndex) => (
                <motion.div
                  key={group.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                  className="relative"
                >
                  {/* Date marker */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center z-10 border-4 border-white dark:border-slate-900">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {group.label}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {group.materials.length} material{group.materials.length !== 1 ? 'i' : 'e'}
                      </p>
                    </div>
                  </div>

                  {/* Materials for this date */}
                  <div className="ml-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.materials.map((material, index) => (
                      <motion.div
                        key={material.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groupIndex * 0.1 + index * 0.03 }}
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
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
