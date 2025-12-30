'use client';
// ============================================================================
// TOOL CANVAS COMPONENT
// Real-time display of tools being built by Maestri
// Layout: 80% tool canvas + 20% Maestro PiP (picture-in-picture)
// ============================================================================

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Network,
  Layers,
  HelpCircle,
  FileText,
  Clock,
  GitBranch,
  CheckCircle,
  XCircle,
  Pause,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useToolStream, type ActiveToolState } from '@/lib/hooks/use-tool-stream';
import { MindmapRenderer } from './markmap-renderer';
import { QuizTool } from './quiz-tool';
import { FlashcardTool } from './flashcard-tool';
import { DiagramRenderer } from './diagram-renderer';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/lib/realtime/tool-events';
import type { MindmapRequest, QuizRequest, FlashcardDeckRequest, DiagramRequest } from '@/types';

// Tool icons mapping
const toolIcons: Record<ToolType, React.ReactNode> = {
  mindmap: <Network className="w-5 h-5" />,
  flashcards: <Layers className="w-5 h-5" />,
  quiz: <HelpCircle className="w-5 h-5" />,
  summary: <FileText className="w-5 h-5" />,
  timeline: <Clock className="w-5 h-5" />,
  diagram: <GitBranch className="w-5 h-5" />,
};

// Tool display names
const toolNames: Record<ToolType, string> = {
  mindmap: 'Mappa Mentale',
  flashcards: 'Flashcard',
  quiz: 'Quiz',
  summary: 'Riassunto',
  timeline: 'Linea del Tempo',
  diagram: 'Diagramma',
};

interface ToolCanvasProps {
  sessionId: string;
  maestroId?: string;
  maestroName?: string;
  maestroAvatar?: string;
  onToolComplete?: (tool: ActiveToolState) => void;
  onCancel?: () => void;
  className?: string;
}

export function ToolCanvas({
  sessionId,
  maestroId: _maestroId,
  maestroName = 'Maestro',
  maestroAvatar,
  onToolComplete,
  onCancel,
  className,
}: ToolCanvasProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPiP, setShowPiP] = useState(true);

  const {
    connectionState,
    activeTool,
    eventsReceived,
  } = useToolStream({
    sessionId,
    autoConnect: true,
    onEvent: (event) => {
      if (event.type === 'tool:complete' && activeTool) {
        onToolComplete?.(activeTool);
      }
    },
  });

  // Memoize status info
  const toolStatus = activeTool?.status;
  const statusInfo = useMemo(() => {
    if (!toolStatus) return null;

    switch (toolStatus) {
      case 'building':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'In costruzione...',
          color: 'text-blue-400',
          bg: 'bg-blue-900/20',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Completato!',
          color: 'text-green-400',
          bg: 'bg-green-900/20',
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: 'Errore',
          color: 'text-red-400',
          bg: 'bg-red-900/20',
        };
      case 'cancelled':
        return {
          icon: <Pause className="w-4 h-4" />,
          text: 'Annullato',
          color: 'text-yellow-400',
          bg: 'bg-yellow-900/20',
        };
    }
  }, [toolStatus]);

  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[400px] bg-slate-900 rounded-2xl overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      role="region"
      aria-label="Tool Canvas"
    >
      {/* Connection status overlay */}
      <AnimatePresence>
        {connectionState !== 'connected' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
          >
            <div className="text-center space-y-4">
              {connectionState === 'connecting' && (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  <p className="text-slate-400">Connessione in corso...</p>
                </>
              )}
              {connectionState === 'reconnecting' && (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto" />
                  <p className="text-slate-400">Riconnessione...</p>
                </>
              )}
              {connectionState === 'error' && (
                <>
                  <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="text-slate-400">Connessione fallita</p>
                </>
              )}
              {connectionState === 'disconnected' && (
                <>
                  <div className="w-8 h-8 rounded-full bg-slate-700 mx-auto" />
                  <p className="text-slate-400">Disconnesso</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main canvas area (80%) */}
      <div className="absolute inset-0 pr-0 md:pr-[20%]">
        <AnimatePresence mode="wait">
          {!activeTool && connectionState === 'connected' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
                  <Network className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400">
                  In attesa che {maestroName} inizi a costruire...
                </p>
              </div>
            </motion.div>
          )}

          {activeTool && (
            <motion.div
              key="tool"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col"
            >
              {/* Tool header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    {toolIcons[activeTool.type]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {activeTool.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {toolNames[activeTool.type]}
                      {activeTool.subject && ` • ${activeTool.subject}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  {statusInfo && (
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-sm flex items-center gap-1.5',
                        statusInfo.color,
                        statusInfo.bg
                      )}
                    >
                      {statusInfo.icon}
                      {statusInfo.text}
                    </span>
                  )}

                  {/* Controls */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    aria-label={isFullscreen ? 'Esci da fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Maximize2 className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {onCancel && activeTool.status === 'building' && (
                    <button
                      onClick={onCancel}
                      className="p-2 rounded-lg hover:bg-red-900/50 transition-colors"
                      aria-label="Annulla"
                    >
                      <X className="w-5 h-5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {activeTool.status === 'building' && (
                <div className="px-4 py-2">
                  <Progress value={activeTool.progress} className="h-1" />
                </div>
              )}

              {/* Tool content */}
              <div className="flex-1 overflow-auto p-4">
                <ToolRenderer tool={activeTool} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Maestro PiP (20%) - Right side */}
      <AnimatePresence>
        {showPiP && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="hidden md:block absolute top-0 right-0 w-[20%] h-full border-l border-slate-800 bg-slate-900/95"
          >
            {/* PiP Header */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {maestroAvatar ? (
                  <Image
                    src={maestroAvatar}
                    alt={maestroName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                    {maestroName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{maestroName}</p>
                  <p className="text-xs text-slate-400">Sta costruendo...</p>
                </div>
              </div>
            </div>

            {/* Building animation */}
            <div className="p-4">
              <div className="aspect-square rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden">
                {activeTool?.status === 'building' && (
                  <BuildingAnimation toolType={activeTool.type} />
                )}
                {(!activeTool || activeTool.status === 'completed') && (
                  <div className="text-center p-4">
                    <p className="text-sm text-slate-500">
                      {activeTool
                        ? 'Strumento completato!'
                        : 'In attesa...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 border-t border-slate-800">
              <div className="text-xs text-slate-500 space-y-1">
                <p>Eventi ricevuti: {eventsReceived}</p>
                {activeTool && (
                  <p>Chunks: {activeTool.chunks.length}</p>
                )}
              </div>
            </div>

            {/* Hide PiP button */}
            <button
              onClick={() => setShowPiP(false)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-slate-800 transition-colors"
              aria-label="Nascondi PiP"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show PiP button when hidden */}
      {!showPiP && (
        <button
          onClick={() => setShowPiP(true)}
          className="hidden md:flex absolute bottom-4 right-4 items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm text-slate-300"
        >
          Mostra {maestroName}
        </button>
      )}
    </div>
  );
}

// Tool-specific renderer
function ToolRenderer({ tool }: { tool: ActiveToolState }) {
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

    case 'summary':
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

// Building animation component
function BuildingAnimation({ toolType }: { toolType: ToolType }) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="text-blue-500"
    >
      {toolIcons[toolType]}
    </motion.div>
  );
}

// Export for lazy loading
export default ToolCanvas;
