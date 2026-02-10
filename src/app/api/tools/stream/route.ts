// ============================================================================
// API ROUTE: Server-Sent Events for real-time tool updates
// Clients connect here to receive tool creation/update events
// Used by Tool Canvas component to show Maestro building tools live
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { validateAuth, validateSessionOwnership } from '@/lib/auth/server';
import {
  registerClient,
  unregisterClient,
  sendHeartbeat,
  HEARTBEAT_INTERVAL_MS,
  getSessionClientCount,
  getTotalClientCount,
} from '@/lib/realtime/tool-events';
import { getCorsHeaders } from '@/lib/security';
import { VISITOR_COOKIE_NAME, validateVisitorId } from '@/lib/auth/server';
import { pipe, withSentry } from '@/lib/api/middlewares';

// Generate unique client ID
function generateClientId(): string {
  return `sse_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Verify session ownership for SSE connection
 * Checks both authenticated users and trial users
 *
 * @returns null if authorized, or NextResponse with error if not authorized
 */
async function verifySessionOwnershipForSSE(sessionId: string): Promise<NextResponse | null> {
  // Step 1: Try authenticated user
  const auth = await validateAuth();

  if (auth.authenticated && auth.userId) {
    // User is authenticated - verify they own the session
    const ownsSession = await validateSessionOwnership(sessionId, auth.userId);

    if (!ownsSession) {
      logger.warn('Session access denied - authenticated user', {
        userId: auth.userId,
        sessionId: sessionId.slice(0, 8),
      });
      return NextResponse.json({ error: 'Session access denied' }, { status: 403 });
    }

    // Authenticated user owns this session
    return null;
  }

  // Step 2: Try trial user
  const cookieStore = await cookies();
  const rawVisitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  const visitorId = validateVisitorId(rawVisitorId);

  if (!visitorId) {
    logger.warn('Session access denied - no authentication or trial session', {
      sessionId: sessionId.slice(0, 8),
    });
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Check if sessionId is a trial session belonging to this visitor
  const trialSession = await prisma.trialSession.findFirst({
    where: {
      id: sessionId,
      visitorId: visitorId,
    },
    select: { id: true },
  });

  if (!trialSession) {
    logger.warn('Session access denied - trial user', {
      visitorId: visitorId.slice(0, 8),
      sessionId: sessionId.slice(0, 8),
    });
    return NextResponse.json({ error: 'Session access denied' }, { status: 403 });
  }

  // Trial user owns this session
  return null;
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
export const GET = pipe(withSentry('/api/tools/stream'))(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const sessionId = searchParams.get('sessionId');

  // Validate session ID
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId query parameter is required' }, { status: 400 });
  }

  // Validate session ID format (prevent injection)
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId format' }, { status: 400 });
  }

  // F-03: Verify session ownership before allowing SSE connection
  const authError = await verifySessionOwnershipForSSE(sessionId);
  if (authError) {
    return authError;
  }

  const clientId = generateClientId();

  logger.info('SSE connection request', {
    clientId,
    sessionId,
    userAgent: ctx.req.headers.get('user-agent')?.substring(0, 50),
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
      ctx.req.signal.addEventListener('abort', () => {
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

  // F-04: Get CORS headers based on request origin (no wildcard in production)
  const requestOrigin = ctx.req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      ...corsHeaders,
    },
  });
});

/**
 * Get SSE connection stats (for monitoring)
 */
export const HEAD = pipe(withSentry('/api/tools/stream'))(async () => {
  const totalClients = getTotalClientCount();

  return new Response(null, {
    status: 200,
    headers: {
      'X-SSE-Total-Clients': totalClients.toString(),
    },
  });
});
