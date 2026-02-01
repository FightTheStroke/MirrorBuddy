/**
 * API ROUTE: Current User Info
 * GET: Returns current user's basic info including role
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/auth/me"),
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
});
