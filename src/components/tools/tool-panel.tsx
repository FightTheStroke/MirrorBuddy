'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkMapRenderer } from './markmap-renderer';
import { QuizTool } from './quiz-tool';
import { FlashcardTool } from './flashcard-tool';
import { DemoSandbox } from './demo-sandbox';
import { SearchResults } from './search-results';
import { cn } from '@/lib/utils';
import type { ToolState } from '@/types/tools';
import type { QuizRequest, FlashcardDeckRequest, MindmapRequest } from '@/types';

interface ToolPanelProps {
  tool: ToolState | null;
  maestro: { name: string; avatar: string; color: string } | null;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ToolPanel({
  tool,
  maestro,
  onClose,
  isMinimized = false,
  onToggleMinimize,
}: ToolPanelProps) {
  if (!tool) return null;

  const renderToolContent = () => {
    switch (tool.type) {
      case 'mindmap': {
        const mindmapData = tool.content as MindmapRequest;
        return (
          <MarkMapRenderer
            title={mindmapData.title}
            nodes={mindmapData.nodes}
          />
        );
      }
      case 'quiz': {
        const quizData = tool.content as QuizRequest;
        return <QuizTool request={quizData} />;
      }
      case 'flashcard': {
        const flashcardData = tool.content as FlashcardDeckRequest;
        return <FlashcardTool request={flashcardData} />;
      }
      case 'demo': {
        const demoData = tool.content as { title?: string; html: string; css?: string; js?: string };
        return <DemoSandbox data={demoData} />;
      }
      case 'search': {
        const searchData = tool.content as { query: string; results: Array<{ type: 'web' | 'youtube'; title: string; url: string; description?: string; thumbnail?: string; duration?: string }> };
        return <SearchResults data={searchData} />;
      }
      default:
        return (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
            Tipo di tool non supportato: {tool.type}
          </div>
        );
    }
  };

  const getToolLabel = () => {
    const labels: Record<string, string> = {
      mindmap: 'Mappa Mentale',
      quiz: 'Quiz',
      flashcard: 'Flashcard',
      demo: 'Demo Interattiva',
      search: 'Ricerca',
      diagram: 'Diagramma',
      timeline: 'Linea del Tempo',
      summary: 'Riassunto',
      formula: 'Formula',
      chart: 'Grafico',
      webcam: 'Foto',
      pdf: 'PDF',
    };
    return labels[tool.type] || tool.type;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tool.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'bg-white dark:bg-slate-900 rounded-xl shadow-xl',
          'border border-slate-200 dark:border-slate-700',
          'flex flex-col overflow-hidden',
          isMinimized ? 'h-16' : 'h-[70vh]'
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700"
          style={{ backgroundColor: maestro?.color ? `${maestro.color}10` : undefined }}
        >
          <div className="flex items-center gap-3">
            {maestro && (
              <img
                src={maestro.avatar}
                alt={maestro.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="font-medium text-slate-900 dark:text-white">
              {maestro?.name || 'Tool'}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {tool.status === 'building' ? 'Creazione in corso...' : getToolLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onToggleMinimize && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleMinimize}
                aria-label={isMinimized ? 'Espandi' : 'Minimizza'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="flex-1 overflow-auto">
            {tool.status === 'building' || tool.status === 'initializing' ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-slate-500 dark:text-slate-400">
                  {Math.round(tool.progress * 100)}% completato...
                </p>
              </div>
            ) : tool.status === 'error' ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500">
                <X className="w-12 h-12" />
                <p>Errore nella creazione del tool</p>
                {tool.error && (
                  <p className="text-sm text-slate-500">{tool.error}</p>
                )}
              </div>
            ) : (
              renderToolContent()
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
