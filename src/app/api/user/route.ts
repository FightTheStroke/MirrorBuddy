// ============================================================================
// API ROUTE: User management
// GET: Get or create current user (single-user local mode)
// ============================================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { signCookieValue } from "@/lib/auth/cookie-signing";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";

export async function GET() {
  try {
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
    cookieStore.set("mirrorbuddy-user-id", signedCookie.signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    // Client-readable cookie (for client-side userId access)
    cookieStore.set("mirrorbuddy-user-id-client", user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return NextResponse.json(user);
  } catch (error) {
    logger.error("User API error", { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        {
          error: "Database not initialized",
          message: "Run: npx prisma db push",
          hint: "See README.md for setup instructions",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
