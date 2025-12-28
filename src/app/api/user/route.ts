// ============================================================================
// API ROUTE: User management
// GET: Get or create current user (single-user local mode)
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      // Create new user for local mode
      const user = await prisma.user.create({
        data: {},
        include: {
          profile: true,
          settings: true,
          progress: true,
        },
      });

      // Set cookie (1 year expiry)
      cookieStore.set('convergio-user-id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return NextResponse.json(user);
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
      // Cookie exists but user deleted, create new
      user = await prisma.user.create({
        data: {},
        include: {
          profile: true,
          settings: true,
          progress: true,
        },
      });

      cookieStore.set('convergio-user-id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
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
