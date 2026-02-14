// ============================================================================
// API ROUTE: Collaboration SSE Stream
// Server-Sent Events for real-time collaboration updates
// Part of Phase 8: Multi-User Collaboration
// Uses Redis for metadata (multi-instance aware), local Map for controllers
// ============================================================================

import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { getSSEStore, getInstanceId } from '@/lib/realtime';
import { getRoom } from '@/lib/collab/mindmap-room';
import { pipe } from '@/lib/api/pipe';
import { withSentry, withAuth } from '@/lib/api/middlewares';

// ============================================================================
// TYPES
// ============================================================================


export const revalidate = 0;
interface LocalSSEClient {
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

// Local Map for controller references (can't store in Redis)
// Redis store tracks metadata for cross-instance awareness
const localClients = new Map<string, LocalSSEClient>();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

// Client timeout (5 minutes)
const CLIENT_TIMEOUT_MS = 300000;

/**
 * Register a collaboration SSE client (local + Redis)
 */
export async function registerCollabClient(
  clientId: string,
  roomId: string,
  userId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  const now = Date.now();

  // Store controller locally (can't serialize to Redis)
  localClients.set(clientId, {
    id: clientId,
    roomId,
    userId,
    controller,
    createdAt: now,
  });

  // Store metadata in Redis for cross-instance awareness
  const store = getSSEStore();
  await store.register({
    id: clientId,
    roomId,
    userId,
    instanceId: getInstanceId(),
    createdAt: now,
  });

  logger.info('Collab SSE client registered', {
    clientId,
    roomId,
    userId,
    storeMode: store.getMode(),
    localClients: localClients.size,
  });
}

/**
 * Unregister a collaboration SSE client (local + Redis)
 */
export async function unregisterCollabClient(clientId: string): Promise<void> {
  const client = localClients.get(clientId);
  if (client) {
    localClients.delete(clientId);

    // Remove from Redis store
    const store = getSSEStore();
    await store.unregister(clientId);

    logger.info('Collab SSE client unregistered', {
      clientId,
      roomId: client.roomId,
      localClients: localClients.size,
    });
  }
}

/**
 * Broadcast event to all LOCAL clients in a room
 * Note: In multi-instance deployments, only reaches clients on this instance
 * For cross-instance, use Redis pub/sub (future enhancement)
 */
export function broadcastCollabEvent(event: CollabSSEEvent, excludeUserId?: string): void {
  const eventString = `data: ${JSON.stringify(event)}\n\n`;
  const eventBytes = new TextEncoder().encode(eventString);

  let deliveredCount = 0;

  localClients.forEach((client) => {
    if (client.roomId !== event.roomId) return;
    if (excludeUserId && client.userId === excludeUserId) return;

    try {
      client.controller.enqueue(eventBytes);
      deliveredCount++;
    } catch (error) {
      logger.warn('Failed to send to collab SSE client', {
        clientId: client.id,
        error: String(error),
      });
      // Fire and forget unregister
      void unregisterCollabClient(client.id);
    }
  });

  logger.debug('Collab event broadcast', {
    eventType: event.type,
    roomId: event.roomId,
    deliveredTo: deliveredCount,
    instanceId: getInstanceId(),
  });
}

/**
 * Get client count for a room (from Redis for cross-instance count)
 */
export async function getRoomClientCount(roomId: string): Promise<number> {
  const store = getSSEStore();
  return store.getRoomClientCount(roomId);
}

/**
 * Get LOCAL client count for a room (this instance only)
 */
export function getLocalRoomClientCount(roomId: string): number {
  let count = 0;
  localClients.forEach((client) => {
    if (client.roomId === roomId) count++;
  });
  return count;
}

/**
 * Cleanup stale clients (local + Redis)
 */
export async function cleanupStaleCollabClients(): Promise<number> {
  const now = Date.now();
  let cleanedCount = 0;

  // Cleanup local clients
  localClients.forEach((client, clientId) => {
    if (now - client.createdAt > CLIENT_TIMEOUT_MS) {
      try {
        client.controller.close();
      } catch {
        // Already closed
      }
      localClients.delete(clientId);
      // Fire and forget Redis cleanup
      void getSSEStore().unregister(clientId);
      cleanedCount++;
    }
  });

  // Also trigger Redis store cleanup
  const store = getSSEStore();
  const redisCleanedCount = await store.cleanupStale(CLIENT_TIMEOUT_MS);

  if (cleanedCount > 0 || redisCleanedCount > 0) {
    logger.info('Cleaned up stale collab SSE clients', {
      localCleaned: cleanedCount,
      redisCleaned: redisCleanedCount,
    });
  }

  return cleanedCount + redisCleanedCount;
}

// ============================================================================
// SSE ROUTE HANDLER
// ============================================================================

export const GET = pipe(
  withSentry('/api/collab/sse'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { searchParams } = new URL(ctx.req.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return new Response(JSON.stringify({ error: 'roomId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate IDs
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(roomId) || !/^[a-zA-Z0-9_-]{1,64}$/.test(userId)) {
    return new Response(JSON.stringify({ error: 'Invalid roomId or userId format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const room = getRoom(roomId);
  if (!room || !room.participants.has(userId)) {
    return new Response(JSON.stringify({ error: 'Room not found or access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientId = nanoid();
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register client (async, fire-and-forget for Redis metadata)
      void registerCollabClient(clientId, roomId, userId, controller);

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: 'connected',
        clientId,
        roomId,
        userId,
        timestamp: Date.now(),
        storeMode: getSSEStore().getMode(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Broadcast user joined to others
      broadcastCollabEvent(
        {
          type: 'user:online',
          roomId,
          userId,
          timestamp: Date.now(),
          data: { clientId },
        },
        userId,
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
          void unregisterCollabClient(clientId);
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
          type: 'user:offline',
          roomId,
          userId,
          timestamp: Date.now(),
          data: { clientId },
        },
        userId,
      );

      void unregisterCollabClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
