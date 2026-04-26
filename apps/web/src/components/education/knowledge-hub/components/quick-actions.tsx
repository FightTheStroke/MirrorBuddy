'use client';

/**
 * Knowledge Hub Quick Actions
 *
 * Quick action buttons for common material operations.
 */

import { Plus, Upload, FolderPlus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

export interface QuickActionsProps {
  /** Callback to create new material */
  onCreateMaterial?: () => void;
  /** Callback to upload file */
  onUploadFile?: () => void;
  /** Callback to create folder */
  onCreateFolder?: () => void;
  /** Callback to create tag */
  onCreateTag?: () => void;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  compact?: boolean;
  variant?: 'primary' | 'secondary';
}

function ActionButton({
  icon,
  label,
  onClick,
  compact,
  variant = 'secondary',
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-accent-themed focus:ring-offset-2',
        compact ? 'p-2' : 'px-3 py-2',
        variant === 'primary'
          ? 'bg-accent-themed text-white hover:brightness-110'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      )}
      aria-label={label}
      title={compact ? label : undefined}
    >
      {icon}
      {!compact && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

/**
 * Quick action buttons for Knowledge Hub.
 */
export function QuickActions({
  onCreateMaterial,
  onUploadFile,
  onCreateFolder,
  onCreateTag,
  compact = false,
  className,
}: QuickActionsProps) {
  const t = useTranslations("education");
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="toolbar"
      aria-label={t("azioniRapide")}
    >
      {onCreateMaterial && (
        <ActionButton
          icon={<Plus className="w-4 h-4" />}
          label="Nuovo materiale"
          onClick={onCreateMaterial}
          compact={compact}
          variant="primary"
        />
      )}
      {onUploadFile && (
        <ActionButton
          icon={<Upload className="w-4 h-4" />}
          label="Carica file"
          onClick={onUploadFile}
          compact={compact}
        />
      )}
      {onCreateFolder && (
        <ActionButton
          icon={<FolderPlus className="w-4 h-4" />}
          label="Nuova cartella"
          onClick={onCreateFolder}
          compact={compact}
        />
      )}
      {onCreateTag && (
        <ActionButton
          icon={<Tag className="w-4 h-4" />}
          label="Nuovo tag"
          onClick={onCreateTag}
          compact={compact}
        />
      )}
    </div>
  );
}
