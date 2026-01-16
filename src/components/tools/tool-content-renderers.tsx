'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { DiagramRenderer } from './diagram-renderer';
import { FormulaRenderer } from './formula-renderer';
import { CalculatorRenderer } from './calculator-renderer';
import { AutoSaveQuiz, AutoSaveFlashcard, AutoSaveMindmap, AutoSaveSummary, AutoSaveDemo } from './auto-save-wrappers';
import type { ToolCall, ChartRequest, DiagramRequest, FormulaRequest, QuizRequest, FlashcardDeckRequest, MindmapRequest, CalculatorData } from '@/types';
import type { SummaryData, DemoData, ToolType } from '@/types/tools';
import { FUNCTION_NAME_TO_TOOL_TYPE } from './tool-display-constants';

// Lazy load Recharts-based ChartRenderer (reduces initial bundle ~200KB)
const ChartRenderer = dynamic(
  () => import('./chart-renderer').then(m => m.ChartRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }
);

/**
 * Render tool-specific content based on tool type
 */
export function ToolContent({ toolCall, sessionId }: { toolCall: ToolCall; sessionId?: string | null }) {
  // Map function name (e.g., 'create_mindmap') to tool type (e.g., 'mindmap')
  const toolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolCall.type as ToolType;

  // For completed tools, use result.data if available, otherwise use arguments
  const toolData = toolCall.status === 'completed' && toolCall.result?.data
    ? toolCall.result.data
    : toolCall.arguments;

  // Guard against undefined toolData
  if (!toolData) {
    return (
      <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
        <p className="text-sm text-slate-400">Caricamento dati...</p>
      </div>
    );
  }

  switch (toolType) {
    case 'chart':
      return (
        <ChartRenderer
          request={toolData as unknown as ChartRequest}
        />
      );

    case 'diagram':
      return (
        <DiagramRenderer
          request={toolData as unknown as DiagramRequest}
        />
      );

    case 'formula':
      return (
        <FormulaRenderer
          request={toolData as unknown as FormulaRequest}
        />
      );

    case 'calculator':
      return (
        <CalculatorRenderer
          data={toolData as unknown as CalculatorData}
        />
      );

    case 'quiz':
      return (
        <AutoSaveQuiz request={toolData as unknown as QuizRequest} toolId={toolCall.id} />
      );

    case 'flashcard':
      return (
        <AutoSaveFlashcard request={toolData as unknown as FlashcardDeckRequest} toolId={toolCall.id} />
      );

    case 'mindmap':
      return (
        <AutoSaveMindmap
          request={toolData as unknown as MindmapRequest}
          sessionId={sessionId}
          toolId={toolCall.id}
        />
      );

    case 'summary':
      return (
        <AutoSaveSummary request={toolData as unknown as SummaryData} toolId={toolCall.id} />
      );

    case 'demo':
      return (
        <AutoSaveDemo request={toolData as unknown as DemoData} toolId={toolCall.id} />
      );

    default:
      return (
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
          <pre className="text-sm text-slate-400 overflow-x-auto">
            {JSON.stringify(toolCall.result || toolCall.arguments, null, 2)}
          </pre>
        </div>
      );
  }
}
