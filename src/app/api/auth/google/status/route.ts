/**
 * Google Connection Status
 * GET /api/auth/google/status?userId=xxx
 *
 * Returns the current Google account connection status for a user.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { GoogleConnectionStatus } from "@/lib/google";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/auth/google/status"),
  withAuth,
)(async (ctx) => {
  const account = await prisma.googleAccount.findUnique({
    where: { userId: ctx.userId },
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
});
