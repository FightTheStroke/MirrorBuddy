/**
 * Material context menu component
 */

"use client";

import {
  ExternalLink,
  Copy,
  FolderInput,
  Tag,
  Archive,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface MaterialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMove?: (id: string) => void;
  onAddTags?: (id: string) => void;
  onFindSimilar?: (id: string) => void;
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
  onFindSimilar,
  onArchive,
  onDelete,
  materialId,
  menuRef,
}: MaterialMenuProps) {
  const t = useTranslations("education.knowledge-hub");

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
          "absolute right-0 top-full mt-1 z-50",
          "min-w-40 py-1 rounded-xl shadow-lg",
          "bg-white dark:bg-slate-800",
          "border border-slate-200 dark:border-slate-700",
        )}
        role="menu"
        aria-label={t("material-menu.aria-label")}
      >
        {onOpen && (
          <button
            onClick={menuAction(onOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <ExternalLink className="w-4 h-4" />
            {t("material-menu.open")}
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={menuAction(onDuplicate)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <Copy className="w-4 h-4" />
            {t("material-menu.duplicate")}
          </button>
        )}
        {onMove && (
          <button
            onClick={menuAction(onMove)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <FolderInput className="w-4 h-4" />
            {t("material-menu.move")}
          </button>
        )}
        {onAddTags && (
          <button
            onClick={menuAction(onAddTags)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <Tag className="w-4 h-4" />
            {t("material-menu.add-tags")}
          </button>
        )}
        {onFindSimilar && (
          <button
            onClick={menuAction(onFindSimilar)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <Sparkles className="w-4 h-4" />
            {t("material-menu.find-similar")}
          </button>
        )}
        {onArchive && (
          <button
            onClick={menuAction(onArchive)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <Archive className="w-4 h-4" />
            {t("material-menu.archive")}
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
              {t("material-menu.delete")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
