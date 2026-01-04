'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Brain, BookOpen, Search, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolResultDisplay } from '@/components/tools';
import type { ToolCall } from '@/types';

interface SessionToolsProps {
  toolCalls: ToolCall[];
  sessionId: string | null;
  onClearToolCalls: () => void;
  onTriggerTool: (toolName: string) => void;
}

export function SessionTools({
  toolCalls,
  sessionId,
  onClearToolCalls,
  onTriggerTool,
}: SessionToolsProps) {
  return (
    <>
      {toolCalls.length > 0 && (
        <div className="px-6 pb-4">
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-400">Strumenti utilizzati</h4>
              <button
                onClick={onClearToolCalls}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Cancella
              </button>
            </div>
            <AnimatePresence>
              {toolCalls.map((toolCall) => (
                <motion.div
                  key={toolCall.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ToolResultDisplay toolCall={toolCall} sessionId={sessionId} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="px-6 py-3 border-t border-slate-700/30 bg-slate-800/20">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTriggerTool('capture_homework')}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title="Mostra compiti via webcam"
          >
            <Camera className="h-4 w-4 mr-2" />
            <span className="text-xs">Webcam</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTriggerTool('mindmap')}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title="Crea mappa mentale"
          >
            <Network className="h-4 w-4 mr-2" />
            <span className="text-xs">Mappa</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTriggerTool('quiz')}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title="Crea quiz"
          >
            <Brain className="h-4 w-4 mr-2" />
            <span className="text-xs">Quiz</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTriggerTool('flashcard')}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title="Crea flashcard"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            <span className="text-xs">Flashcard</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTriggerTool('search')}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title="Cerca sul web"
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="text-xs">Cerca</span>
          </Button>
        </div>
      </div>
    </>
  );
}
