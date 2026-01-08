'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Code, BarChart2, GitBranch, Calculator, HelpCircle, Layers, Network, FileText, Play, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartRenderer } from './chart-renderer';
import { DiagramRenderer } from './diagram-renderer';
import { FormulaRenderer } from './formula-renderer';
import { QuizTool } from './quiz-tool';
import { FlashcardTool } from './flashcard-tool';
import { SummaryTool } from './summary-tool';
import { DemoSandbox } from './demo-sandbox';
import { LiveMindmap } from './live-mindmap';
import { cn } from '@/lib/utils';
import type { ToolCall, ChartRequest, DiagramRequest, FormulaRequest, QuizRequest, FlashcardDeckRequest, MindmapRequest } from '@/types';
import type { SummaryData, DemoData, MindmapNode, ToolType } from '@/types/tools';
import { autoSaveMaterial } from '@/lib/hooks/use-saved-materials';
import toast from '@/components/ui/toast';
import { logger } from '@/lib/logger';
import { FUNCTION_NAME_TO_TOOL_TYPE } from '@/components/conversation/constants/tool-constants';

// C-14 FIX: Auto-save utilities now accept toolId for reliable upsert behavior
function autoSaveMindmap(request: MindmapRequest, toolId?: string): void {
  autoSaveMaterial('mindmap', request.title, { nodes: request.nodes }, { subject: 'general', toolId });
}

function autoSaveQuiz(request: QuizRequest, toolId?: string): void {
  autoSaveMaterial('quiz', request.title, { questions: request.questions }, { subject: request.subject, toolId });
}

function autoSaveFlashcards(request: FlashcardDeckRequest, toolId?: string): void {
  autoSaveMaterial('flashcard', request.name, { cards: request.cards }, { subject: request.subject, toolId });
}

function autoSaveSummary(request: SummaryData, toolId?: string): void {
  autoSaveMaterial('summary', request.topic, { sections: request.sections, length: request.length }, { subject: 'general', toolId });
}

function autoSaveDemo(request: DemoData, toolId?: string): void {
  autoSaveMaterial('demo', request.title, { html: request.html, css: request.css, js: request.js, description: request.description }, { subject: 'general', toolId });
}

interface ToolResultDisplayProps {
  toolCall: ToolCall;
  className?: string;
  /** Session ID for real-time mindmap modifications (Maestro+Student collaboration) */
  sessionId?: string | null;
  /** Whether this tool is in fullscreen mode */
  isFullscreen?: boolean;
  /** Callback to toggle fullscreen mode */
  onToggleFullscreen?: () => void;
}

const toolIcons: Record<string, React.ReactNode> = {
  // Function names (from API)
  run_code: <Code className="w-4 h-4" />,
  create_chart: <BarChart2 className="w-4 h-4" />,
  create_diagram: <GitBranch className="w-4 h-4" />,
  show_formula: <Calculator className="w-4 h-4" />,
  create_visualization: <BarChart2 className="w-4 h-4" />,
  create_quiz: <HelpCircle className="w-4 h-4" />,
  create_flashcard: <Layers className="w-4 h-4" />,
  create_flashcards: <Layers className="w-4 h-4" />,
  create_mindmap: <Network className="w-4 h-4" />,
  create_summary: <FileText className="w-4 h-4" />,
  create_demo: <Play className="w-4 h-4" />,
  create_timeline: <FileText className="w-4 h-4" />,
  web_search: <FileText className="w-4 h-4" />,
  // Tool types (mapped)
  chart: <BarChart2 className="w-4 h-4" />,
  diagram: <GitBranch className="w-4 h-4" />,
  formula: <Calculator className="w-4 h-4" />,
  quiz: <HelpCircle className="w-4 h-4" />,
  flashcard: <Layers className="w-4 h-4" />,
  mindmap: <Network className="w-4 h-4" />,
  summary: <FileText className="w-4 h-4" />,
  demo: <Play className="w-4 h-4" />,
  timeline: <FileText className="w-4 h-4" />,
  search: <FileText className="w-4 h-4" />,
};

const toolNames: Record<string, string> = {
  // Function names (from API)
  run_code: 'Code Execution',
  create_chart: 'Chart',
  create_diagram: 'Diagram',
  show_formula: 'Formula',
  create_visualization: 'Visualization',
  create_quiz: 'Quiz',
  create_flashcard: 'Flashcard',
  create_flashcards: 'Flashcard',
  create_mindmap: 'Mind Map',
  create_summary: 'Summary',
  create_demo: 'Demo',
  create_timeline: 'Timeline',
  web_search: 'Search',
  // Tool types (mapped)
  chart: 'Chart',
  diagram: 'Diagram',
  formula: 'Formula',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  mindmap: 'Mind Map',
  summary: 'Summary',
  demo: 'Demo',
  timeline: 'Timeline',
  search: 'Search',
};

