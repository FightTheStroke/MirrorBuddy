'use client';

/**
 * Knowledge Hub Material Card
 *
 * Displays a single material with actions, selection, and drag support.
 * WCAG 2.1 AA compliant with keyboard navigation.
 */

import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import {
  Brain,
  HelpCircle,
  Layers,
  FileText,
  Star,
  MoreVertical,
  GripVertical,
  Check,
  Trash2,
  Archive,
  FolderInput,
  Tag,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/types/tools';

export interface Material {
  id: string;
  title: string;
  type: ToolType;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  collectionId?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  thumbnail?: string;
}

export interface MaterialCardProps {
  /** Material data */
  material: Material;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Callback when selection changes */
  onSelect?: (id: string, selected: boolean) => void;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (id: string) => void;
  /** Callback to open material */
  onOpen?: (id: string) => void;
  /** Callback to delete material */
  onDelete?: (id: string) => void;
  /** Callback to archive material */
  onArchive?: (id: string) => void;
  /** Callback to move material */
  onMove?: (id: string) => void;
  /** Callback to add tags */
  onAddTags?: (id: string) => void;
  /** Callback to duplicate material */
  onDuplicate?: (id: string) => void;
  /** Drag start callback for reordering */
  onDragStart?: (id: string) => void;
  /** Drag end callback */
  onDragEnd?: () => void;
  /** Keyboard move callback (for accessibility) */
  onKeyboardMove?: (id: string, direction: 'up' | 'down') => void;
  /** Whether drag is enabled */
  isDraggable?: boolean;
  /** Compact view mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const TYPE_ICONS: Record<ToolType, React.ReactNode> = {
  mindmap: <Brain className="w-4 h-4" />,
  quiz: <HelpCircle className="w-4 h-4" />,
  flashcard: <Layers className="w-4 h-4" />,
  summary: <FileText className="w-4 h-4" />,
  demo: <FileText className="w-4 h-4" />,
  diagram: <FileText className="w-4 h-4" />,
  timeline: <FileText className="w-4 h-4" />,
  formula: <FileText className="w-4 h-4" />,
  chart: <FileText className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  webcam: <FileText className="w-4 h-4" />,
  homework: <FileText className="w-4 h-4" />,
  search: <FileText className="w-4 h-4" />,
};

const TYPE_COLORS: Record<ToolType, string> = {
  mindmap: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  quiz: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  flashcard: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  summary: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  demo: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
  diagram: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  timeline: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  formula: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  chart: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  pdf: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  webcam: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  homework: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  search: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
};

const TYPE_LABELS: Record<ToolType, string> = {
  mindmap: 'Mappa Mentale',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  summary: 'Riassunto',
  demo: 'Demo',
  diagram: 'Diagramma',
  timeline: 'Timeline',
  formula: 'Formula',
  chart: 'Grafico',
  pdf: 'PDF',
  webcam: 'Immagine',
  homework: 'Compito',
  search: 'Ricerca',
};

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;

  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Material card component for Knowledge Hub.
 */
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

  // Handle card click (open)
  const handleClick = useCallback(() => {
    onOpen?.(material.id);
  }, [material.id, onOpen]);

  // Handle selection
  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(material.id, !isSelected);
    },
    [material.id, isSelected, onSelect]
  );

  // Handle favorite toggle
  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite?.(material.id);
    },
    [material.id, onToggleFavorite]
  );

  // Menu toggle
  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }, []);

  // Close menu on outside click
  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Menu action wrapper
  const menuAction = useCallback(
    (action: ((id: string) => void) | undefined) => {
      return (e: React.MouseEvent) => {
        e.stopPropagation();
        action?.(material.id);
        setIsMenuOpen(false);
      };
    },
    [material.id]
  );

  // Drag handlers
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

  // Keyboard navigation for drag handle (accessibility alternative)
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

  // Card keyboard handler
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
      {/* Drag handle - keyboard accessible */}
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

      {/* Selection checkbox */}
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

      {/* Content */}
      <div className={cn('flex gap-3', isDraggable && 'ml-6')}>
        {/* Type icon */}
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            TYPE_COLORS[material.type],
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}
        >
          {TYPE_ICONS[material.type]}
        </div>

        {/* Info */}
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

          {/* Tags */}
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

        {/* Actions */}
        <div className="flex items-start gap-1">
          {/* Favorite button */}
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

          {/* Context menu */}
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

            {isMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={handleMenuClose}
                  aria-hidden="true"
                />

                {/* Menu */}
                <div
                  className={cn(
                    'absolute right-0 top-full mt-1 z-50',
                    'min-w-40 py-1 rounded-xl shadow-lg',
                    'bg-white dark:bg-slate-800',
                    'border border-slate-200 dark:border-slate-700'
                  )}
                  role="menu"
                  aria-label="Azioni materiale"
                >
                  {onOpen && (
                    <button
                      onClick={menuAction(onOpen)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apri
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={menuAction(onDuplicate)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <Copy className="w-4 h-4" />
                      Duplica
                    </button>
                  )}
                  {onMove && (
                    <button
                      onClick={menuAction(onMove)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <FolderInput className="w-4 h-4" />
                      Sposta
                    </button>
                  )}
                  {onAddTags && (
                    <button
                      onClick={menuAction(onAddTags)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <Tag className="w-4 h-4" />
                      Aggiungi tag
                    </button>
                  )}
                  {onArchive && (
                    <button
                      onClick={menuAction(onArchive)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <Archive className="w-4 h-4" />
                      Archivia
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                      <button
                        onClick={menuAction(onDelete)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        role="menuitem"
                      >
                        <Trash2 className="w-4 h-4" />
                        Elimina
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
