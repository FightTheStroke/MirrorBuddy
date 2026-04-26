"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToolMaestroSelectionDialog } from "./tool-maestro-selection-dialog";
import { cn } from "@/lib/utils";
import {
  useSavedTools,
  autoSaveMaterial,
} from "@/lib/hooks/use-saved-materials";
import {
  exportSummaryToPdf,
  convertSummaryToMindmap,
  generateFlashcardsFromSummary,
} from "@/lib/tools/summary-export";
import { toast } from "@/components/ui/toast";
import type { SummaryData } from "@/types/tools";
import type { Maestro } from "@/types";
import { SummaryCard } from "./summaries-view/summary-card";
import { SummaryModal } from "./summaries-view/summary-modal";

interface SummariesViewProps {
  className?: string;
  initialMaestroId?: string | null;
  initialMode?: "voice" | "chat" | null;
}

interface SelectedSummary {
  id: string;
  title: string;
  data: SummaryData;
  createdAt: Date;
}

export function SummariesView({
  className,
  initialMaestroId,
  initialMode,
}: SummariesViewProps) {
  const t = useTranslations("education.summaries");
  const { tools, loading, deleteTool } = useSavedTools("summary");
  const initialProcessed = useRef(false);
  const [selectedSummary, setSelectedSummary] =
    useState<SelectedSummary | null>(null);
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);

  // Auto-open maestro dialog when coming from Astuccio with parameters
  useEffect(() => {
    if (initialMaestroId && initialMode && !initialProcessed.current) {
      initialProcessed.current = true;
      const timer = setTimeout(() => {
        setShowMaestroDialog(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialMaestroId, initialMode]);

  const handleMaestroConfirm = useCallback(
    (_maestro: Maestro, _mode: "voice" | "chat") => {
      setShowMaestroDialog(false);
    },
    [],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTool(id);
      if (selectedSummary?.id === id) {
        setSelectedSummary(null);
      }
    },
    [deleteTool, selectedSummary],
  );

  const handleExportPdf = useCallback((data: SummaryData) => {
    exportSummaryToPdf(data);
  }, []);

  const handleConvertToMindmap = useCallback(
    async (data: SummaryData) => {
      const result = convertSummaryToMindmap(data);
      const saved = await autoSaveMaterial("mindmap", result.topic, {
        nodes: result.nodes,
      });
      if (saved) {
        toast.success(
          t("mindmapSuccess"),
          t("mindmapSuccessDetail", {
            count: result.nodes.length,
            topic: result.topic,
          }),
        );
      } else {
        toast.error(t("mindmapError"), t("mindmapErrorDetail"));
      }
    },
    [t],
  );

  const handleGenerateFlashcards = useCallback(
    async (data: SummaryData) => {
      const result = generateFlashcardsFromSummary(data);
      const saved = await autoSaveMaterial("flashcard", result.topic, {
        cards: result.cards,
      });
      if (saved) {
        toast.success(
          t("flashcardsSuccess"),
          t("flashcardsSuccessDetail", {
            count: result.cards.length,
            topic: result.topic,
          }),
        );
      } else {
        toast.error(t("flashcardsError"), t("flashcardsErrorDetail"));
      }
    },
    [t],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowMaestroDialog(true)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("createButton")}
        </Button>
      </div>

      {/* Info card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                {t("infoTitle")}
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {t("infoDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summaries grid */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto text-slate-400 mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {t("loading")}
            </h3>
          </div>
        </Card>
      ) : tools.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {t("emptySummaries")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {t("emptyDescription")}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const summaryData = tool.content as unknown as SummaryData;
            return (
              <SummaryCard
                key={tool.toolId}
                tool={tool}
                onClick={() =>
                  setSelectedSummary({
                    id: tool.toolId,
                    title: tool.title || summaryData.topic || t("defaultTitle"),
                    data: summaryData,
                    createdAt: new Date(tool.createdAt),
                  })
                }
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Summary modal */}
      <AnimatePresence>
        {selectedSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedSummary(null)}
          >
            <SummaryModal
              title={selectedSummary.title}
              data={selectedSummary.data}
              onClose={() => setSelectedSummary(null)}
              onExportPdf={handleExportPdf}
              onConvertToMindmap={handleConvertToMindmap}
              onGenerateFlashcards={handleGenerateFlashcards}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maestro selection dialog */}
      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="summary"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </div>
  );
}
