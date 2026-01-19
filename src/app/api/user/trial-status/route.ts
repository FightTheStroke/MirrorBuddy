/**
 * API Route: User Trial Status
 *
 * GET: Check if current user is a trial user (no credentials)
 * A user is NOT trial if they have username/password credentials.
 */

import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
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
  } catch {
    // On error, assume trial (safer default)
    return NextResponse.json({ isTrialUser: true });
  }
}
