'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Brain, BookOpen, Search, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolResultDisplay } from '@/components/tools';
import type { ToolCall } from '@/types';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('voice');

  // Memoized handlers to prevent re-renders
  const handleWebcam = useCallback(() => onTriggerTool('capture_homework'), [onTriggerTool]);
  const handleMindmap = useCallback(() => onTriggerTool('mindmap'), [onTriggerTool]);
  const handleQuiz = useCallback(() => onTriggerTool('quiz'), [onTriggerTool]);
  const handleFlashcard = useCallback(() => onTriggerTool('flashcard'), [onTriggerTool]);
  const handleSearch = useCallback(() => onTriggerTool('search'), [onTriggerTool]);

  return (
    <>
      {toolCalls.length > 0 && (
        <div className="px-6 pb-4">
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-400">{t('sessionTools.toolsUsed')}</h4>
              <button
                onClick={onClearToolCalls}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                {t('sessionTools.clear')}
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
            onClick={handleWebcam}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title={t('sessionTools.webcamTitle')}
          >
            <Camera className="h-4 w-4 mr-2" />
            <span className="text-xs">{t('sessionTools.webcamLabel')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMindmap}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title={t('sessionTools.mindmapTitle')}
          >
            <Network className="h-4 w-4 mr-2" />
            <span className="text-xs">{t('sessionTools.mindmapLabel')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuiz}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title={t('sessionTools.quizTitle')}
          >
            <Brain className="h-4 w-4 mr-2" />
            <span className="text-xs">{t('sessionTools.quizLabel')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFlashcard}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title={t('sessionTools.flashcardTitle')}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            <span className="text-xs">{t('sessionTools.flashcardLabel')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearch}
            className="rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
            title={t('sessionTools.searchTitle')}
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="text-xs">{t('sessionTools.searchLabel')}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
