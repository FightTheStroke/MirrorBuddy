/**
 * Disconnect Google Account
 * POST /api/auth/google/disconnect
 *
 * Revokes tokens and disconnects Google account.
 */

import { NextResponse } from 'next/server';
import { disconnectGoogleAccount } from '@/lib/google';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';

export const POST = pipe(
  withSentry('/api/auth/google/disconnect'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const success = await disconnectGoogleAccount(ctx.userId!);

  if (!success) {
    return NextResponse.json(
      { error: 'Account not found or already disconnected' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
});
