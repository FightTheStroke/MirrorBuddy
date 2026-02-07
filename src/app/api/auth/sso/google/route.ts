// ============================================================================
// GOOGLE SSO INITIATION ROUTE
// GET /api/auth/sso/google — Redirects to Google OAuth authorization
// Created for F-04: School Admin SSO Integration
// ============================================================================

import { NextResponse } from "next/server";
import { GoogleWorkspaceProvider } from "@/lib/auth";
import { createSSOSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { pipe, withSentry } from "@/lib/api/middlewares";

const provider = new GoogleWorkspaceProvider();

export const GET = pipe(withSentry("/api/auth/sso/google"))(async () => {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/google/callback`;

    const session = await createSSOSession("google", redirectUri);

    const result = await provider.authorize({
      clientId: process.env.GOOGLE_SSO_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_SSO_CLIENT_SECRET || "",
      redirectUri,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
      ],
    });

    logger.debug("[SSO/Google] Authorization URL generated", {
      state: session.state.slice(0, 8) + "...",
    });

    return NextResponse.redirect(result.url);
  } catch (error) {
    logger.error("[SSO/Google] Failed to initiate SSO", undefined, error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=sso_init_failed`,
    );
  }
});
