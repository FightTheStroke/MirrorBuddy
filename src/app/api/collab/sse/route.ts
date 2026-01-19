// ============================================================================
// API ROUTE: Collaboration SSE Stream
// Server-Sent Events for real-time collaboration updates
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";

// ============================================================================
// TYPES
// ============================================================================

interface CollabSSEClient {
  id: string;
  roomId: string;
  userId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  createdAt: number;
}

export interface CollabSSEEvent {
  type: string;
  roomId: string;
  userId: string;
  timestamp: number;
  version?: number;
  data: Record<string, unknown>;
}

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

// In-memory store for SSE clients (use Redis in production)
const collabClients = new Map<string, CollabSSEClient>();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

// Client timeout (5 minutes)
const CLIENT_TIMEOUT_MS = 300000;

/**
 * Register a collaboration SSE client
 */
export function registerCollabClient(
  clientId: string,
  roomId: string,
  userId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): void {
  collabClients.set(clientId, {
    id: clientId,
    roomId,
    userId,
    controller,
    createdAt: Date.now(),
  });

  logger.info("Collab SSE client registered", {
    clientId,
    roomId,
    userId,
    totalClients: collabClients.size,
  });
}

/**
 * Unregister a collaboration SSE client
 */
export function unregisterCollabClient(clientId: string): void {
  const client = collabClients.get(clientId);
  if (client) {
    collabClients.delete(clientId);
    logger.info("Collab SSE client unregistered", {
      clientId,
      roomId: client.roomId,
      totalClients: collabClients.size,
    });
  }
}

/**
 * Broadcast event to all clients in a room
 */
export function broadcastCollabEvent(
  event: CollabSSEEvent,
  excludeUserId?: string,
): void {
  const eventString = `data: ${JSON.stringify(event)}\n\n`;
  const eventBytes = new TextEncoder().encode(eventString);

  let deliveredCount = 0;

  collabClients.forEach((client) => {
    if (client.roomId !== event.roomId) return;
    if (excludeUserId && client.userId === excludeUserId) return;

    try {
      client.controller.enqueue(eventBytes);
      deliveredCount++;
    } catch (error) {
      logger.warn("Failed to send to collab SSE client", {
        clientId: client.id,
        error: String(error),
      });
      unregisterCollabClient(client.id);
    }
  });

  logger.debug("Collab event broadcast", {
    eventType: event.type,
    roomId: event.roomId,
    deliveredTo: deliveredCount,
  });
}

/**
 * Get client count for a room
 */
export function getRoomClientCount(roomId: string): number {
  let count = 0;
  collabClients.forEach((client) => {
    if (client.roomId === roomId) count++;
  });
  return count;
}

/**
 * Cleanup stale clients
 */
export function cleanupStaleCollabClients(): number {
  const now = Date.now();
  let cleanedCount = 0;

  collabClients.forEach((client, clientId) => {
    if (now - client.createdAt > CLIENT_TIMEOUT_MS) {
      try {
        client.controller.close();
      } catch {
        // Already closed
      }
      collabClients.delete(clientId);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.info("Cleaned up stale collab SSE clients", { cleanedCount });
  }

  return cleanedCount;
}

// ============================================================================
// SSE ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  // Security: Get userId from authenticated session only
  const { userId, errorResponse } = await requireAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return new Response(JSON.stringify({ error: "roomId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate IDs
  if (
    !/^[a-zA-Z0-9_-]{1,64}$/.test(roomId) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(userId!)
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid roomId or userId format" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const clientId = nanoid();
  let heartbeatInterval: NodeJS.Timeout | null = null;
  const finalUserId = userId!;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register client
      registerCollabClient(clientId, roomId, finalUserId, controller);

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: "connected",
        clientId,
        roomId,
        userId: finalUserId,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Broadcast user joined to others
      broadcastCollabEvent(
        {
          type: "user:online",
          roomId,
          userId: finalUserId,
          timestamp: Date.now(),
          data: { clientId },
        },
        finalUserId,
      );

      // Setup heartbeat
      heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `:heartbeat ${Date.now()}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          unregisterCollabClient(clientId);
        }
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Broadcast user offline to others
      broadcastCollabEvent(
        {
          type: "user:offline",
          roomId,
          userId: finalUserId,
          timestamp: Date.now(),
          data: { clientId },
        },
        finalUserId,
      );

      unregisterCollabClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
