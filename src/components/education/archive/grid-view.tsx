'use client';

/**
 * Grid View Component
 * Displays materials in a responsive grid layout
 * Uses React.memo to prevent unnecessary re-renders
 */

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Eye, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { TOOL_ICONS, TOOL_LABELS } from './constants';
import { ThumbnailPreview } from './thumbnail-preview';
import { StarRating } from './star-rating';
import { formatDate } from './utils';
import type { ArchiveItemViewProps, ArchiveItem } from './types';

// Memoized card component to prevent re-renders when other cards change
interface GridCardProps {
  item: ArchiveItem;
  index: number;
  onDelete: (toolId: string) => void;
  onView: (item: ArchiveItem) => void;
  onBookmark: (toolId: string, bookmarked: boolean) => void;
  onRate: (toolId: string, rating: number) => void;
}

const GridCard = memo(function GridCard({
  item,
  index,
  onDelete,
  onView,
  onBookmark,
  onRate,
}: GridCardProps) {
  const Icon = TOOL_ICONS[item.toolType];
  const label = TOOL_LABELS[item.toolType];

  // Memoized handlers to prevent child re-renders
  const handleCardClick = useCallback(() => onView(item), [onView, item]);
  const handleBookmarkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark(item.toolId, !item.isBookmarked);
  }, [onBookmark, item.toolId, item.isBookmarked]);
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.toolId);
  }, [onDelete, item.toolId]);
  const handleRate = useCallback((rating: number) => {
    onRate(item.toolId, rating);
  }, [onRate, item.toolId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="group cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
        onClick={handleCardClick}
      >
        {/* Thumbnail Preview */}
        <div className="relative">
          <ThumbnailPreview item={item} />
          {/* Overlay actions */}
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-white/90 dark:bg-slate-900/90 shadow-sm"
              onClick={handleBookmarkClick}
              aria-label={item.isBookmarked ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            >
              {item.isBookmarked ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-slate-500" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-white/90 dark:bg-slate-900/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDeleteClick}
              aria-label="Elimina"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
          {/* Type badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm">
            <Icon className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{label}</span>
          </div>
        </div>
        <CardContent className="pt-3 pb-3">
          <CardTitle className="text-sm line-clamp-2 mb-2">
            {item.title || `${label} del ${formatDate(item.createdAt)}`}
          </CardTitle>
          <div className="flex items-center justify-between mb-1">
            <StarRating rating={item.userRating} onRate={handleRate} />
            {item.viewCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Eye className="w-3 h-3" />
                <span>{item.viewCount}</span>
              </div>
            )}
          </div>
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
});

export function GridView({
  items,
  onDelete,
  onView,
  onBookmark,
  onRate,
}: ArchiveItemViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <GridCard
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
