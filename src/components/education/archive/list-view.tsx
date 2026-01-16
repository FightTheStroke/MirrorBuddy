'use client';

/**
 * List View Component
 * Displays materials in a vertical list layout
 * Uses React.memo to prevent unnecessary re-renders
 */

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Eye, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOOL_ICONS, TOOL_LABELS } from './constants';
import { StarRating } from './star-rating';
import { formatDate } from './utils';
import type { ArchiveItemViewProps, ArchiveItem } from './types';

// Memoized row component to prevent re-renders when other rows change
interface ListRowProps {
  item: ArchiveItem;
  index: number;
  onDelete: (toolId: string) => void;
  onView: (item: ArchiveItem) => void;
  onBookmark: (toolId: string, bookmarked: boolean) => void;
  onRate: (toolId: string, rating: number) => void;
}

const ListRow = memo(function ListRow({
  item,
  index,
  onDelete,
  onView,
  onBookmark,
  onRate,
}: ListRowProps) {
  const Icon = TOOL_ICONS[item.toolType];
  const label = TOOL_LABELS[item.toolType];

  // Memoized handlers to prevent child re-renders
  const handleRowClick = useCallback(() => onView(item), [onView, item]);
  const handleBookmarkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark(item.toolId, !item.isBookmarked);
  }, [onBookmark, item.toolId, item.isBookmarked]);
  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onView(item);
  }, [onView, item]);
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.toolId);
  }, [onDelete, item.toolId]);
  const handleRate = useCallback((rating: number) => {
    onRate(item.toolId, rating);
  }, [onRate, item.toolId]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03 }}
      className="group flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
      onClick={handleRowClick}
    >
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-slate-900 dark:text-white truncate">
            {item.title || `${label} del ${formatDate(item.createdAt)}`}
          </h3>
          {item.isBookmarked && (
            <BookmarkCheck className="w-4 h-4 text-primary shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <StarRating rating={item.userRating} onRate={handleRate} size="sm" />
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
            {item.viewCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <Eye className="w-3 h-3" />
                <span>{item.viewCount}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleBookmarkClick}
          aria-label={item.isBookmarked ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        >
          {item.isBookmarked ? (
            <BookmarkCheck className="w-4 h-4 text-primary" />
          ) : (
            <Bookmark className="w-4 h-4 text-slate-400 hover:text-primary" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleViewClick}
          aria-label="Apri"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDeleteClick}
          aria-label="Elimina"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </motion.div>
  );
});

export function ListView({
  items,
  onDelete,
  onView,
  onBookmark,
  onRate,
}: ArchiveItemViewProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <ListRow
            key={item.toolId}
            item={item}
            index={index}
            onDelete={onDelete}
            onView={onView}
            onBookmark={onBookmark}
            onRate={onRate}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
