// ============================================================================
// API ROUTE: User management
// GET: Get current user (authenticated) or create user (dev/local mode only)
// SECURITY: In production, unauthenticated requests return 401 (ADR 0151)
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/server';
import { createGuestSession } from '@/lib/auth/session-issuance';
import { setSessionCookies } from '@/lib/auth/session-cookies';
import { AuthenticationError } from '@/lib/auth/auth-error';
import { calculateAndPublishAdminCounts } from '@/lib/helpers/publish-admin-counts';
import { assignBaseTierToNewUser } from '@/lib/tier/server';
import { pipe, withSentry } from '@/lib/api/middlewares';

export const revalidate = 0;
export const GET = pipe(withSentry('/api/user'))(async () => {
  const auth = await validateAuth();

  if (auth.authenticated && auth.userId) {
    // User already authenticated, return their data
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        profile: true,
        settings: true,
        progress: true,
      },
    });

    if (user) {
      return NextResponse.json(user);
    }

    // User authenticated but not found (shouldn't happen in normal flow)
    logger.warn('Authenticated user not found', { userId: auth.userId });
    throw new AuthenticationError('SESSION_REJECTED');
  }

  // In production, require authentication — never auto-create users
  // This prevents bots/crawlers from polluting the DB with phantom records
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Authentication required', guest: true }, { status: 401 });
  }

  // Dev/local mode: create new user automatically
  const { user, issued } = await createGuestSession({
    profile: { create: {} },
    settings: { create: {} },
    progress: { create: {} },
  });

  // Assign Base tier to new user (Plan 073: T4-07)
  await assignBaseTierToNewUser(user.id);

  // Trigger admin counts update (non-blocking)
  calculateAndPublishAdminCounts('user-signup').catch((err) =>
    logger.warn('Failed to publish admin counts on user signup', {
      error: String(err),
    }),
  );

  // Set cookies (1 year expiry)
  const cookieStore = await cookies();
  setSessionCookies(cookieStore, issued);
  const result = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true, settings: true, progress: true },
  });
  if (!result) throw new AuthenticationError('SESSION_REJECTED');
  return NextResponse.json(result);
});
