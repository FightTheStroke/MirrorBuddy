/**
 * Utility functions for collaboration hook
 * Handles mindmap refresh and SSE connection setup
 */

import { logger } from "@/lib/logger";
import type { MindmapData } from "@/lib/tools/mindmap-export";
import type { CollabSSEEvent } from "@/app/api/collab/sse/route";
import type { CollaborationState } from "./types";

/**
 * Refresh mindmap from server
 */
export async function refreshMindmapFromServer(
  roomId: string,
  onMindmapUpdate?: (mindmap: MindmapData) => void,
): Promise<void> {
  try {
    const response = await fetch(`/api/collab/rooms/${roomId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.mindmap) {
        onMindmapUpdate?.(data.mindmap);
      }
    }
  } catch (error) {
    logger.warn("Failed to refresh mindmap", { error, roomId });
  }
}

/**
 * Setup SSE connection to collaboration server
 */
export function setupSSEConnection(
  roomId: string,
  userId: string,
  eventHandler: (event: CollabSSEEvent, roomId: string) => void,
  setState: React.Dispatch<React.SetStateAction<CollaborationState>>,
): EventSource {
  // eslint-disable-next-line no-restricted-syntax -- Cleanup verified: caller (main.ts) stores ref and closes in useEffect cleanup (line 52-56)
  const es = new EventSource(
    `/api/collab/sse?roomId=${roomId}&userId=${userId}`,
  );

  es.onopen = () => {
    setState((prev) => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      roomId,
    }));
    logger.info("Connected to collaboration room", { roomId });
  };

  es.onerror = () => {
    logger.error("Collaboration SSE error", { roomId });
    setState((prev) => ({
      ...prev,
      isConnected: false,
      error: "Connection lost",
    }));
  };

  es.onmessage = (event) => {
    try {
      const data: CollabSSEEvent = JSON.parse(event.data);
      eventHandler(data, roomId);
    } catch (error) {
      logger.warn("Failed to parse collab event", { error });
    }
  };

  return es;
}
