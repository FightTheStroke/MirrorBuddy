// ============================================================================
// MICROSOFT SSO INITIATION ROUTE
// GET /api/auth/sso/microsoft — Redirects to Azure AD OAuth authorization
// Created for F-05: Microsoft 365 SSO Integration
// ============================================================================

import { NextResponse } from "next/server";
import { Microsoft365Provider } from "@/lib/auth/sso/microsoft365";
import { createSSOSession } from "@/lib/auth/sso/sso-session";
import { logger } from "@/lib/logger";
import { pipe, withSentry } from "@/lib/api/middlewares";

const provider = new Microsoft365Provider();

export const GET = pipe(withSentry("/api/auth/sso/microsoft"))(async () => {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/microsoft/callback`;

    const session = await createSSOSession("microsoft", redirectUri);

    const result = await provider.authorize({
      clientId: process.env.MICROSOFT_SSO_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_SSO_CLIENT_SECRET || "",
      redirectUri,
      scopes: ["openid", "email", "profile", "User.Read", "EduRoster.Read"],
    });

    logger.debug("[SSO/Microsoft] Authorization URL generated", {
      state: session.state.slice(0, 8) + "...",
    });

    return NextResponse.redirect(result.url);
  } catch (error) {
    logger.error("[SSO/Microsoft] Failed to initiate SSO", undefined, error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=sso_init_failed`,
    );
  }
});
