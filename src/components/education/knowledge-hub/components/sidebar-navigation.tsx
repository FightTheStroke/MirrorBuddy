"use client";

/**
 * Knowledge Hub Sidebar Navigation
 *
 * Accessible sidebar with keyboard navigation for collections and filters.
 * WCAG 2.1 AA compliant with proper focus management.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Folder,
  FolderOpen,
  Tag,
  Clock,
  Star,
  Archive,
  Plus,
} from "lucide-react";
import { NavItem } from "./nav-item";
import { cn } from "@/lib/utils";

export interface Collection {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  count: number;
  parentId?: string | null;
  children?: Collection[];
}

export interface TagItem {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface SidebarNavigationProps {
  /** List of collections/folders */
  collections: Collection[];
  /** List of tags */
  tags: TagItem[];
  /** Currently selected collection ID */
  selectedCollectionId?: string | null;
  /** Currently selected tag IDs */
  selectedTagIds?: string[];
  /** Callback when collection is selected */
  onSelectCollection: (id: string | null) => void;
  /** Callback when tag is toggled */
  onToggleTag: (id: string) => void;
  /** Callback to create new collection */
  onCreateCollection?: () => void;
  /** Callback to create new tag */
  onCreateTag?: () => void;
  /** Show archived materials filter */
  showArchived?: boolean;
  /** Toggle archived filter */
  onToggleArchived?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sidebar navigation for Knowledge Hub with collections and tags.
 */
export function SidebarNavigation({
  collections,
  tags,
  selectedCollectionId,
  selectedTagIds = [],
  onSelectCollection,
  onToggleTag,
  onCreateCollection,
  onCreateTag,
  showArchived = false,
  onToggleArchived,
  className,
}: SidebarNavigationProps) {
  const t = useTranslations("education.knowledgeHub");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const renderCollection = (collection: Collection, level: number = 0) => {
    const hasChildren = collection.children && collection.children.length > 0;
    const isExpanded = expandedIds.has(collection.id);

    return (
      <div key={collection.id}>
        <NavItem
          icon={
            isExpanded ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )
          }
          label={collection.name}
          count={collection.count}
          isSelected={selectedCollectionId === collection.id}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          level={level}
          onClick={() => onSelectCollection(collection.id)}
          onExpand={() => toggleExpanded(collection.id)}
        />
        {hasChildren && isExpanded && (
          <div role="group">
            {collection.children!.map((child) =>
              renderCollection(child, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      className={cn("flex flex-col gap-4 p-4", className)}
      aria-label={t("sidebar.navigationAriaLabel")}
    >
      {/* Quick filters */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
          {t("sidebar.quickFiltersTitle")}
        </h2>
        <div role="tree" aria-label={t("sidebar.quickFiltersAriaLabel")}>
          <NavItem
            icon={<Clock className="w-4 h-4" />}
            label={t("sidebar.recent")}
            isSelected={
              selectedCollectionId === null && selectedTagIds.length === 0
            }
            onClick={() => onSelectCollection(null)}
          />
          <NavItem
            icon={<Star className="w-4 h-4" />}
            label={t("sidebar.favorites")}
            isSelected={selectedCollectionId === "favorites"}
            onClick={() => onSelectCollection("favorites")}
          />
          {onToggleArchived && (
            <NavItem
              icon={<Archive className="w-4 h-4" />}
              label={t("sidebar.archived")}
              isSelected={showArchived}
              onClick={onToggleArchived}
            />
          )}
        </div>
      </section>

      {/* Collections */}
      <section>
        <div className="flex items-center justify-between mb-2 px-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("sidebar.collectionsTitle")}
          </h2>
          {onCreateCollection && (
            <button
              onClick={onCreateCollection}
              className={cn(
                "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700",
                "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                "focus:outline-none focus:ring-2 focus:ring-accent-themed",
              )}
              aria-label={t("sidebar.createCollectionAriaLabel")}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div role="tree" aria-label={t("sidebar.collectionsAriaLabel")}>
          {collections.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">
              {t("sidebar.noCollections")}
            </p>
          ) : (
            collections.map((c) => renderCollection(c))
          )}
        </div>
      </section>

      {/* Tags */}
      <section>
        <div className="flex items-center justify-between mb-2 px-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("sidebar.tagsTitle")}
          </h2>
          {onCreateTag && (
            <button
              onClick={onCreateTag}
              className={cn(
                "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700",
                "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                "focus:outline-none focus:ring-2 focus:ring-accent-themed",
              )}
              aria-label={t("sidebar.createTagAriaLabel")}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div
          className="flex flex-wrap gap-2 px-3"
          role="group"
          aria-label={t("sidebar.tagsAriaLabel")}
        >
          {tags.length === 0 ? (
            <p className="text-sm text-slate-500">{t("sidebar.noTags")}</p>
          ) : (
            tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onToggleTag(tag.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                  "transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-accent-themed",
                  selectedTagIds.includes(tag.id)
                    ? "bg-accent-themed text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
                )}
                role="checkbox"
                aria-checked={selectedTagIds.includes(tag.id)}
              >
                <Tag className="w-3 h-3" />
                {tag.name}
                {tag.count > 0 && (
                  <span className="opacity-75">({tag.count})</span>
                )}
              </button>
            ))
          )}
        </div>
      </section>
    </nav>
  );
}
