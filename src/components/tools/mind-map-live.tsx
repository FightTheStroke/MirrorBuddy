'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { MindMapLiveProps, LiveStatus, UseMindMapLiveOptions } from './mind-map-live/types';

export type { MindMapLiveProps, UseMindMapLiveOptions };
import { useMindmapRenderer } from './mind-map-live/hooks/use-mindmap-renderer';
import { useSSEConnection } from './mind-map-live/hooks/use-sse-connection';
import { StatusIndicator } from './mind-map-live/components/status-indicator';
import { ZoomControls } from './mind-map-live/components/zoom-controls';

export function MindMapLive({
  sessionId,
  toolId,
  title: initialTitle,
  initialContent = '',
  onComplete,
  onError,
  className,
}: MindMapLiveProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { renderMindmap, markmapRef } = useMindmapRenderer(svgRef);

  const [title, setTitle] = useState(initialTitle || 'Mappa in costruzione...');
  const [progress, setProgress] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<LiveStatus>('connecting');

  const { settings } = useAccessibilityStore();

  const handleUpdate = useCallback((content: string) => {
    const count = renderMindmap(content, true);
    if (count !== undefined) {
      setNodeCount(count);
    }
  }, [renderMindmap]);

  const handleProgress = useCallback((prog: number) => {
    setProgress(prog);
  }, []);

  const handleTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  const handleComplete = useCallback((content: string) => {
    renderMindmap(content, true);
    onComplete?.(content);
  }, [renderMindmap, onComplete]);

  const handleError = useCallback((err: string) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  useSSEConnection({
    sessionId,
    toolId,
    initialContent,
    onUpdate: handleUpdate,
    onProgress: handleProgress,
    onTitle: handleTitle,
    onComplete: handleComplete,
    onError: handleError,
    onStatusChange: setStatus,
  });

  const handleZoomIn = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(1.25);
    }
    setZoom((z) => Math.min(z * 1.25, 3));
  }, [markmapRef]);

  const handleZoomOut = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(0.8);
    }
    setZoom((z) => Math.max(z * 0.8, 0.5));
  }, [markmapRef]);

  const handleReset = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.fit();
    }
    setZoom(1);
  }, [markmapRef]);

  if (initialContent && status === 'connecting') {
    setStatus('building');
    handleUpdate(initialContent);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        settings.highContrast
          ? 'border-white bg-black'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        className
      )}
      role="region"
      aria-label={`Mappa mentale in tempo reale: ${title}`}
      aria-live="polite"
    >
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          settings.highContrast
            ? 'border-white bg-black'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              status === 'building' && 'animate-pulse',
              settings.highContrast ? 'bg-yellow-400' : 'bg-accent-themed/10'
            )}
          >
            <Network
              className={cn(
                'w-5 h-5',
                settings.highContrast ? 'text-black' : 'text-accent-themed'
              )}
            />
          </div>
          <div>
            <h3
              className={cn(
                'font-semibold',
                settings.dyslexiaFont && 'tracking-wide',
                settings.highContrast ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-200'
              )}
            >
              {title}
            </h3>
            <StatusIndicator status={status} nodeCount={nodeCount} progress={progress} error={error} />
          </div>
        </div>

        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />
      </div>

      <AnimatePresence>
        {status === 'building' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 4 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-200 dark:bg-slate-700"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'p-4 overflow-auto',
          settings.highContrast ? 'bg-black' : 'bg-white dark:bg-slate-900'
        )}
        style={{ minHeight: '350px', maxHeight: '500px' }}
      >
        {status === 'error' && error ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center h-64 text-center',
              settings.highContrast ? 'text-red-400' : 'text-red-500'
            )}
          >
            <XCircle className="w-12 h-12 mb-3" />
            <p className="font-medium">{error}</p>
            <p className="text-sm text-slate-500 mt-2">
              Chiedi al Professore di riprovare
            </p>
          </div>
        ) : status === 'waiting' ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Network className="w-12 h-12 mb-3 text-slate-400" />
            </motion.div>
            <p className="font-medium">In attesa della mappa...</p>
            <p className="text-sm mt-2">
              Il Professore sta preparando i contenuti
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className={cn(
              'w-full h-full min-h-[300px]',
              status === 'connecting' && 'animate-pulse rounded-lg',
              status === 'connecting' &&
                (settings.highContrast
                  ? 'bg-gray-800'
                  : 'bg-slate-100 dark:bg-slate-700/50')
            )}
            style={{ minWidth: '400px', minHeight: '300px' }}
          />
        )}
      </div>

      <div className="sr-only" aria-live="assertive">
        {status === 'complete' &&
          `Mappa mentale "${title}" completata con ${nodeCount} nodi.`}
        {status === 'building' &&
          `Costruzione mappa in corso: ${nodeCount} nodi, ${progress}% completato.`}
      </div>
    </motion.div>
  );
}

import { useMindMapLive as useMindMapLiveHook } from './mind-map-live/hooks/use-mind-map-live';

export function useMindMapLive(options: UseMindMapLiveOptions) {
  const hookResult = useMindMapLiveHook(options);
  
  return {
    ...hookResult,
    MindMapComponent: hookResult.isActive
      ? () => (
          <MindMapLive
            sessionId={hookResult.sessionId}
            toolId={hookResult.toolId || undefined}
            initialContent={hookResult.content}
            onComplete={hookResult.handleComplete}
            onError={hookResult.handleError}
          />
        )
      : null,
  };
}

export default MindMapLive;
