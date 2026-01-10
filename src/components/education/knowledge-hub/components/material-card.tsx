/**
 * Knowledge Hub Material Card
 * Displays a single material with actions, selection, and drag support.
 * WCAG 2.1 AA compliant with keyboard navigation.
 */

'use client';

import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { Star, MoreVertical, GripVertical, Check, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaterialCardProps } from './material-card/types';
import { TYPE_ICONS, TYPE_COLORS, TYPE_LABELS } from './material-card/constants';
import { formatDate } from './material-card/utils';
import { MaterialMenu } from './material-card/components/material-menu';

export function MaterialCard({
  material,
  isSelected = false,
  onSelect,
  onToggleFavorite,
  onOpen,
  onDelete,
  onArchive,
  onMove,
  onAddTags,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onKeyboardMove,
  isDraggable = false,
  compact = false,
  className,
}: MaterialCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    onOpen?.(material.id);
  }, [material.id, onOpen]);

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(material.id, !isSelected);
    },
    [material.id, isSelected, onSelect]
  );

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite?.(material.id);
    },
    [material.id, onToggleFavorite]
  );

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!isDraggable) return;
      setIsDragging(true);
      e.dataTransfer.setData('text/plain', material.id);
      e.dataTransfer.effectAllowed = 'move';
      onDragStart?.(material.id);
    },
    [isDraggable, material.id, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  const handleDragKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isDraggable || !onKeyboardMove) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onKeyboardMove(material.id, 'up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onKeyboardMove(material.id, 'down');
      }
    },
    [isDraggable, material.id, onKeyboardMove]
  );

  const handleCardKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      } else if (e.key === 'Delete' && onDelete) {
        e.preventDefault();
        onDelete(material.id);
      }
    },
    [handleClick, material.id, onDelete]
  );

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onKeyDown={handleCardKeyDown}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'group relative rounded-xl border transition-all duration-200',
        'bg-white dark:bg-slate-800',
        'border-slate-200 dark:border-slate-700',
        'hover:border-accent-themed hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-accent-themed focus:ring-offset-2',
        'cursor-pointer',
        isSelected && 'border-accent-themed bg-accent-themed/5',
        isDragging && 'opacity-50 cursor-grabbing',
        compact ? 'p-3' : 'p-4',
        className
      )}
      role="option"
      tabIndex={0}
      aria-label={`${material.title}, ${TYPE_LABELS[material.type]}${isSelected ? ', selezionato' : ''}`}
      aria-selected={isSelected}
    >
      {isDraggable && (
        <button
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2',
            'p-1 rounded opacity-0 group-hover:opacity-100',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-accent-themed focus:opacity-100',
            'cursor-grab transition-opacity'
          )}
          onKeyDown={handleDragKeyDown}
          aria-label="Trascina per riordinare. Usa frecce su/giù per spostare."
          tabIndex={0}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {onSelect && (
        <button
          onClick={handleSelect}
          className={cn(
            'absolute right-2 top-2 p-1 rounded',
            'border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-accent-themed',
            isSelected
              ? 'bg-accent-themed border-accent-themed text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-accent-themed',
            compact ? 'w-5 h-5' : 'w-6 h-6'
          )}
          aria-label={isSelected ? 'Deseleziona' : 'Seleziona'}
          aria-pressed={isSelected}
        >
          {isSelected && <Check className="w-full h-full" />}
        </button>
      )}

      <div className={cn('flex gap-3', isDraggable && 'ml-6')}>
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            TYPE_COLORS[material.type],
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}
        >
          {TYPE_ICONS[material.type]}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-medium text-slate-900 dark:text-slate-100 truncate',
              compact ? 'text-sm' : 'text-base'
            )}
          >
            {material.title}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                TYPE_COLORS[material.type]
              )}
            >
              {TYPE_LABELS[material.type]}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(material.updatedAt)}
            </span>
          </div>

          {!compact && material.tags && material.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {material.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
              {material.tags.length > 3 && (
                <span className="text-xs text-slate-500">
                  +{material.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-1">
          {onToggleFavorite && (
            <button
              onClick={handleFavorite}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent-themed',
                material.isFavorite
                  ? 'text-amber-500'
                  : 'text-slate-400 hover:text-amber-500'
              )}
              aria-label={
                material.isFavorite
                  ? 'Rimuovi dai preferiti'
                  : 'Aggiungi ai preferiti'
              }
              aria-pressed={material.isFavorite}
            >
              <Star
                className={cn('w-4 h-4', material.isFavorite && 'fill-current')}
              />
            </button>
          )}

          <div ref={menuRef} className="relative">
            <button
              onClick={handleMenuToggle}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-accent-themed'
              )}
              aria-label="Altre azioni"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <MaterialMenu
              isOpen={isMenuOpen}
              onClose={handleMenuClose}
              onOpen={onOpen}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onAddTags={onAddTags}
              onArchive={onArchive}
              onDelete={onDelete}
              materialId={material.id}
              menuRef={menuRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { Material, MaterialCardProps } from './material-card/types';
