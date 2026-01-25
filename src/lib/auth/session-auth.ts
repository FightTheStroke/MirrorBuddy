// ============================================================================
// SESSION AUTHENTICATION HELPER
// Reusable auth checks for API endpoints
// Created for issues #83, #84, #85, #86
// Updated for #013: Cryptographically signed session cookies
// Updated for ADR 0075: Centralized cookie constants
// ============================================================================

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isSignedCookie, verifyCookieValue } from "@/lib/auth/cookie-signing";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth/cookie-constants";

export interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  error?: string;
}

export interface AdminAuthResult extends AuthResult {
  isAdmin: boolean;
}

/**
 * Validate user authentication from cookie
 * Use this at the start of any protected API endpoint
 *
 * Supports both signed cookies (new) and unsigned cookies (legacy).
 * Signed cookies use HMAC-SHA256 for tamper protection.
 */
export async function validateAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    // Check new cookie first, fallback to legacy cookie for existing users
    const cookieValue =
      cookieStore.get(AUTH_COOKIE_NAME)?.value ||
      cookieStore.get(LEGACY_AUTH_COOKIE)?.value;

    if (!cookieValue) {
      return {
        authenticated: false,
        userId: null,
        error: "No authentication cookie",
      };
    }

    // Only accept signed cookies - unsigned cookies are rejected for security
    if (!isSignedCookie(cookieValue)) {
      logger.warn("Unsigned cookie rejected", {
        hint: "Cookie must be cryptographically signed",
      });
      return {
        authenticated: false,
        userId: null,
        error: "Invalid cookie format",
      };
    }

    const verification = verifyCookieValue(cookieValue);

    if (!verification.valid) {
      logger.warn("Cookie signature verification failed", {
        error: verification.error,
      });
      return {
        authenticated: false,
        userId: null,
        error: "Invalid cookie signature",
      };
    }

    const userId = verification.value!;
    logger.debug("Signed cookie verified", { userId });

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      if (
        process.env.E2E_TESTS === "1" ||
        process.env.NODE_ENV !== "production"
      ) {
        // E2E/dev mode: auto-create test users
        // Check if this is an admin session (indicated by admin cookie)
        const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME);
        const isAdminSession = !!adminCookie;

        // Use try-catch to handle race conditions where concurrent requests
        // may try to create the same user simultaneously
        try {
          const created = await prisma.user.create({
            data: {
              id: userId,
              role: isAdminSession ? "ADMIN" : "USER",
              profile: { create: {} },
              settings: { create: {} },
              progress: { create: {} },
            },
            select: { id: true },
          });

          return {
            authenticated: true,
            userId: created.id,
          };
        } catch (createError) {
          // P2002 = unique constraint violation (user was created by another request)
          // Check for both Prisma error code and various message formats
          const isPrismaP2002 =
            createError &&
            typeof createError === "object" &&
            "code" in createError &&
            createError.code === "P2002";
          const isUniqueConstraintMessage =
            createError instanceof Error &&
            (createError.message.includes("Unique constraint") ||
              createError.message.includes("unique constraint") ||
              createError.message.includes("duplicate key"));

          if (isPrismaP2002 || isUniqueConstraintMessage) {
            // User was created by another concurrent request, fetch and return
            const existingUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { id: true },
            });
            if (existingUser) {
              return {
                authenticated: true,
                userId: existingUser.id,
              };
            }
          }
          // Re-throw other errors
          throw createError;
        }
      }

      return {
        authenticated: false,
        userId: null,
        error: "User not found",
      };
    }

    return {
      authenticated: true,
      userId,
    };
  } catch (error) {
    logger.error("Auth validation error", { error: String(error) });
    return {
      authenticated: false,
      userId: null,
      error: "Auth validation failed",
    };
  }
}

/**
 * Validate that a session belongs to the authenticated user
 * Use for SSE endpoints that need session ownership verification
 *
 * Voice sessions (starting with 'voice-') are ephemeral and don't have
 * a database record, so we allow them for authenticated users.
 */
export async function validateSessionOwnership(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Voice sessions are ephemeral - allow for authenticated users
    // Format: voice-{maestroId}-{timestamp}
    if (sessionId.startsWith("voice-")) {
      logger.debug("Voice session validated", { sessionId, userId });
      return true;
    }

    // Sessions are stored as Conversations in our schema
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: { id: true },
    });

    return !!conversation;
  } catch (error) {
    logger.error("Session ownership check failed", { error: String(error) });
    return false;
  }
}

/**
 * Validate admin authentication from cookie
 * Returns authenticated + isAdmin status
 *
 * Use this at the start of admin-only API endpoints
 */
export async function validateAdminAuth(): Promise<AdminAuthResult> {
  const auth = await validateAuth();

  if (!auth.authenticated || !auth.userId) {
    return {
      ...auth,
      isAdmin: false,
    };
  }

  try {
    // Check user role in database
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    return {
      ...auth,
      isAdmin: user?.role === "ADMIN",
    };
  } catch (error) {
    logger.error("Admin role check failed", {
      error: String(error),
      userId: auth.userId,
    });
    return {
      ...auth,
      isAdmin: false,
    };
  }
}

// Rate limiting is in @/lib/rate-limit with Redis support
// Import directly from there for full functionality

/**
 * Require authenticated user or return 401 response
 * Security: NEVER trust userId from query params or request body
 * Always use this helper to get userId from the validated session
 *
 * @returns userId string if authenticated, null if not (caller should return the error response)
 */
export async function requireAuthenticatedUser(): Promise<{
  userId: string | null;
  errorResponse: Response | null;
}> {
  const auth = await validateAuth();

  if (!auth.authenticated || !auth.userId) {
    const { NextResponse } = await import("next/server");
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: auth.error || "Authentication required" },
        { status: 401 },
      ),
    };
  }

  return {
    userId: auth.userId,
    errorResponse: null,
  };
}
