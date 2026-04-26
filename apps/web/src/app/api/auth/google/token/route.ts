/**
 * Google OAuth Token API
 * ADR 0038 - Google Drive Integration
 *
 * Returns access token for Google Picker API.
 * Token is refreshed automatically if expired.
 */

import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google/oauth";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/auth/google/token"),
  withAuth,
)(async (ctx) => {
  const accessToken = await getValidAccessToken(ctx.userId!);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Google Drive" },
      { status: 401 },
    );
  }

  return NextResponse.json({ accessToken });
});
