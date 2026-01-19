/**
 * API ROUTE: Current User Info
 * GET: Returns current user's basic info including role
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const auth = await validateAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isAdmin: user.role === "ADMIN",
      },
    });
  } catch (error) {
    logger.error("Auth me endpoint error", { error: String(error) });
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
