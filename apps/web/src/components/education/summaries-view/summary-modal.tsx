'use client';

import { motion } from 'framer-motion';
import { FileText, Download, Brain, Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryRenderer } from '@/components/tools/summary-renderer';
import type { SummaryData } from '@/types/tools';
import { useTranslations } from "next-intl";

interface SummaryModalProps {
  title: string;
  data: SummaryData;
  onClose: () => void;
  onExportPdf: (data: SummaryData) => void;
  onConvertToMindmap: (data: SummaryData) => void;
  onGenerateFlashcards: (data: SummaryData) => void;
}

export function SummaryModal({
  title,
  data,
  onClose,
  onExportPdf,
  onConvertToMindmap,
  onGenerateFlashcards,
}: SummaryModalProps) {
  const t = useTranslations("education");
  return (
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.95 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-emerald-600" />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportPdf(data)}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConvertToMindmap(data)}
          >
            <Brain className="w-4 h-4 mr-2" />
            {t("mappa")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateFlashcards(data)}
          >
            <Layers className="w-4 h-4 mr-2" />
            {t("flashcardLabel")}
          </Button>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <SummaryRenderer
          title={data.topic}
          sections={data.sections}
          length={data.length}
        />
      </div>
    </motion.div>
  );
}
