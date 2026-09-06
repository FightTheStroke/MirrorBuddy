import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, validateAdminAuth } from '@/lib/auth/session-auth';
import type { AuthenticatedSession } from '@/lib/auth/session-auth';
import { AuthenticationError } from './auth-error';

async function authenticationBoundary(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AuthenticationError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    throw error;
  }
}

/**
 * Wraps an API route handler to require authentication
 * Returns 401 if not authenticated
 *
 * @example
 * export const GET = withAuth(async (request, { userId }) => {
 *   // userId is guaranteed to be valid here
 * });
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { userId: string; authSession: AuthenticatedSession },
  ) => Promise<Response | NextResponse>,
) {
  return async (request: NextRequest) =>
    authenticationBoundary(async () => {
      const auth = await validateAuth();

      if (!auth.authenticated || !auth.userId) {
        return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_ABSENT' }, { status: 401 });
      }

      return handler(request, { userId: auth.userId, authSession: auth.session });
    });
}

/**
 * Route context with dynamic params (Next.js App Router)
 */
interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Wraps an API route handler to require admin authentication
 * Returns 401 if not authenticated
 * Returns 403 if not admin
 *
 * @example
 * export const POST = withAdmin(async (request, { userId, isAdmin, params }) => {
 *   const { id } = await params; // Access route params
 * });
 */
export function withAdmin(
  handler: (
    request: NextRequest,
    context: {
      userId: string;
      isAdmin: boolean;
      authSession: AuthenticatedSession;
      params: Promise<Record<string, string>>;
    },
  ) => Promise<Response | NextResponse>,
) {
  return async (request: NextRequest, routeContext: RouteContext) =>
    authenticationBoundary(async () => {
      const auth = await validateAdminAuth();

      if (!auth.authenticated || !auth.userId) {
        return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_ABSENT' }, { status: 401 });
      }

      if (!auth.isAdmin) {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }

      return handler(request, {
        userId: auth.userId,
        isAdmin: auth.isAdmin,
        authSession: auth.session,
        params: routeContext?.params ?? Promise.resolve({}),
      });
    });
}
