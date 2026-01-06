import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { ToolEvent } from '@/lib/realtime/tool-events';
import type { LiveStatus } from '../types';

interface UseSSEConnectionOptions {
  sessionId: string;
  toolId?: string;
  initialContent?: string;
  onUpdate: (content: string) => void;
  onProgress: (progress: number) => void;
  onTitle: (title: string) => void;
  onComplete: (content: string) => void;
  onError: (error: string) => void;
  onStatusChange: (status: LiveStatus) => void;
}

export function useSSEConnection({
  sessionId,
  toolId,
  initialContent,
  onUpdate,
  onProgress,
  onTitle,
  onComplete,
  onError,
  onStatusChange,
}: UseSSEConnectionOptions) {
  const contentRef = useRef<string>(initialContent || '');
  const [status, setStatus] = useState<LiveStatus>('connecting');

  const setStatusAndNotify = useCallback((newStatus: LiveStatus) => {
    setStatus(newStatus);
    onStatusChange(newStatus);
  }, [onStatusChange]);

  useEffect(() => {
    if (!sessionId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnects = 5;

    const connect = () => {
      setStatusAndNotify('connecting');

      eventSource = new EventSource(`/api/tools/stream?sessionId=${sessionId}`);

      eventSource.onopen = () => {
        setStatusAndNotify('waiting');
        reconnectAttempts = 0;
        logger.info('MindMapLive SSE connected', { sessionId });
      };

      eventSource.onmessage = (event) => {
        if (!event.data) return;

        try {
          const data: ToolEvent = JSON.parse(event.data);

          if (data.toolType !== 'mindmap') return;
          if (toolId && data.id !== toolId) return;

          switch (data.type) {
            case 'tool:created':
              setStatusAndNotify('building');
              if (data.data.title) {
                onTitle(data.data.title);
              }
              contentRef.current = `# ${data.data.title || 'Mappa Mentale'}\n`;
              onUpdate(contentRef.current);
              break;

            case 'tool:update':
              if (data.data.chunk) {
                contentRef.current += data.data.chunk;
                onUpdate(contentRef.current);
              }
              if (data.data.progress !== undefined) {
                onProgress(data.data.progress);
              }
              break;

            case 'tool:complete':
              setStatusAndNotify('complete');
              onProgress(100);
              if (data.data.content && typeof data.data.content === 'string') {
                contentRef.current = data.data.content;
                onUpdate(contentRef.current);
              }
              onComplete(contentRef.current);
              break;

            case 'tool:error':
              setStatusAndNotify('error');
              onError(data.data.error || 'Errore durante la creazione');
              break;

            case 'tool:cancelled':
              setStatusAndNotify('error');
              onError('Creazione annullata');
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          setStatusAndNotify('error');
          onError('Connessione persa');

          if (reconnectAttempts < maxReconnects) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, 2000 * reconnectAttempts);
          }
        }
      };
    };

    connect();

    if (initialContent) {
      setStatusAndNotify('building');
      contentRef.current = initialContent;
      onUpdate(initialContent);
    }

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [sessionId, toolId, initialContent, onUpdate, onProgress, onTitle, onComplete, onError, setStatusAndNotify]);

  return { status, content: contentRef.current };
}

