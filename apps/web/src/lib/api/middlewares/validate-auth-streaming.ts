/**
 * Streaming-Safe Auth Validation
 *
 * For use in streaming endpoints (SSE, ReadableStream) where middleware
 * cannot be used because it would block the stream response.
 *
 * This helper validates authentication without returning a Response,
 * allowing the caller to handle errors appropriately for streaming contexts.
 *
 * @example
 * ```typescript
 * export const GET = async (request: Request) => {
 *   const auth = await validateAuthForStreaming(request);
 *   if (!auth.authenticated) {
 *     return new Response(
 *       JSON.stringify({ error: 'Unauthorized' }),
 *       { status: 401, headers: { 'Content-Type': 'application/json' } }
 *     );
 *   }
 *
 *   // Continue with streaming response
 *   const stream = new ReadableStream({ ... });
 *   return new Response(stream, {
 *     headers: { 'Content-Type': 'text/event-stream' }
 *   });
 * };
 * ```
 */

import { cookies } from 'next/headers';
import { isSignedCookie, verifyCookieValue } from '@/lib/auth/server';
import { AUTH_COOKIE_NAME, VISITOR_COOKIE_NAME } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

export interface StreamingAuthResult {
  authenticated: boolean;
  userId: string | null;
  visitorId: string | null;
  error?: string;
}

/**
 * Validate user authentication for streaming endpoints.
 * Unlike middleware, this returns an auth result object instead of a Response.
 *
 * Supports:
 * - Authenticated users (via signed auth cookie)
 * - Trial users (via visitor cookie)
 * - Anonymous users (no cookies)
 *
 * @param request - The incoming request (used for logging context)
 * @returns Auth result with userId (if authenticated) or visitorId (if trial)
 */
export async function validateAuthForStreaming(request: Request): Promise<StreamingAuthResult> {
  try {
    const cookieStore = await cookies();

    // Check for authenticated user (signed cookie)
    const authCookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (authCookieValue) {
      // Verify signed cookie
      if (!isSignedCookie(authCookieValue)) {
        logger.warn('Unsigned auth cookie in streaming endpoint', {
          url: request.url,
        });
        return {
          authenticated: false,
          userId: null,
          visitorId: null,
          error: 'Invalid cookie format',
        };
      }

      const verification = verifyCookieValue(authCookieValue);
      if (!verification.valid) {
        logger.warn('Cookie signature verification failed in streaming endpoint', {
          url: request.url,
          error: verification.error,
        });
        return {
          authenticated: false,
          userId: null,
          visitorId: null,
          error: 'Invalid cookie signature',
        };
      }

      const userId = verification.value!;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        logger.warn('User not found for streaming endpoint', {
          url: request.url,
          userId,
        });
        return {
          authenticated: false,
          userId: null,
          visitorId: null,
          error: 'User not found',
        };
      }

      return {
        authenticated: true,
        userId,
        visitorId: null,
      };
    }

    // No auth cookie - check for visitor/trial cookie
    const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

    if (visitorId) {
      return {
        authenticated: false,
        userId: null,
        visitorId,
      };
    }

    // No cookies at all - anonymous user
    return {
      authenticated: false,
      userId: null,
      visitorId: null,
    };
  } catch (error) {
    logger.error('Streaming auth validation error', {
      url: request.url,
      error: String(error),
    });
    return {
      authenticated: false,
      userId: null,
      visitorId: null,
      error: 'Auth validation failed',
    };
  }
}

/**
 * Require authenticated user for streaming endpoint.
 * Returns userId if authenticated, or null with an error message.
 *
 * @example
 * ```typescript
 * const { userId, error } = await requireAuthForStreaming(request);
 * if (!userId) {
 *   return new Response(error, { status: 401 });
 * }
 * ```
 */
export async function requireAuthForStreaming(
  request: Request,
): Promise<{ userId: string | null; error: string | null }> {
  const auth = await validateAuthForStreaming(request);

  if (!auth.authenticated || !auth.userId) {
    return {
      userId: null,
      error: auth.error || 'Authentication required',
    };
  }

  return {
    userId: auth.userId,
    error: null,
  };
}

/**
 * Validate that a session belongs to the authenticated user.
 * For use in streaming endpoints like SSE.
 *
 * Voice sessions (starting with 'voice-') are ephemeral and don't have
 * a database record, so we allow them for authenticated users.
 */
export async function validateSessionOwnershipForStreaming(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Voice sessions are ephemeral - allow for authenticated users
    if (sessionId.startsWith('voice-')) {
      logger.debug('Voice session validated for streaming', { sessionId, userId });
      return true;
    }

    // Check conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    return !!conversation;
  } catch (error) {
    logger.error('Session ownership check failed in streaming endpoint', {
      sessionId,
      userId,
      error: String(error),
    });
    return false;
  }
}
