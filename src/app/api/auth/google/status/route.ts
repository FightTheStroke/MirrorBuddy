/**
 * Google Connection Status
 * GET /api/auth/google/status?userId=xxx
 *
 * Returns the current Google account connection status for a user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { GoogleConnectionStatus } from '@/lib/google';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.googleAccount.findUnique({
      where: { userId },
      select: {
        isConnected: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        expiresAt: true,
        scopes: true,
      },
    });

    if (!account || !account.isConnected) {
      const status: GoogleConnectionStatus = {
        isConnected: false,
      };
      return NextResponse.json(status);
    }

    // Parse scopes from JSON string
    let scopes: string[] = [];
    try {
      scopes = JSON.parse(account.scopes);
    } catch {
      scopes = [];
    }

    const status: GoogleConnectionStatus = {
      isConnected: true,
      email: account.email,
      displayName: account.displayName || undefined,
      avatarUrl: account.avatarUrl || undefined,
      expiresAt: account.expiresAt,
      scopes,
    };

    return NextResponse.json(status);

  } catch (error) {
    logger.error('Google status check failed', { error, userId });
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
