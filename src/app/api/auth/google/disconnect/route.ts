/**
 * Disconnect Google Account
 * POST /api/auth/google/disconnect
 *
 * Revokes tokens and disconnects Google account.
 */

import { NextResponse } from "next/server";
import { disconnectGoogleAccount } from "@/lib/google";
import { pipe, withSentry } from "@/lib/api/middlewares";

export const POST = pipe(withSentry("/api/auth/google/disconnect"))(async (
  ctx,
) => {
  const body = await ctx.req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const success = await disconnectGoogleAccount(userId);

  if (!success) {
    return NextResponse.json(
      { error: "Account not found or already disconnected" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
});
