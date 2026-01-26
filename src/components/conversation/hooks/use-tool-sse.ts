/**
 * Tool SSE Hook
 * Listens for real-time tool events via Server-Sent Events
 * Extracted from conversation-flow.tsx
 */

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import type { ToolState } from "@/types/tools";
import type { ToolEvent } from "@/lib/realtime/tool-events";

type SetToolState = React.Dispatch<React.SetStateAction<ToolState | null>>;

/**
 * Hook to listen for tool creation/update events via SSE
 */
export function useToolSSE(
  sessionId: string | null,
  setActiveTool: SetToolState,
) {
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(
      `/api/tools/stream?sessionId=${encodeURIComponent(sessionId)}`,
    );

    const normalizeProgress = (value?: number) => {
      if (value === undefined || Number.isNaN(value)) return undefined;
      if (value > 1) {
        return Math.min(1, value / 100);
      }
      return value;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ToolEvent & {
          toolId?: string;
          progress?: number;
          error?: string;
        };
        const toolId = data.id || data.toolId;

        switch (data.type) {
          case "tool:created":
            if (!toolId) return;
            setActiveTool({
              id: toolId,
              type: data.toolType,
              status: "initializing",
              progress: 0,
              content: data.data,
              createdAt: new Date(),
            });
            break;

          case "tool:update":
            if (!toolId) return;
            setActiveTool((prev) => {
              if (!prev || prev.id !== toolId) return prev;
              const nextProgress = normalizeProgress(
                data.data?.progress ?? data.progress,
              );
              return {
                ...prev,
                status: "building",
                progress: nextProgress ?? prev.progress,
                content: data.data?.content ?? prev.content,
              };
            });
            break;

          case "tool:complete":
            if (!toolId) return;
            setActiveTool((prev) => {
              if (!prev || prev.id !== toolId) return prev;
              return {
                ...prev,
                status: "completed",
                progress: 1,
                content: data.data?.content ?? prev.content,
              };
            });
            break;

          case "tool:error":
            if (!toolId) return;
            setActiveTool((prev) => {
              if (!prev || prev.id !== toolId) return prev;
              return {
                ...prev,
                status: "error",
                error:
                  data.data?.error ||
                  data.error ||
                  "Errore durante la creazione",
              };
            });
            break;

          default:
            logger.debug("Unknown SSE event type", { type: data.type });
        }
      } catch (error) {
        logger.error("SSE message parse error", { error: String(error) });
      }
    };

    eventSource.onerror = (error) => {
      logger.error("SSE connection error", { error: String(error) });
      // EventSource will automatically try to reconnect
    };

    return () => {
      eventSource.close();
      logger.debug("SSE connection closed", { sessionId });
    };
  }, [sessionId, setActiveTool]);
}
