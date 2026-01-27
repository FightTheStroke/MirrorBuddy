/**
 * Knowledge Hub Selection Status Bar
 * Shows selected materials count and bulk actions
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface SelectionStatusBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onDelete?: () => Promise<void>;
}

export function SelectionStatusBar({
  selectedCount,
  onDeselectAll,
  onDelete,
}: SelectionStatusBarProps) {
  const t = useTranslations("education.knowledge-hub");

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg flex items-center gap-4"
        >
          <span className="text-sm">
            {selectedCount} {t("status-bar.selected-count")}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onDeselectAll}>
              {t("status-bar.deselect-button")}
            </Button>
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                {t("status-bar.delete-button")}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
