// ============================================================================
// GOOGLE SSO CALLBACK ROUTE
// GET /api/auth/sso/google/callback — Handles Google OAuth callback
// Created for F-04: School Admin SSO Integration
// ============================================================================

import { NextResponse } from "next/server";
import { GoogleWorkspaceProvider } from "@/lib/auth/server";
import { consumeSSOSession } from "@/lib/auth/server";
import { handleSSOCallback } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import { pipe, withSentry } from "@/lib/api/middlewares";

const provider = new GoogleWorkspaceProvider();

export const GET = pipe(withSentry("/api/auth/sso/google/callback"))(async (
  ctx,
) => {
  const searchParams = new URL(ctx.req.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (error) {
    logger.warn("[SSO/Google] OAuth error", { error });
    return NextResponse.redirect(`${appUrl}/login?error=sso_denied`);
  }

  if (!code || !state) {
    logger.warn("[SSO/Google] Missing code or state");
    return NextResponse.redirect(`${appUrl}/login?error=sso_invalid`);
  }

  const session = await consumeSSOSession(state);
  if (!session || session.provider !== "google") {
    logger.warn("[SSO/Google] Invalid or expired state", {
      state: state.slice(0, 8) + "...",
    });
    return NextResponse.redirect(`${appUrl}/login?error=sso_expired`);
  }

  try {
    const callbackResult = await provider.callback(
      { code, state, codeVerifier: session.codeVerifier },
      {
        clientId: process.env.GOOGLE_SSO_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_SSO_CLIENT_SECRET || "",
        redirectUri: session.redirectUri,
        scopes: [],
      },
    );

    const ssoResult = await handleSSOCallback(
      callbackResult.userInfo,
      "google",
    );

    logger.info("[SSO/Google] Login successful", {
      userId: ssoResult.userId,
      isNewUser: ssoResult.isNewUser,
    });

    return NextResponse.redirect(`${appUrl}${ssoResult.redirectUrl}`);
  } catch (err) {
    logger.error("[SSO/Google] Callback processing failed", undefined, err);
    return NextResponse.redirect(`${appUrl}/login?error=sso_callback_failed`);
  }
});
