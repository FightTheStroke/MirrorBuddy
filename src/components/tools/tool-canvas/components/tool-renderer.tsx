/**
 * Tool-specific renderer component
 */

'use client';

import { Loader2, XCircle, Pause } from 'lucide-react';
import { MindmapRenderer } from '@/components/tools/markmap';
import { QuizTool } from '@/components/tools/quiz-tool';
import { FlashcardTool } from '@/components/tools/flashcard-tool';
import { DiagramRenderer } from '@/components/tools/diagram-renderer';
import { SummaryTool } from '@/components/tools/summary-tool';
import { StudentSummaryEditor } from '@/components/tools/student-summary-editor';
import type { SummaryData, StudentSummaryData } from '@/types/tools';
import type { ActiveToolState } from '@/lib/hooks/use-tool-stream';
import type { MindmapRequest, QuizRequest, FlashcardDeckRequest, DiagramRequest } from '@/types';

interface ToolRendererProps {
  tool: ActiveToolState;
  onSaveStudentSummary?: (data: StudentSummaryData) => Promise<void>;
}

export function ToolRenderer({ tool, onSaveStudentSummary }: ToolRendererProps) {
  // Handle incomplete content during building
  if (tool.status === 'building' && !tool.content) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-400">Preparazione in corso...</p>
          {tool.chunks.length > 0 && (
            <p className="text-xs text-slate-500">
              Ricevuti {tool.chunks.length} frammenti
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (tool.status === 'error') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 p-8 bg-red-900/20 rounded-xl">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-400">{tool.errorMessage || 'Si è verificato un errore'}</p>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (tool.status === 'cancelled') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 p-8 bg-yellow-900/20 rounded-xl">
          <Pause className="w-12 h-12 text-yellow-400 mx-auto" />
          <p className="text-yellow-400">Costruzione annullata</p>
        </div>
      </div>
    );
  }

  // Render based on tool type
  switch (tool.type) {
    case 'mindmap':
      return (
        <MindmapRenderer
          title={(tool.content as MindmapRequest)?.title || tool.title}
          nodes={(tool.content as MindmapRequest)?.nodes || []}
        />
      );

    case 'quiz':
      return (
        <QuizTool
          request={tool.content as QuizRequest}
        />
      );

    case 'flashcards':
      return (
        <FlashcardTool
          request={tool.content as FlashcardDeckRequest}
        />
      );

    case 'diagram':
      return (
        <DiagramRenderer
          request={tool.content as DiagramRequest}
        />
      );

    case 'summary': {
      const summaryContent = tool.content as Record<string, unknown>;
      // Check if this is a student-written summary (maieutic method)
      if (summaryContent.type === 'student_summary') {
        const studentData = summaryContent as unknown as StudentSummaryData;
        return (
          <StudentSummaryEditor
            initialData={studentData}
            topic={studentData.topic}
            maestroId={studentData.maestroId}
            sessionId={studentData.sessionId}
            onSave={onSaveStudentSummary}
          />
        );
      }
      // AI-generated summary (legacy)
      return <SummaryTool data={summaryContent as unknown as SummaryData} />;
    }

    case 'timeline':
    default:
      // Fallback for unsupported types
      return (
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
          <pre className="text-sm text-slate-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(tool.content, null, 2)}
          </pre>
        </div>
      );
  }
}
