/**
 * Visitor ID utilities for trial tracking
 * Extracts visitor ID from cookies in various request formats
 *
 * NOTE: This file must remain client-safe (no next/headers imports)
 * For server-only functions, use visitor-id-server.ts
 */

import { NextRequest } from "next/server";

export const VISITOR_COOKIE_NAME = "mirrorbuddy-visitor-id";

/**
 * Get visitor ID from NextRequest (App Router API routes)
 */
export function getVisitorIdFromCookie(request: NextRequest): string | null {
  const cookie = request.cookies.get(VISITOR_COOKIE_NAME);
  return cookie?.value ?? null;
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
