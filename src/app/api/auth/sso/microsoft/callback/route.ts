// ============================================================================
// MICROSOFT SSO CALLBACK ROUTE
// GET /api/auth/sso/microsoft/callback — Handles Azure AD OAuth callback
// Created for F-05: Microsoft 365 SSO Integration
// ============================================================================

import { NextResponse } from "next/server";
import { Microsoft365Provider } from "@/lib/auth/sso/microsoft365";
import { consumeSSOSession } from "@/lib/auth/sso/sso-session";
import { handleSSOCallback } from "@/lib/auth/sso/sso-callback-handler";
import { logger } from "@/lib/logger";
import { pipe, withSentry } from "@/lib/api/middlewares";

const provider = new Microsoft365Provider();

export const GET = pipe(withSentry("/api/auth/sso/microsoft/callback"))(async (
  ctx,
) => {
  const searchParams = new URL(ctx.req.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (error) {
    const errorDesc = searchParams.get("error_description") || "";
    logger.warn("[SSO/Microsoft] OAuth error", { error, errorDesc });
    return NextResponse.redirect(`${appUrl}/login?error=sso_denied`);
  }

  if (!code || !state) {
    logger.warn("[SSO/Microsoft] Missing code or state");
    return NextResponse.redirect(`${appUrl}/login?error=sso_invalid`);
  }

  const session = await consumeSSOSession(state);
  if (!session || session.provider !== "microsoft") {
    logger.warn("[SSO/Microsoft] Invalid or expired state", {
      state: state.slice(0, 8) + "...",
    });
    return NextResponse.redirect(`${appUrl}/login?error=sso_expired`);
  }

  try {
    const callbackResult = await provider.callback(
      { code, state, codeVerifier: session.codeVerifier },
      {
        clientId: process.env.MICROSOFT_SSO_CLIENT_ID || "",
        clientSecret: process.env.MICROSOFT_SSO_CLIENT_SECRET || "",
        redirectUri: session.redirectUri,
        scopes: [],
      },
    );

    const ssoResult = await handleSSOCallback(
      callbackResult.userInfo,
      "microsoft",
    );

    logger.info("[SSO/Microsoft] Login successful", {
      userId: ssoResult.userId,
      isNewUser: ssoResult.isNewUser,
    });

    return NextResponse.redirect(`${appUrl}${ssoResult.redirectUrl}`);
  } catch (err) {
    logger.error("[SSO/Microsoft] Callback processing failed", undefined, err);
    return NextResponse.redirect(`${appUrl}/login?error=sso_callback_failed`);
  }
});
