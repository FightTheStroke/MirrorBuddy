// ============================================================================
// REALTIME TOOL EVENTS
// Server-side event emitter for broadcasting tool updates to SSE clients
// Used by Maestri to build tools in real-time while student watches
// ============================================================================

import { logger } from '@/lib/logger';

// Tool event types that can be broadcast
export type ToolEventType =
  | 'tool:created'      // New tool started
  | 'tool:update'       // Incremental update (content chunk)
  | 'tool:complete'     // Tool finished building
  | 'tool:error'        // Error during creation
  | 'tool:cancelled'    // User cancelled
  | 'mindmap:modify';   // Mindmap modification command (Phase 7)

// Tool types supported by the platform
export type ToolType =
  | 'mindmap'
  | 'flashcard'
  | 'quiz'
  | 'summary'
  | 'timeline'
  | 'diagram'
  | 'demo';

// Event payload structure
export interface ToolEvent {
  id: string;
  type: ToolEventType;
  toolType: ToolType;
  sessionId: string;
  maestroId: string;
  timestamp: number;
  data: ToolEventData;
}

export interface ToolEventData {
  // For 'tool:created'
  title?: string;
  subject?: string;

  // For 'tool:update'
  chunk?: string;
  progress?: number; // 0-100

  // For 'tool:complete'
  content?: unknown;

  // For 'tool:error'
  error?: string;

  // For 'mindmap:modify' (Phase 7: Voice Commands)
  command?: MindmapModifyCommand;
  args?: Record<string, unknown>;
}

// Mindmap modification commands (Phase 7: Voice Commands)
export type MindmapModifyCommand =
  | 'mindmap_add_node'
  | 'mindmap_connect_nodes'
  | 'mindmap_expand_node'
  | 'mindmap_delete_node'
  | 'mindmap_focus_node'
  | 'mindmap_set_color';

// Connected SSE client
interface SSEClient {
  id: string;
  sessionId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  createdAt: number;
}

// In-memory store for connected clients (per session)
// In production, use Redis pub/sub for horizontal scaling
const clients = new Map<string, SSEClient>();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

// Client timeout (5 minutes of inactivity)
const CLIENT_TIMEOUT_MS = 300000;

/**
 * Register a new SSE client connection
 */
export function registerClient(
  clientId: string,
  sessionId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): void {
  clients.set(clientId, {
    id: clientId,
    sessionId,
    controller,
    createdAt: Date.now(),
  });

  logger.info('SSE client registered', {
    clientId,
    sessionId,
    totalClients: clients.size,
  });
}

/**
 * Unregister a client when they disconnect
 */
export function unregisterClient(clientId: string): void {
  const client = clients.get(clientId);
  if (client) {
    clients.delete(clientId);
    logger.info('SSE client unregistered', {
      clientId,
      sessionId: client.sessionId,
      totalClients: clients.size,
    });
  }
}

/**
 * Broadcast a tool event to all clients in a session
 */
export function broadcastToolEvent(event: ToolEvent): void {
  const eventString = `data: ${JSON.stringify(event)}\n\n`;
  const eventBytes = new TextEncoder().encode(eventString);

  let deliveredCount = 0;

  clients.forEach((client) => {
    // Only send to clients in the same session
    if (client.sessionId === event.sessionId) {
      try {
        client.controller.enqueue(eventBytes);
        deliveredCount++;
      } catch (error) {
        // Client likely disconnected
        logger.warn('Failed to send to SSE client', {
          clientId: client.id,
          error: String(error),
        });
        unregisterClient(client.id);
      }
    }
  });

  logger.debug('Tool event broadcast', {
    eventType: event.type,
    toolType: event.toolType,
    sessionId: event.sessionId,
    deliveredTo: deliveredCount,
  });
}

/**
 * Send heartbeat to keep connections alive
 */
export function sendHeartbeat(clientId: string): boolean {
  const client = clients.get(clientId);
  if (!client) return false;

  try {
    const heartbeat = `:heartbeat ${Date.now()}\n\n`;
    client.controller.enqueue(new TextEncoder().encode(heartbeat));
    return true;
  } catch {
    unregisterClient(clientId);
    return false;
  }
}

/**
 * Get count of connected clients for a session
 */
export function getSessionClientCount(sessionId: string): number {
  let count = 0;
  clients.forEach((client) => {
    if (client.sessionId === sessionId) count++;
  });
  return count;
}

/**
 * Get total connected clients (for monitoring)
 */
export function getTotalClientCount(): number {
  return clients.size;
}

/**
 * Clean up stale clients (call periodically)
 */
export function cleanupStaleClients(): number {
  const now = Date.now();
  let cleanedCount = 0;

  clients.forEach((client, clientId) => {
    if (now - client.createdAt > CLIENT_TIMEOUT_MS) {
      try {
        client.controller.close();
      } catch {
        // Already closed
      }
      clients.delete(clientId);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.info('Cleaned up stale SSE clients', { cleanedCount });
  }

  return cleanedCount;
}

// Export heartbeat interval for use in route handler
export { HEARTBEAT_INTERVAL_MS };