export function ToolResultDisplay({ toolCall, className, sessionId, isFullscreen = false, onToggleFullscreen }: ToolResultDisplayProps) {
  // Map function name to tool type for display
  const toolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolCall.type as ToolType;
  const icon = toolIcons[toolCall.type] || toolIcons[toolType] || <Code className="w-4 h-4" />;
  const name = toolNames[toolCall.type] || toolNames[toolType] || toolCall.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'space-y-2 w-full',
        isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-slate-950 p-6 overflow-auto',
        className
      )}
      role="region"
      aria-label={`Tool result: ${name}`}
    >
      {/* Status header */}
      <div className={cn(
        'flex items-center justify-between gap-2 text-sm',
        isFullscreen && 'sticky top-0 z-10 bg-white dark:bg-slate-950 pb-4 border-b border-slate-200 dark:border-slate-700 mb-4'
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('text-slate-400', isFullscreen && 'text-slate-600 dark:text-slate-300')}>{icon}</span>
          <span className={cn('font-medium text-slate-300', isFullscreen && 'text-slate-900 dark:text-white text-lg')}>{name}</span>
          <StatusBadge status={toolCall.status} />
        </div>
        {toolCall.status === 'completed' && onToggleFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className={cn(
              'text-slate-400 hover:text-slate-200',
              isFullscreen && 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
            title={isFullscreen ? 'Riduci' : 'Espandi'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Tool-specific content */}
      <AnimatePresence mode="wait">
        {toolCall.status === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700"
          >
            <span className="text-sm text-slate-400">Waiting to execute...</span>
          </motion.div>
        )}

        {toolCall.status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700"
          >
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </motion.div>
        )}

        {(toolCall.status === 'completed' || toolCall.status === 'error') && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              isFullscreen && 'h-full flex flex-col'
            )}
          >
            <div className={cn(
              isFullscreen && 'flex-1 overflow-auto'
            )}>
              <ToolContent toolCall={toolCall} sessionId={sessionId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: ToolCall['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-400">
          Pending
        </span>
      );
    case 'running':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    case 'completed':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Complete
        </span>
      );
    case 'error':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Error
        </span>
      );
  }
}

function ToolContent({ toolCall, sessionId }: { toolCall: ToolCall; sessionId?: string | null }) {
  // Map function name (e.g., 'create_mindmap') to tool type (e.g., 'mindmap')
  // The API returns function names, but we need tool types for rendering
  const toolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolCall.type as ToolType;
  
  // For completed tools, use result.data if available, otherwise use arguments
  const toolData = toolCall.status === 'completed' && toolCall.result?.data 
    ? toolCall.result.data 
    : toolCall.arguments;

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

// C-14 FIX: Auto-save wrapper components now accept toolId for reliable persistence
function AutoSaveQuiz({ request, toolId }: { request: QuizRequest; toolId?: string }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveQuiz(request, toolId);
    }
  }, [request, toolId]);
  return <QuizTool request={request} />;
}

function AutoSaveFlashcard({ request, toolId }: { request: FlashcardDeckRequest; toolId?: string }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveFlashcards(request, toolId);
    }
  }, [request, toolId]);
  return <FlashcardTool request={request} />;
}

function AutoSaveMindmap({ request, sessionId, toolId }: { request: MindmapRequest; sessionId?: string | null; toolId?: string }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveMindmap(request, toolId);
    }
  }, [request, toolId]);
  // Use LiveMindmap for real-time Maestro+Student collaboration on mindmaps
  return (
    <LiveMindmap
      sessionId={sessionId ?? null}
      title={request.title}
      initialNodes={request.nodes}
    />
  );
}

