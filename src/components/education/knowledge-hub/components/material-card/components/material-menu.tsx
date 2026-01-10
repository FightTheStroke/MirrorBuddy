/**
 * Material context menu component
 */

'use client';

import {
  ExternalLink,
  Copy,
  FolderInput,
  Tag,
  Archive,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaterialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMove?: (id: string) => void;
  onAddTags?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  materialId: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export function MaterialMenu({
  isOpen,
  onClose,
  onOpen,
  onDuplicate,
  onMove,
  onAddTags,
  onArchive,
  onDelete,
  materialId,
  menuRef,
}: MaterialMenuProps) {
  const menuAction = (action: ((id: string) => void) | undefined) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      action?.(materialId);
      onClose();
    };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
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
  );
}
