'use client';

// ============================================================================
// LIVE MIND MAP COMPONENT
// Real-time growing mind map that updates as AI streams content
// Uses SSE connection to receive tool:update events
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';
import {
  Network,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { ToolEvent } from '@/lib/realtime/tool-events';

// ============================================================================
// TYPES
// ============================================================================

export interface MindMapLiveProps {
  sessionId: string;
  toolId?: string;
  title?: string;
  initialContent?: string;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

type LiveStatus = 'connecting' | 'waiting' | 'building' | 'complete' | 'error';

// ============================================================================
// TRANSFORMER INSTANCE
// ============================================================================

const transformer = new Transformer();

// ============================================================================
// HELPER: Clear SVG children safely (no innerHTML)
// ============================================================================

function clearSvgChildren(svg: SVGSVGElement): void {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MindMapLive({
  sessionId,
  toolId,
  title: initialTitle,
  initialContent = '',
  onComplete,
  onError,
  className,
}: MindMapLiveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const contentRef = useRef<string>(initialContent);

  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [title, setTitle] = useState(initialTitle || 'Mappa in costruzione...');
  const [progress, setProgress] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const { settings } = useAccessibilityStore();

  // Count nodes in markdown content
  const countNodes = useCallback((markdown: string): number => {
    const lines = markdown.split('\n');
    return lines.filter((line) => line.trim().startsWith('#')).length;
  }, []);

  // Render or update the mindmap
  const renderMindmap = useCallback(
    (content: string, animate = true) => {
      if (!svgRef.current || !content.trim()) return;

      // FIX BUG 16: Check SVG dimensions before rendering to prevent SVGLength error
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Container not yet laid out, wait for next frame
        requestAnimationFrame(() => renderMindmap(content, animate));
        return;
      }

      // Set explicit dimensions on SVG
      svg.setAttribute('width', String(rect.width));
      svg.setAttribute('height', String(rect.height));

      try {
        const { root } = transformer.transform(content);

        // Font settings
        const fontFamily =
          settings.dyslexiaFont
            ? 'OpenDyslexic, Comic Sans MS, sans-serif'
            : 'Arial, Helvetica, sans-serif';

        const isHighContrast = settings.highContrast;

        if (markmapRef.current) {
          // Update existing markmap
          markmapRef.current.setData(root);
          markmapRef.current.fit();
        } else {
          // Clear SVG safely (no innerHTML)
          clearSvgChildren(svgRef.current);

          // Create new markmap
          markmapRef.current = Markmap.create(
            svgRef.current,
            {
              autoFit: true,
              duration: animate ? 500 : 0, // Smooth animation on updates
              maxWidth: 280,
              paddingX: 16,
              spacingVertical: 8,
              spacingHorizontal: 60,
              color: (node) => {
                if (isHighContrast) {
                  const colors = ['#ffff00', '#00ffff', '#ff00ff', '#00ff00', '#ff8000'];
                  return colors[node.state?.depth % colors.length] || '#ffffff';
                }
                const colors = [
                  '#3b82f6',
                  '#10b981',
                  '#f59e0b',
                  '#ef4444',
                  '#8b5cf6',
                  '#ec4899',
                ];
                return colors[node.state?.depth % colors.length] || '#64748b';
              },
            },
            root
          );

          // Apply custom styles
          setTimeout(() => {
            if (svgRef.current) {
              const textElements = svgRef.current.querySelectorAll('text, foreignObject');
              textElements.forEach((el) => {
                if (el instanceof SVGElement || el instanceof HTMLElement) {
                  el.style.fontFamily = fontFamily;
                  if (settings.largeText) {
                    el.style.fontSize = '15px';
                  }
                }
              });
            }
          }, 100);
        }

        setNodeCount(countNodes(content));
      } catch (err) {
        logger.error('MindMapLive render error', { error: String(err) });
      }
    },
    [settings.dyslexiaFont, settings.highContrast, settings.largeText, countNodes]
  );

  // SSE connection for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnects = 5;

    const connect = () => {
      setStatus('connecting');

      eventSource = new EventSource(`/api/tools/stream?sessionId=${sessionId}`);

      eventSource.onopen = () => {
        setStatus('waiting');
        reconnectAttempts = 0;
        logger.info('MindMapLive SSE connected', { sessionId });
      };

      eventSource.onmessage = (event) => {
        if (!event.data) return;

        try {
          const data: ToolEvent = JSON.parse(event.data);

          // Filter for mindmap events
          if (data.toolType !== 'mindmap') return;

          // Filter for specific tool if provided
          if (toolId && data.id !== toolId) return;

          switch (data.type) {
            case 'tool:created':
              setStatus('building');
              if (data.data.title) {
                setTitle(data.data.title);
              }
              contentRef.current = `# ${data.data.title || 'Mappa Mentale'}\n`;
              renderMindmap(contentRef.current, false);
              break;

            case 'tool:update':
              if (data.data.chunk) {
                contentRef.current += data.data.chunk;
                renderMindmap(contentRef.current, true);
              }
              if (data.data.progress !== undefined) {
                setProgress(data.data.progress);
              }
              break;

            case 'tool:complete':
              setStatus('complete');
              setProgress(100);
              if (data.data.content && typeof data.data.content === 'string') {
                contentRef.current = data.data.content;
                renderMindmap(contentRef.current, true);
              }
              onComplete?.(contentRef.current);
              break;

            case 'tool:error':
              setStatus('error');
              setError(data.data.error || 'Errore durante la creazione');
              onError?.(data.data.error || 'Unknown error');
              break;

            case 'tool:cancelled':
              setStatus('error');
              setError('Creazione annullata');
              break;
          }
        } catch {
          // Ignore parse errors (might be heartbeat)
        }
      };

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          setStatus('error');
          setError('Connessione persa');

          // Attempt reconnection
          if (reconnectAttempts < maxReconnects) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, 2000 * reconnectAttempts);
          }
        }
      };
    };

    connect();

    // If we have initial content, render it
    if (initialContent) {
      setStatus('building');
      contentRef.current = initialContent;
      renderMindmap(initialContent, false);
    }

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [sessionId, toolId, initialContent, renderMindmap, onComplete, onError]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(1.25);
    }
    setZoom((z) => Math.min(z * 1.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(0.8);
    }
    setZoom((z) => Math.max(z * 0.8, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.fit();
    }
    setZoom(1);
  }, []);

  // Status indicator
  const StatusIndicator = () => {
    switch (status) {
      case 'connecting':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-blue-500"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Connessione in corso...</span>
          </motion.div>
        );
      case 'waiting':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-amber-500"
          >
            <Network className="w-4 h-4" />
            <span className="text-sm">In attesa del Professore...</span>
          </motion.div>
        );
      case 'building':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-emerald-500"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm">
              Costruendo... {nodeCount} nodi ({progress}%)
            </span>
          </motion.div>
        );
      case 'complete':
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 text-emerald-600"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Completata! {nodeCount} nodi</span>
          </motion.div>
        );
      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-red-500"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </motion.div>
        );
      default:
        return null;
    }
  };

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
      {/* Header */}
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
            <StatusIndicator />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className={cn(
              'p-1.5 rounded transition-colors',
              settings.highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            )}
            title="Riduci zoom"
            aria-label="Riduci zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span
            className={cn(
              'text-xs min-w-[3rem] text-center',
              settings.highContrast ? 'text-white' : 'text-slate-500'
            )}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className={cn(
              'p-1.5 rounded transition-colors',
              settings.highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            )}
            title="Aumenta zoom"
            aria-label="Aumenta zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className={cn(
              'p-1.5 rounded transition-colors ml-1',
              settings.highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            )}
            title="Ripristina vista"
            aria-label="Ripristina vista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
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

      {/* Mind map container */}
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

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="assertive">
        {status === 'complete' &&
          `Mappa mentale "${title}" completata con ${nodeCount} nodi.`}
        {status === 'building' &&
          `Costruzione mappa in corso: ${nodeCount} nodi, ${progress}% completato.`}
      </div>
    </motion.div>
  );
}

// ============================================================================
// HOOK FOR PROGRAMMATIC CONTROL
// ============================================================================

export interface UseMindMapLiveOptions {
  sessionId: string;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
}

export function useMindMapLive({ sessionId, onComplete, onError }: UseMindMapLiveOptions) {
  const [isActive, setIsActive] = useState(false);
  const [toolId, setToolId] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  const start = useCallback((id: string, initialTitle?: string) => {
    setToolId(id);
    setContent(initialTitle ? `# ${initialTitle}\n` : '');
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setToolId(null);
  }, []);

  const handleComplete = useCallback(
    (finalContent: string) => {
      setContent(finalContent);
      onComplete?.(finalContent);
    },
    [onComplete]
  );

  const handleError = useCallback(
    (error: string) => {
      onError?.(error);
    },
    [onError]
  );

  return {
    isActive,
    toolId,
    content,
    start,
    stop,
    MindMapComponent: isActive
      ? () => (
          <MindMapLive
            sessionId={sessionId}
            toolId={toolId || undefined}
            initialContent={content}
            onComplete={handleComplete}
            onError={handleError}
          />
        )
      : null,
  };
}

export default MindMapLive;
