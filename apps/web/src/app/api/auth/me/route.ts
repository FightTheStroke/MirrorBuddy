/**
 * API ROUTE: Current User Info
 * GET: Returns current user's basic info including role
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAuth } from '@/lib/api/middlewares';
import { projectSessionIdentity } from '@/lib/auth/server-identity';
import { AuthenticationError } from '@/lib/auth/auth-error';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/auth/me'),
  withAuth,
)(async (ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('SESSION_REJECTED');
  }
  if (!ctx.authSession) throw new AuthenticationError('SESSION_UNAVAILABLE');
  const identity = await projectSessionIdentity(ctx.authSession);

  return NextResponse.json(
    {
      authenticated: true,
      identity,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'ADMIN',
      },
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
});
