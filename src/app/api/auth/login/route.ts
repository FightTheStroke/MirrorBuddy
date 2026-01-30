import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyPassword } from "@/lib/auth/password";
import { signCookieValue } from "@/lib/auth/cookie-signing";
import * as Sentry from "@sentry/nextjs";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
} from "@/lib/auth/cookie-constants";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const log = logger.child({ module: "auth/login" });

/**
 * Validate redirect URL - must be relative (start with /) to prevent open redirect
 */
function isValidRedirectUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Only allow relative URLs starting with /
  // Prevent open redirects (e.g., https://evil.com, //evil.com, \/\/evil.com)
  return (
    typeof url === "string" && url.startsWith("/") && !url.startsWith("//")
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (strict: 5 per 15 minutes to prevent brute force)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(
      `auth:login:${clientId}`,
      RATE_LIMITS.AUTH_LOGIN,
    );
    if (!rateLimitResult.success) {
      log.warn("Login rate limited", { clientId });
      return rateLimitResponse(rateLimitResult);
    }

    const { username, email, password, redirect } = await request.json();

    // Accept either email or username (email preferred)
    const identifier = email || username;

    if (
      !identifier ||
      typeof identifier !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      log.warn("Login attempt: invalid input", { identifier });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Try email first, then username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        disabled: true,
        mustChangePassword: true,
        role: true,
      },
    });

    if (!user) {
      log.warn("Login attempt: user not found", { identifier });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (user.disabled) {
      log.warn("Login attempt: user disabled", { userId: user.id });
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403 },
      );
    }

    if (
      !user.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      log.warn("Login attempt: invalid password", { userId: user.id });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const signed = signCookieValue(user.id);
    log.info("User logged in successfully", { userId: user.id });

    const responseData: Record<string, unknown> = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };

    // Include redirect in response if it's valid (relative URL starting with /)
    if (isValidRedirectUrl(redirect)) {
      responseData.redirect = redirect;
    }

    const response = NextResponse.json(responseData, { status: 200 });

    // Server-side auth cookie (httpOnly, signed)
    response.cookies.set(AUTH_COOKIE_NAME, signed.signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Client-readable cookie (for client-side userId access)
    response.cookies.set(AUTH_COOKIE_CLIENT, user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/auth/login" },
    });

    log.error("Login error", { error: String(error) });
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
