"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Save, Download, Brain, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SummaryData } from "@/types/tools";

interface SummaryActionsBarProps {
  isFinalized: boolean;
  readOnly: boolean;
  data: SummaryData;
  onSave: () => void;
  onExportPdf?: (data: SummaryData) => void;
  onConvertToMindmap?: (data: SummaryData) => void;
  onGenerateFlashcards?: (data: SummaryData) => void;
}

export function SummaryActionsBar({
  isFinalized,
  readOnly,
  data,
  onSave,
  onExportPdf,
  onConvertToMindmap,
  onGenerateFlashcards,
}: SummaryActionsBarProps) {
  const t = useTranslations("tools.summary");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left Actions */}
        <div className="flex items-center gap-2">
          {!isFinalized && !readOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {t("save")}
            </Button>
          )}
          {isFinalized && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <Save className="w-4 h-4" />
              {t("saved")}
            </span>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportPdf(data)}
              className="gap-2"
              title={t("exportPdf")}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}

          {onConvertToMindmap && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConvertToMindmap(data)}
              className="gap-2"
              title={t("convertToMindmap")}
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">{t("mappa")}</span>
            </Button>
          )}

          {onGenerateFlashcards && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerateFlashcards(data)}
              className="gap-2"
              title={t("generateFlashcards")}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">{t("flashcard")}</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
