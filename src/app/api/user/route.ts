// ============================================================================
// API ROUTE: User management
// GET: Get or create current user (single-user local mode)
// ============================================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { signCookieValue } from "@/lib/auth/cookie-signing";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
} from "@/lib/auth/cookie-constants";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";
import { assignBaseTierToNewUser } from "@/lib/tier/registration-helper";
import { pipe, withSentry } from "@/lib/api/middlewares";

export const GET = pipe(withSentry("/api/user"))(async () => {
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
    logger.warn("Authenticated user not found", { userId: auth.userId });
  }

  // No authenticated user - create new user for local mode
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

  // Assign Base tier to new user (Plan 073: T4-07)
  await assignBaseTierToNewUser(user.id);

  // Trigger admin counts update (non-blocking)
  calculateAndPublishAdminCounts("user-signup").catch((err) =>
    logger.warn("Failed to publish admin counts on user signup", {
      error: String(err),
    }),
  );

  // Set cookies (1 year expiry)
  const signedCookie = signCookieValue(user.id);
  const cookieStore = await cookies();

  // Server-side auth cookie (httpOnly, signed)
  cookieStore.set(AUTH_COOKIE_NAME, signedCookie.signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Client-readable cookie (for client-side userId access)
  cookieStore.set(AUTH_COOKIE_CLIENT, user.id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return NextResponse.json(user);
});
