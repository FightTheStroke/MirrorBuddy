'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Code, BarChart2, GitBranch, Calculator, HelpCircle, Layers, Network } from 'lucide-react';
import { CodeRunner } from './code-runner';
import { ChartRenderer } from './chart-renderer';
import { DiagramRenderer } from './diagram-renderer';
import { FormulaRenderer } from './formula-renderer';
import { QuizTool } from './quiz-tool';
import { FlashcardTool } from './flashcard-tool';
import { MindmapRenderer } from './markmap-renderer';
import { cn } from '@/lib/utils';
import type { ToolCall, CodeExecutionRequest, ChartRequest, DiagramRequest, FormulaRequest, QuizRequest, FlashcardDeckRequest, MindmapRequest } from '@/types';
import { autoSaveMaterial } from '@/lib/hooks/use-saved-materials';

// Auto-save utilities for tool results - now use database API
function autoSaveMindmap(request: MindmapRequest): void {
  autoSaveMaterial('mindmap', request.title, { nodes: request.nodes }, { subject: 'general' });
}

function autoSaveQuiz(request: QuizRequest): void {
  autoSaveMaterial('quiz', request.title, { questions: request.questions }, { subject: request.subject });
}

function autoSaveFlashcards(request: FlashcardDeckRequest): void {
  autoSaveMaterial('flashcard', request.name, { cards: request.cards }, { subject: request.subject });
}

interface ToolResultDisplayProps {
  toolCall: ToolCall;
  className?: string;
}

const toolIcons: Record<string, React.ReactNode> = {
  run_code: <Code className="w-4 h-4" />,
  create_chart: <BarChart2 className="w-4 h-4" />,
  create_diagram: <GitBranch className="w-4 h-4" />,
  show_formula: <Calculator className="w-4 h-4" />,
  create_visualization: <BarChart2 className="w-4 h-4" />,
  create_quiz: <HelpCircle className="w-4 h-4" />,
  create_flashcard: <Layers className="w-4 h-4" />,
  create_mindmap: <Network className="w-4 h-4" />,
};

const toolNames: Record<string, string> = {
  run_code: 'Code Execution',
  create_chart: 'Chart',
  create_diagram: 'Diagram',
  show_formula: 'Formula',
  create_visualization: 'Visualization',
  create_quiz: 'Quiz',
  create_flashcard: 'Flashcard',
  create_mindmap: 'Mind Map',
};

export function ToolResultDisplay({ toolCall, className }: ToolResultDisplayProps) {
  const icon = toolIcons[toolCall.type] || <Code className="w-4 h-4" />;
  const name = toolNames[toolCall.type] || toolCall.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('space-y-2 w-full', className)}
      role="region"
      aria-label={`Tool result: ${name}`}
    >
      {/* Status header */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">{icon}</span>
        <span className="font-medium text-slate-300">{name}</span>
        <StatusBadge status={toolCall.status} />
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
          >
            <ToolContent toolCall={toolCall} />
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

function ToolContent({ toolCall }: { toolCall: ToolCall }) {
  switch (toolCall.type) {
    case 'run_code':
      return (
        <CodeRunner
          request={toolCall.arguments as unknown as CodeExecutionRequest}
          autoRun
        />
      );

    case 'create_chart':
      return (
        <ChartRenderer
          request={toolCall.arguments as unknown as ChartRequest}
        />
      );

    case 'create_diagram':
      return (
        <DiagramRenderer
          request={toolCall.arguments as unknown as DiagramRequest}
        />
      );

    case 'show_formula':
      return (
        <FormulaRenderer
          request={toolCall.arguments as unknown as FormulaRequest}
        />
      );

    case 'create_quiz':
      return (
        <AutoSaveQuiz request={toolCall.arguments as unknown as QuizRequest} />
      );

    case 'create_flashcard':
      return (
        <AutoSaveFlashcard request={toolCall.arguments as unknown as FlashcardDeckRequest} />
      );

    case 'create_mindmap':
      return (
        <AutoSaveMindmap request={toolCall.arguments as unknown as MindmapRequest} />
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

// Auto-save wrapper components
function AutoSaveQuiz({ request }: { request: QuizRequest }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveQuiz(request);
    }
  }, [request]);
  return <QuizTool request={request} />;
}

function AutoSaveFlashcard({ request }: { request: FlashcardDeckRequest }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveFlashcards(request);
    }
  }, [request]);
  return <FlashcardTool request={request} />;
}

function AutoSaveMindmap({ request }: { request: MindmapRequest }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveMindmap(request);
    }
  }, [request]);
  return <MindmapRenderer title={request.title} nodes={request.nodes} />;
}

// Multiple tools display
interface ToolResultsListProps {
  toolCalls: ToolCall[];
  className?: string;
}

export function ToolResultsList({ toolCalls, className }: ToolResultsListProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)} role="list" aria-label="Tool results">
      <AnimatePresence>
        {toolCalls.map((toolCall) => (
          <ToolResultDisplay key={toolCall.id} toolCall={toolCall} />
        ))}
      </AnimatePresence>
    </div>
  );
}
