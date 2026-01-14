// ============================================================================
// API ROUTE: User management
// GET: Get or create current user (single-user local mode)
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isSignedCookie, verifyCookieValue, signCookieValue } from '@/lib/auth/cookie-signing';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!cookieValue) {
      // Create new user for local mode with related records
      const user = await prisma.user.create({
        data: {
          profile: { create: {} },
          settings: { create: {} },
          progress: { create: {} },
        },
        include: {
          profile: true,
          settings: true,
          progress: true,
        },
      });

      // Set cookie (1 year expiry) with cryptographic signature
      const signedCookie = signCookieValue(user.id);
      cookieStore.set('mirrorbuddy-user-id', signedCookie.signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return NextResponse.json(user);
    }

    // Extract userId from signed or unsigned cookie
    let userId: string;
    let needsCookieUpgrade = false;

    if (isSignedCookie(cookieValue)) {
      const verification = verifyCookieValue(cookieValue);

      if (!verification.valid) {
        // Invalid signature - treat as no cookie, create new user
        logger.warn('Invalid cookie signature, creating new user', {
          error: verification.error,
        });

        const user = await prisma.user.create({
          data: {
            profile: { create: {} },
            settings: { create: {} },
            progress: { create: {} },
          },
          include: {
            profile: true,
            settings: true,
            progress: true,
          },
        });

        const signedCookie = signCookieValue(user.id);
        cookieStore.set('mirrorbuddy-user-id', signedCookie.signed, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
        });

        return NextResponse.json(user);
      }

      userId = verification.value!;
      logger.debug('Signed cookie verified', { userId });
    } else {
      // Legacy unsigned cookie - accept but mark for upgrade
      userId = cookieValue;
      needsCookieUpgrade = true;
      logger.debug('Legacy unsigned cookie, will upgrade', { userId });
    }

    // Get existing user
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
        progress: true,
      },
    });

    if (!user) {
      // Cookie exists but user deleted, create new with related records
      user = await prisma.user.create({
        data: {
          profile: { create: {} },
          settings: { create: {} },
          progress: { create: {} },
        },
        include: {
          profile: true,
          settings: true,
          progress: true,
        },
      });

      const signedCookie = signCookieValue(user.id);
      cookieStore.set('mirrorbuddy-user-id', signedCookie.signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    } else if (needsCookieUpgrade) {
      // Upgrade legacy unsigned cookie to signed cookie
      try {
        const signedCookie = signCookieValue(user.id);
        cookieStore.set('mirrorbuddy-user-id', signedCookie.signed, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
        });
        logger.debug('Legacy cookie upgraded to signed', { userId: user.id });
      } catch (upgradeError) {
        // If signing fails (e.g., no SESSION_SECRET), continue without upgrade
        logger.warn('Cookie upgrade failed, continuing with unsigned', {
          error: String(upgradeError),
        });
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error('User API error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        {
          error: 'Database not initialized',
          message: 'Run: npx prisma db push',
          hint: 'See README.md for setup instructions'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
