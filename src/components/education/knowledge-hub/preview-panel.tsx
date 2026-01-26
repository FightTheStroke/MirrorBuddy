/**
 * Knowledge Hub Preview Panel (Task 7.16)
 * Shows material preview on the right side
 */

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialCard } from "./components/material-card";
import type { KnowledgeHubMaterial } from "./views";

interface PreviewPanelProps {
  material: KnowledgeHubMaterial | null;
  onClose: () => void;
  onOpenMaterial: (material: KnowledgeHubMaterial) => void;
}

export function PreviewPanel({
  material,
  onClose,
  onOpenMaterial,
}: PreviewPanelProps) {
  return (
    <AnimatePresence>
      {material && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="hidden lg:flex flex-shrink-0 bg-white dark:bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 overflow-hidden lg:w-80 flex-col"
        >
          <div className="p-4 w-full max-w-full lg:w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Anteprima
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Chiudi anteprima"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <MaterialCard
              material={{
                id: material.id,
                title: material.title,
                type: material.toolType,
                createdAt:
                  material.createdAt instanceof Date
                    ? material.createdAt
                    : new Date(material.createdAt),
                updatedAt: material.updatedAt
                  ? material.updatedAt instanceof Date
                    ? material.updatedAt
                    : new Date(material.updatedAt)
                  : material.createdAt instanceof Date
                    ? material.createdAt
                    : new Date(material.createdAt),
                tags: material.tags,
                isFavorite: material.isFavorite,
              }}
              onOpen={() => onOpenMaterial(material)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
