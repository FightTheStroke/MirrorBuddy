/**
 * Tool Canvas Component
 * Real-time display of tools being built by Maestri
 * Layout: 80% tool canvas + 20% Maestro PiP (picture-in-picture)
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network } from 'lucide-react';
import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';
import {
  useToolStream,
  type ActiveToolState,
  type StreamToolEvent,
} from '@/lib/hooks/use-tool-stream';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { StudentSummaryData } from '@/types/tools';
import { getUserId } from './tool-canvas/utils';
import { ConnectionOverlay } from './tool-canvas/components/connection-overlay';
import { ToolHeader } from './tool-canvas/components/tool-header';
import { ToolRenderer } from './tool-canvas/components/tool-renderer';
import { MaestroPip } from './tool-canvas/components/maestro-pip';
import { CheckCircle, XCircle, Pause, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('tools');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPiP, setShowPiP] = useState(true);

  // Save student summary to materials archive
  const handleSaveStudentSummary = useCallback(async (data: StudentSummaryData) => {
    try {
      const userId = getUserId();
      const response = await csrfFetch('/api/tools/saved', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          type: 'summary',
          title: data.title,
          topic: data.topic,
          content: data,
          maestroId: data.maestroId,
          sessionId: data.sessionId,
        }),
      });
      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }
      logger.info('Student summary saved', { title: data.title });
    } catch (error) {
      logger.error('Failed to save student summary', {
        error: String(error),
      });
      throw error;
    }
  }, []);

  // Memoized toggle handlers to prevent re-renders
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleShowPip = useCallback(() => {
    setShowPiP(true);
  }, []);

  const handleHidePip = useCallback(() => {
    setShowPiP(false);
  }, []);

  // Store refs to avoid stale closures in event handler
  const onToolCompleteRef = useRef(onToolComplete);
  const activeToolRef = useRef<ActiveToolState | null>(null);
  useEffect(() => {
    onToolCompleteRef.current = onToolComplete;
  }, [onToolComplete]);

  // Memoized event handler
  const handleToolEvent = useCallback((event: StreamToolEvent) => {
    if (event.type === 'tool:complete' && activeToolRef.current) {
      onToolCompleteRef.current?.(activeToolRef.current);
    }
  }, []);

  const { connectionState, activeTool, eventsReceived } = useToolStream({
    sessionId,
    autoConnect: true,
    onEvent: handleToolEvent,
  });

  // Keep activeToolRef in sync
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

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
        'relative w-full h-full min-h-[400px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className,
      )}
      role="region"
      aria-label={t('toolCanvas')}
    >
      <ConnectionOverlay connectionState={connectionState} />

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
                <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto">
                  <Network className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {t('inAttesaChe')} {maestroName} {t('iniziACostruire')}
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
              <ToolHeader
                tool={activeTool}
                statusInfo={statusInfo}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                onCancel={onCancel}
              />

              {/* Progress bar */}
              {activeTool.status === 'building' && (
                <div className="px-4 py-2">
                  <Progress value={activeTool.progress} className="h-1" />
                </div>
              )}

              {/* Tool content */}
              <div className="flex-1 overflow-auto p-4">
                <ToolRenderer tool={activeTool} onSaveStudentSummary={handleSaveStudentSummary} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Maestro PiP (20%) - Right side */}
      <AnimatePresence>
        {showPiP && (
          <MaestroPip
            maestroName={maestroName}
            maestroAvatar={maestroAvatar}
            activeTool={activeTool}
            eventsReceived={eventsReceived}
            onHide={handleHidePip}
          />
        )}
      </AnimatePresence>

      {/* Show PiP button when hidden */}
      {!showPiP && (
        <button
          onClick={handleShowPip}
          className="hidden md:flex absolute bottom-4 right-4 items-center gap-2 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-300"
        >
          {t('mostra')} {maestroName}
        </button>
      )}
    </div>
  );
}

// Export for lazy loading
export default ToolCanvas;
