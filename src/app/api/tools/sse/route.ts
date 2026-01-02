// ============================================================================
// SSE ENDPOINT FOR TOOL EVENTS
// Real-time updates when Maestri build tools (mindmaps, quizzes, flashcards)
// Part of Phase 1-6: Conversation-First Architecture
// ============================================================================

import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import {
  registerClient,
  unregisterClient,
  sendHeartbeat,
  HEARTBEAT_INTERVAL_MS,
} from '@/lib/realtime/tool-events';
import { logger } from '@/lib/logger';
import { validateAuth, validateSessionOwnership } from '@/lib/auth/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/sse
 * Server-Sent Events endpoint for tool creation updates
 *
 * Query params:
 * - sessionId: Required. The conversation session ID
 *
 * Events:
 * - tool:created - New tool started building
 * - tool:update - Incremental content update
 * - tool:complete - Tool finished
 * - tool:error - Error occurred
 * - mindmap:modify - Mindmap modification (voice commands)
 */
export async function GET(request: NextRequest) {
  // #86: Authentication check - SSE requires authenticated user
  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  // Validate session ID
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'sessionId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate sessionId format (prevent path traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid sessionId format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // #86: Verify session ownership - user can only subscribe to their own sessions
  const ownsSession = await validateSessionOwnership(sessionId, auth.userId);
  if (!ownsSession) {
    return new Response(
      JSON.stringify({ error: 'Session not found or access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const clientId = nanoid();

  logger.info('SSE connection requested', { sessionId, clientId });

  // Create readable stream for SSE
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register this client
      registerClient(clientId, sessionId, controller);

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: 'connected',
        clientId,
        sessionId,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Set up heartbeat interval
      const heartbeatInterval = setInterval(() => {
        const success = sendHeartbeat(clientId);
        if (!success) {
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unregisterClient(clientId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
        logger.info('SSE connection aborted', { sessionId, clientId });
      });
    },

    cancel() {
      unregisterClient(clientId);
      logger.info('SSE connection cancelled', { sessionId, clientId });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
