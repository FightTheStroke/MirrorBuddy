/**
 * Disconnect Google Account
 * POST /api/auth/google/disconnect
 *
 * Revokes tokens and disconnects Google account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { disconnectGoogleAccount } from '@/lib/google';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const success = await disconnectGoogleAccount(userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Account not found or already disconnected' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Google disconnect failed', undefined, error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
