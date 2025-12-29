// ============================================================================
// API ROUTE: Server-Sent Events for real-time tool updates
// Clients connect here to receive tool creation/update events
// Used by Tool Canvas component to show Maestro building tools live
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  registerClient,
  unregisterClient,
  sendHeartbeat,
  HEARTBEAT_INTERVAL_MS,
  getSessionClientCount,
  getTotalClientCount,
} from '@/lib/realtime/tool-events';

// Generate unique client ID
function generateClientId(): string {
  return `sse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * SSE endpoint for real-time tool updates
 *
 * Query params:
 * - sessionId: Required. The session to subscribe to
 *
 * Events sent:
 * - tool:created - New tool started building
 * - tool:update - Incremental content update
 * - tool:complete - Tool finished
 * - tool:error - Error occurred
 * - :heartbeat - Keep-alive ping (every 30s)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  // Validate session ID
  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId query parameter is required' },
      { status: 400 }
    );
  }

  // Validate session ID format (prevent injection)
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid sessionId format' },
      { status: 400 }
    );
  }

  const clientId = generateClientId();

  logger.info('SSE connection request', {
    clientId,
    sessionId,
    userAgent: request.headers.get('user-agent')?.substring(0, 50),
  });

  // Create readable stream for SSE
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register this client
      registerClient(clientId, sessionId, controller);

      // Send initial connection confirmation
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        clientId,
        sessionId,
        timestamp: Date.now(),
        sessionClients: getSessionClientCount(sessionId),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Set up heartbeat interval
      const heartbeatInterval = setInterval(() => {
        if (!sendHeartbeat(clientId)) {
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up on abort (client disconnect)
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unregisterClient(clientId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },

    cancel() {
      unregisterClient(clientId);
      logger.info('SSE stream cancelled', { clientId, sessionId });
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*', // Adjust for production
    },
  });
}

/**
 * Get SSE connection stats (for monitoring)
 */
export async function HEAD() {
  const totalClients = getTotalClientCount();

  return new Response(null, {
    status: 200,
    headers: {
      'X-SSE-Total-Clients': totalClients.toString(),
    },
  });
}
