'use client';

/**
 * Knowledge Hub Bulk Toolbar
 *
 * Toolbar for bulk operations on selected materials.
 * Appears when materials are selected.
 */

import { Trash2, FolderInput, Tag, Archive, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

export interface BulkToolbarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to move selected items */
  onMove?: () => void;
  /** Callback to add tags to selected items */
  onAddTags?: () => void;
  /** Callback to archive selected items */
  onArchive?: () => void;
  /** Callback to restore selected items (if viewing archived) */
  onRestore?: () => void;
  /** Callback to delete selected items */
  onDelete?: () => void;
  /** Whether viewing archived materials */
  isArchiveView?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}

function ToolbarButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
        'transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'danger'
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-accent-themed'
      )}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Bulk action toolbar for selected materials.
 */
export function BulkToolbar({
  selectedCount,
  onClearSelection,
  onMove,
  onAddTags,
  onArchive,
  onRestore,
  onDelete,
  isArchiveView = false,
  className,
}: BulkToolbarProps) {
  const t = useTranslations("education");
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-2 rounded-xl',
        'bg-accent-themed/10 border border-accent-themed/20',
        className
      )}
      role="toolbar"
      aria-label={t("azioniPerElementi", { count: selectedCount })}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className={cn(
            'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-accent-themed'
          )}
          aria-label={t("deselezionaTutto")}
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-accent-themed">
          {selectedCount} {selectedCount === 1 ? 'selezionato' : 'selezionati'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onMove && (
          <ToolbarButton
            icon={<FolderInput className="w-4 h-4" />}
            label="Sposta"
            onClick={onMove}
          />
        )}
        {onAddTags && (
          <ToolbarButton
            icon={<Tag className="w-4 h-4" />}
            label="Aggiungi tag"
            onClick={onAddTags}
          />
        )}
        {!isArchiveView && onArchive && (
          <ToolbarButton
            icon={<Archive className="w-4 h-4" />}
            label="Archivia"
            onClick={onArchive}
          />
        )}
        {isArchiveView && onRestore && (
          <ToolbarButton
            icon={<RotateCcw className="w-4 h-4" />}
            label="Ripristina"
            onClick={onRestore}
          />
        )}
        {onDelete && (
          <ToolbarButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Elimina"
            onClick={onDelete}
            variant="danger"
          />
        )}
      </div>
    </div>
  );
}
