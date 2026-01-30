/**
 * Tool Maestro Selection Dialog
 *
 * Allows users to select which maestro should create a requested tool.
 * Fixes Issue #97 - ensures tools are created with the correct maestro, not always Melissa.
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllMaestri, SUBJECT_NAMES } from "@/data/maestri";
import type { MaestroFull } from "@/data/maestri";
import type { ToolType } from "@/types/tools";
import { cn } from "@/lib/utils";

interface ToolMaestroSelectionDialogProps {
  isOpen: boolean;
  toolType: ToolType;
  onSelect: (maestro: MaestroFull) => void;
  onClose: () => void;
}

const TOOL_NAMES: Record<ToolType, string> = {
  mindmap: "Mappa Mentale",
  quiz: "Quiz",
  flashcard: "Flashcard",
  summary: "Riassunto",
  demo: "Demo Interattiva",
  diagram: "Diagramma",
  timeline: "Linea del Tempo",
  formula: "Formula",
  calculator: "Calcolatrice",
  chart: "Grafico",
  search: "Ricerca",
  webcam: "Foto",
  pdf: "PDF",
  typing: "Impara a Digitare",
  homework: "Compiti",
  "study-kit": "Study Kit",
};

export function ToolMaestroSelectionDialog({
  isOpen,
  toolType,
  onSelect,
  onClose,
}: ToolMaestroSelectionDialogProps) {
  const t = useTranslations("chat.conversation.toolSelection");
  const [searchQuery, setSearchQuery] = useState("");
  const maestri = getAllMaestri();

  const filteredMaestri = maestri.filter((maestro) => {
    const query = searchQuery.toLowerCase();
    return (
      maestro.displayName.toLowerCase().includes(query) ||
      maestro.displayName.toLowerCase().includes(query) ||
      SUBJECT_NAMES[maestro.subject]?.toLowerCase().includes(query) ||
      maestro.subject.toLowerCase().includes(query)
    );
  });

  const handleSelect = (maestro: MaestroFull) => {
    onSelect(maestro);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("title")}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t("question", {
                    toolName: TOOL_NAMES[toolType] || "questo strumento",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={t("closeAriaLabel")}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border-0 focus:ring-2 focus:ring-accent-themed outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Maestri Grid */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMaestri.map((maestro) => (
                <button
                  key={maestro.id}
                  onClick={() => handleSelect(maestro)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    "border-slate-200 dark:border-slate-700",
                    "hover:border-accent-themed hover:bg-slate-50 dark:hover:bg-slate-800",
                    "focus:outline-none focus:ring-2 focus:ring-accent-themed",
                    "text-left",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: `url(${maestro.avatar})`,
                      backgroundColor: maestro.color,
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {maestro.displayName}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {SUBJECT_NAMES[maestro.subject] || maestro.subject}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {filteredMaestri.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {t("empty")}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
