/**
 * Visitor ID utilities for trial tracking
 * Extracts visitor ID from cookies in various request formats
 *
 * NOTE: This file must remain client-safe (no next/headers imports)
 * For server-only functions, use visitor-id-server.ts
 *
 * IMPORTANT: All visitor IDs MUST be validated as UUID v4
 * Use validateVisitorId() or isValidVisitorId() from cookie-constants.ts
 */

import { NextRequest } from "next/server";
import {
  VISITOR_COOKIE_NAME,
  validateVisitorId,
} from "@/lib/auth/cookie-constants";

// Re-export for backward compatibility
export { VISITOR_COOKIE_NAME } from "@/lib/auth/cookie-constants";

/**
 * Get visitor ID from NextRequest (App Router API routes)
 * VALIDATES the visitor ID is a proper UUID v4
 *
 * @returns Validated visitor ID or null if invalid/missing
 */
export function getVisitorIdFromCookie(request: NextRequest): string | null {
  const cookie = request.cookies.get(VISITOR_COOKIE_NAME);
  return validateVisitorId(cookie?.value);
}

/**
 * Get visitor ID from document.cookie (client-side)
 */
export function getVisitorIdFromClient(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === VISITOR_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}