function AutoSaveSummary({ request, toolId }: { request: SummaryData; toolId?: string }) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveSummary(request, toolId);
    }
  }, [request, toolId]);

  // C-21 FIX: Implement PDF export
  const handleExportPdf = useCallback((data: SummaryData) => {
    // Create print-friendly HTML and open in new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      logger.warn('[SummaryTool] Could not open print window');
      toast.error('Impossibile aprire la finestra di stampa');
      return;
    }

    // SummarySection.content is a string, not array
    const sectionsHtml = data.sections.map(section => `
      <div class="section">
        <h2>${section.title}</h2>
        <p>${section.content}</p>
        ${section.keyPoints && section.keyPoints.length > 0 ? `
          <div class="key-points">
            <h3>Punti chiave:</h3>
            ${section.keyPoints.map(kp => `<p class="key-point">★ ${kp}</p>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.topic} - Riassunto</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
            h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #1e3a5f; margin-top: 20px; }
            h3 { color: #475569; font-size: 14px; margin-top: 15px; }
            .section { margin-bottom: 30px; }
            .key-points { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 10px; }
            .key-point { color: #0369a1; font-weight: 500; }
            p { line-height: 1.6; white-space: pre-wrap; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${data.topic}</h1>
          ${sectionsHtml}
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    logger.info('[SummaryTool] Exported to PDF', { topic: data.topic });
  }, []);

  // C-21 FIX: Implement convert to mindmap
  const handleConvertToMindmap = useCallback((data: SummaryData) => {
    // Convert summary sections to mindmap nodes with proper hierarchy
    const nodes: MindmapNode[] = [];

    // Root node
    nodes.push({ id: 'root', label: data.topic });

    // Section nodes as children of root
    data.sections.forEach((section, i) => {
      const sectionId = `section-${i}`;
      nodes.push({ id: sectionId, label: section.title, parentId: 'root' });

      // Split content into sentences/points and add as children
      const contentParts = section.content.split(/[.!?]\s+/).filter(s => s.trim().length > 5);
      contentParts.slice(0, 3).forEach((part, j) => {
        const label = part.length > 50 ? part.substring(0, 47) + '...' : part;
        nodes.push({ id: `${sectionId}-content-${j}`, label, parentId: sectionId });
      });

      // Add key points as children if they exist
      if (section.keyPoints) {
        section.keyPoints.slice(0, 3).forEach((kp, j) => {
          const label = kp.length > 40 ? `★ ${kp.substring(0, 37)}...` : `★ ${kp}`;
          nodes.push({ id: `${sectionId}-kp-${j}`, label, parentId: sectionId });
        });
      }
    });

    // Save the mindmap to archive
    const mindmapTitle = `Mappa: ${data.topic}`;
    autoSaveMaterial('mindmap', mindmapTitle, { nodes }, { subject: 'general' });

    toast.success('Mappa mentale salvata nell\'archivio!');
    logger.info('[SummaryTool] Converted to mindmap', { topic: data.topic, nodeCount: nodes.length });
  }, []);

  // C-21 FIX: Implement generate flashcards
  const handleGenerateFlashcards = useCallback((data: SummaryData) => {
    // Generate flashcards from key points and content
    const cards: Array<{ front: string; back: string }> = [];

    data.sections.forEach((section) => {
      // Create cards from key points
      if (section.keyPoints) {
        section.keyPoints.forEach((kp) => {
          cards.push({
            front: `${section.title}: Cosa significa "${kp.length > 30 ? kp.substring(0, 30) + '...' : kp}"?`,
            back: kp,
          });
        });
      }

      // Create a card from the section content (it's a string, not array)
      if (section.content && section.content.length > 20) {
        cards.push({
          front: `${section.title}: Spiega questo concetto`,
          back: section.content.length > 200 ? section.content.substring(0, 200) + '...' : section.content,
        });
      }
    });

    // Limit to 10 cards
    const limitedCards = cards.slice(0, 10);

    if (limitedCards.length === 0) {
      toast.error('Non ci sono abbastanza contenuti per creare flashcard');
      return;
    }

    // Save flashcards to archive
    const flashcardName = `Flashcard: ${data.topic}`;
    autoSaveMaterial('flashcard', flashcardName, { cards: limitedCards }, { subject: 'general' });

    toast.success(`${limitedCards.length} flashcard salvate nell'archivio!`);
    logger.info('[SummaryTool] Generated flashcards', { topic: data.topic, cardCount: limitedCards.length });
  }, []);

  return (
    <SummaryTool
      data={request}
      onExportPdf={handleExportPdf}
      onConvertToMindmap={handleConvertToMindmap}
      onGenerateFlashcards={handleGenerateFlashcards}
    />
  );
}

function AutoSaveDemo({ request, toolId }: { request: DemoData; toolId?: string }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveDemo(request, toolId);
    }
  }, [request, toolId]);
  return <DemoSandbox data={request} />;
}

// Multiple tools display
interface ToolResultsListProps {
  toolCalls: ToolCall[];
  className?: string;
  /** Session ID for real-time mindmap modifications (Maestro+Student collaboration) */
  sessionId?: string | null;
}

export function ToolResultsList({ toolCalls, className, sessionId }: ToolResultsListProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)} role="list" aria-label="Tool results">
      <AnimatePresence>
        {toolCalls.map((toolCall) => (
          <ToolResultDisplay key={toolCall.id} toolCall={toolCall} sessionId={sessionId} />
        ))}
      </AnimatePresence>
    </div>
  );
}
