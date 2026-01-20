/**
 * Google OAuth Token API
 * ADR 0038 - Google Drive Integration
 *
 * Returns access token for Google Picker API.
 * Token is refreshed automatically if expired.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session-auth";
import { getValidAccessToken } from "@/lib/google/oauth";

export async function GET(_request: NextRequest) {
  // Security: Get userId from authenticated session only
  const { userId, errorResponse } = await requireAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const accessToken = await getValidAccessToken(userId!);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Google Drive" },
      { status: 401 },
    );
  }

  return NextResponse.json({ accessToken });
}
