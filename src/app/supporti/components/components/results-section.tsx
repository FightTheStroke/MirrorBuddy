/**
 * @file results-section.tsx
 * @brief Results section component
 */

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { GridView, ListView, EmptyState } from '@/components/education/archive';
import { containerVariants } from '../constants';
import type { ArchiveItem, FilterType } from '@/components/education/archive';
import type { ToolType } from '@/types/tools';
import { TOOL_LABELS } from '@/components/education/archive';

interface ResultsSectionProps {
  isLoading: boolean;
  filtered: ArchiveItem[];
  viewMode: 'grid' | 'list';
  typeFilter: string;
  debouncedQuery: string;
  onDelete: (toolId: string) => void;
  onView: (item: ArchiveItem) => void;
  onBookmark: (toolId: string, isBookmarked: boolean) => void;
  onRate: (toolId: string, userRating: number) => void;
}

export function ResultsSection({
  isLoading,
  filtered,
  viewMode,
  typeFilter,
  debouncedQuery,
  onDelete,
  onView,
  onBookmark,
  onRate,
}: ResultsSectionProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-4 text-sm text-slate-600 dark:text-slate-400"
      >
        {filtered.length} {filtered.length === 1 ? 'materiale' : 'materiali'}
        {debouncedQuery && ` per "${debouncedQuery}"`}
        {typeFilter && typeFilter !== 'all' && (
          <span>
            {' '}
            in {TOOL_LABELS[typeFilter as ToolType] || typeFilter}
          </span>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-slate-600 dark:text-slate-400">
            Caricamento materiali...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState filter={(typeFilter || 'all') as FilterType} />
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {viewMode === 'grid' ? (
            <GridView
              items={filtered}
              onDelete={onDelete}
              onView={onView}
              onBookmark={onBookmark}
              onRate={onRate}
            />
          ) : (
            <ListView
              items={filtered}
              onDelete={onDelete}
              onView={onView}
              onBookmark={onBookmark}
              onRate={onRate}
            />
          )}
        </motion.div>
      )}
    </>
  );
}

