// ============================================================================
// SESSION AUTHENTICATION HELPER
// Reusable auth checks for API endpoints
// Created for issues #83, #84, #85, #86
// Updated for #013: Cryptographically signed session cookies
// ============================================================================

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isSignedCookie, verifyCookieValue } from "@/lib/auth/cookie-signing";

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
      cookieStore.get("mirrorbuddy-user-id")?.value ||
      cookieStore.get("convergio-user-id")?.value;

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
        const created = await prisma.user.create({
          data: {
            id: userId,
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
