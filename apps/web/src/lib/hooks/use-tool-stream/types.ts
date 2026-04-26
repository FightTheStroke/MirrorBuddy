/**
 * Types for useToolStream hook
 * Extracted to break circular dependency with tool-event-processor
 */

import type { ToolType } from "@/lib/realtime/tool-events";

// Event received from SSE stream
export interface StreamToolEvent {
  id: string;
  type:
    | "tool:created"
    | "tool:update"
    | "tool:complete"
    | "tool:error"
    | "tool:cancelled";
  toolType: ToolType;
  sessionId: string;
  maestroId: string;
  timestamp: number;
  data: {
    title?: string;
    subject?: string;
    chunk?: string;
    progress?: number;
    content?: unknown;
    error?: string;
  };
}

// Connection state
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

// Active tool being built
export interface ActiveToolState {
  id: string;
  sessionId?: string;
  type: ToolType;
  maestroId: string;
  title: string;
  subject?: string;
  progress: number;
  chunks: string[];
  content: unknown;
  status: "building" | "completed" | "error" | "cancelled";
  startedAt: number;
  errorMessage?: string;
}

// Hook return type
export interface UseToolStreamResult {
  // Connection
  connectionState: ConnectionState;
  clientId: string | null;
  connect: () => void;
  disconnect: () => void;

  // Active tool state
  activeTool: ActiveToolState | null;
  toolHistory: StreamToolEvent[];

  // Stats
  eventsReceived: number;
}
