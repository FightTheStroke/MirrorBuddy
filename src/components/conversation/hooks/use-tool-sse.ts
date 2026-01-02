/**
 * Tool SSE Hook
 * Listens for real-time tool events via Server-Sent Events
 * Extracted from conversation-flow.tsx
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { ToolState } from '@/types/tools';

type SetToolState = React.Dispatch<React.SetStateAction<ToolState | null>>;

/**
 * Hook to listen for tool creation/update events via SSE
 */
export function useToolSSE(sessionId: string | null, setActiveTool: SetToolState) {
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/tools/sse?sessionId=${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'connected':
            logger.debug('SSE connected', { sessionId, clientId: data.clientId });
            break;

          case 'tool:created':
            setActiveTool({
              id: data.toolId,
              type: data.toolType,
              status: 'initializing',
              progress: 0,
              content: data.data,
              createdAt: new Date(),
            });
            break;

          case 'tool:update':
            setActiveTool((prev) => {
              if (!prev || prev.id !== data.toolId) return prev;
              return {
                ...prev,
                status: 'building',
                progress: data.progress ?? prev.progress,
                content: data.data ?? prev.content,
              };
            });
            break;

          case 'tool:complete':
            setActiveTool((prev) => {
              if (!prev || prev.id !== data.toolId) return prev;
              return {
                ...prev,
                status: 'completed',
                progress: 1,
                content: data.data ?? prev.content,
              };
            });
            break;

          case 'tool:error':
            setActiveTool((prev) => {
              if (!prev || prev.id !== data.toolId) return prev;
              return {
                ...prev,
                status: 'error',
                error: data.error || 'Errore durante la creazione',
              };
            });
            break;

          case 'heartbeat':
            // Keep-alive, no action needed
            break;

          default:
            logger.debug('Unknown SSE event type', { type: data.type });
        }
      } catch (error) {
        logger.error('SSE message parse error', { error: String(error) });
      }
    };

    eventSource.onerror = (error) => {
      logger.error('SSE connection error', { error: String(error) });
      // EventSource will automatically try to reconnect
    };

    return () => {
      eventSource.close();
      logger.debug('SSE connection closed', { sessionId });
    };
  }, [sessionId, setActiveTool]);
}
