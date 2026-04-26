"use client";

/**
 * ToolContent Component
 * Renders the appropriate tool component based on tool type
 */

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { DiagramRenderer } from "../diagram-renderer";
import { FormulaRenderer } from "../formula-renderer";

// Lazy load Recharts-based ChartRenderer (reduces initial bundle ~200KB)
const ChartRenderer = dynamic(
  () => import("../chart-renderer").then((m) => m.ChartRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center bg-slate-200 dark:bg-slate-800/50 rounded-xl border border-slate-300 dark:border-slate-700">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    ),
  },
);
import {
  AutoSaveQuiz,
  AutoSaveFlashcard,
  AutoSaveMindmap,
  AutoSaveSummary,
  AutoSaveDemo,
} from "./auto-save-wrappers";
import { useMaterialContent } from "@/lib/hooks/use-material-content";
import { functionNameToToolType } from "@/lib/tools/constants";
import type {
  ToolCall,
  ToolCallRef,
  ChartRequest,
  DiagramRequest,
  FormulaRequest,
  QuizRequest,
  FlashcardDeckRequest,
  MindmapRequest,
} from "@/types";
import type { SummaryData, DemoData, ToolType } from "@/types/tools";

interface ToolContentProps {
  toolCall: ToolCall | ToolCallRef;
  sessionId?: string | null;
}

export function ToolContent({ toolCall, sessionId }: ToolContentProps) {
  const t = useTranslations("tools.loading");

  // Map function name to tool type for rendering
  const toolType =
    functionNameToToolType(toolCall.type) || (toolCall.type as ToolType);

  // Load material content - handles both full ToolCall and lightweight ToolCallRef
  const { data: loadedData, isLoading, error } = useMaterialContent(toolCall);

  // Show loading state while fetching material
  if (isLoading) {
    return (
      <div className="h-20 flex items-center justify-center bg-slate-200 dark:bg-slate-800/50 rounded-xl border border-slate-300 dark:border-slate-700">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
          {t("loadingMaterial")}
        </span>
      </div>
    );
  }

  // Show error if material couldn't be loaded
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  // Return null state if no data available
  const toolData = loadedData;
  if (!toolData) {
    return (
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
        {t("noData")}
      </div>
    );
  }

  switch (toolType) {
    case "chart":
      return <ChartRenderer request={toolData as unknown as ChartRequest} />;

    case "diagram":
      return (
        <DiagramRenderer request={toolData as unknown as DiagramRequest} />
      );

    case "formula":
      return (
        <FormulaRenderer request={toolData as unknown as FormulaRequest} />
      );

    case "quiz":
      return (
        <AutoSaveQuiz
          request={toolData as unknown as QuizRequest}
          toolId={toolCall.id}
        />
      );

    case "flashcard":
      return (
        <AutoSaveFlashcard
          request={toolData as unknown as FlashcardDeckRequest}
          toolId={toolCall.id}
        />
      );

    case "mindmap":
      return (
        <AutoSaveMindmap
          request={toolData as unknown as MindmapRequest}
          sessionId={sessionId}
          toolId={toolCall.id}
        />
      );

    case "summary":
      return (
        <AutoSaveSummary
          request={toolData as unknown as SummaryData}
          toolId={toolCall.id}
        />
      );

    case "demo":
      return (
        <AutoSaveDemo
          request={toolData as unknown as DemoData}
          toolId={toolCall.id}
        />
      );

    default:
      return (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          <pre className="text-sm text-slate-600 dark:text-slate-400 overflow-x-auto">
            {JSON.stringify(toolData, null, 2)}
          </pre>
        </div>
      );
  }
}
