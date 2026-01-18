import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, validateAdminAuth } from '@/lib/auth/session-auth';

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
    context: { userId: string },
  ) => Promise<Response | NextResponse>,
) {
  return async (request: NextRequest) => {
    const auth = await validateAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return handler(request, { userId: auth.userId });
  };
}

/**
 * Wraps an API route handler to require admin authentication
 * Returns 401 if not authenticated
 * Returns 403 if not admin
 *
 * @example
 * export const POST = withAdmin(async (request, { userId, isAdmin }) => {
 *   // user is guaranteed to be admin here
 * });
 */
export function withAdmin(
  handler: (
    request: NextRequest,
    context: { userId: string; isAdmin: boolean },
  ) => Promise<Response | NextResponse>,
) {
  return async (request: NextRequest) => {
    const auth = await validateAdminAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 },
      );
    }

    return handler(request, {
      userId: auth.userId,
      isAdmin: auth.isAdmin,
    });
  };
}
