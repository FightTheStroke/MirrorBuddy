/**
 * API Route: User Trial Status
 *
 * GET: Check if current user is a trial user (no credentials)
 * A user is NOT trial if they have username/password credentials.
 */

import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry } from "@/lib/api/middlewares";

export const GET = pipe(withSentry("/api/user/trial-status"))(async () => {
  const auth = await validateAuth();

  // No session = trial user
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ isTrialUser: true });
  }

  // Check if user has credentials
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { username: true, passwordHash: true },
  });

  // No user found = trial
  if (!user) {
    return NextResponse.json({ isTrialUser: true });
  }

  // User has credentials = not trial
  const hasCredentials = Boolean(user.username && user.passwordHash);

  return NextResponse.json({ isTrialUser: !hasCredentials });
});
