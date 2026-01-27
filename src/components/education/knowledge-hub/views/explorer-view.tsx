"use client";

/**
 * Explorer View
 * File explorer style layout with collections as folders
 *
 * Phase 7: Task 7.09
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaterialCard, type Material } from "../components/material-card";
import type { Collection } from "../components/sidebar-navigation";

/** Extended material type for Knowledge Hub views */
export interface KnowledgeHubMaterial {
  id: string;
  toolId?: string;
  title: string;
  toolType: Material["type"];
  createdAt: Date | string;
  updatedAt?: Date | string;
  collectionId?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: string[];
}

export interface ExplorerViewProps {
  materials: KnowledgeHubMaterial[];
  collections: Collection[];
  selectedCollectionId: string | null;
  expandedFolders: Set<string>;
  onSelectCollection: (id: string | null) => void;
  onToggleFolder: (id: string) => void;
  onSelectMaterial: (material: KnowledgeHubMaterial) => void;
  onFindSimilar?: (toolId: string) => void;
  selectedMaterialIds?: Set<string>;
  onToggleMaterialSelection?: (id: string) => void;
  className?: string;
}

/** Convert KnowledgeHubMaterial to Material for MaterialCard */
function toMaterial(m: KnowledgeHubMaterial): Material {
  const createdAt =
    m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
  const updatedAt = m.updatedAt
    ? m.updatedAt instanceof Date
      ? m.updatedAt
      : new Date(m.updatedAt)
    : createdAt;
  return {
    id: m.id,
    title: m.title,
    type: m.toolType,
    createdAt,
    updatedAt,
    collectionId: m.collectionId,
    isFavorite: m.isFavorite,
    isArchived: m.isArchived,
    tags: m.tags,
  };
}

export function ExplorerView({
  materials,
  collections,
  selectedCollectionId,
  expandedFolders,
  onSelectCollection,
  onToggleFolder,
  onSelectMaterial,
  onFindSimilar,
  selectedMaterialIds = new Set(),
  onToggleMaterialSelection,
  className,
}: ExplorerViewProps) {
  const t = useTranslations("education.knowledge-hub");

  // Filter materials by selected collection
  const filteredMaterials = useMemo(() => {
    if (!selectedCollectionId) return materials;
    return materials.filter((m) => m.collectionId === selectedCollectionId);
  }, [materials, selectedCollectionId]);

  // Render a folder node recursively
  const renderFolder = (node: Collection, depth = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedCollectionId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <button
          onClick={() => {
            onSelectCollection(node.id);
            if (hasChildren) {
              onToggleFolder(node.id);
            }
          }}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            isSelected && "bg-primary/10 text-primary font-medium",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          aria-label={t("explorer-view.folder-aria-label", { name: node.name })}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )
          ) : (
            <span className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen
              className="w-4 h-4"
              style={{ color: node.color || "#6366f1" }}
            />
          ) : (
            <Folder
              className="w-4 h-4"
              style={{ color: node.color || "#6366f1" }}
            />
          )}
          <span className="truncate">{node.name}</span>
          {node.count !== undefined && node.count > 0 && (
            <span className="ml-auto text-xs text-slate-400">{node.count}</span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child: Collection) =>
              renderFolder(child, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col lg:flex-row gap-4 h-full", className)}>
      {/* Folder tree sidebar */}
      <div className="w-full lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 pr-0 lg:pr-4 overflow-y-auto">
        <div className="space-y-1">
          {/* All materials option */}
          <button
            onClick={() => onSelectCollection(null)}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              selectedCollectionId === null &&
                "bg-primary/10 text-primary font-medium",
            )}
            aria-label={t("explorer-view.all-materials-aria-label")}
          >
            <span className="w-4" />
            <Folder className="w-4 h-4 text-slate-500" />
            <span>{t("explorer-view.all-materials")}</span>
            <span className="ml-auto text-xs text-slate-400">
              {materials.length}
            </span>
          </button>

          {/* Collection folders */}
          {collections.map((node) => renderFolder(node))}
        </div>
      </div>

      {/* Material grid */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredMaterials.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-slate-400"
            >
              {t("explorer-view.no-materials")}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMaterials.map((material) => (
                <motion.div
                  key={material.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <MaterialCard
                    material={toMaterial(material)}
                    onOpen={() => onSelectMaterial(material)}
                    onFindSimilar={
                      onFindSimilar
                        ? () => onFindSimilar(material.toolId ?? material.id)
                        : undefined
                    }
                    isSelected={selectedMaterialIds.has(material.id)}
                    onSelect={
                      onToggleMaterialSelection
                        ? (id, _selected) => onToggleMaterialSelection(id)
                        : undefined
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
