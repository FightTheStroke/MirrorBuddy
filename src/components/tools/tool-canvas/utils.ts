/**
 * Utility functions for tool canvas
 */

import { getUserIdFromCookie } from "@/lib/auth";

/**
 * Get user ID from cookie (secure, server-set authentication)
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "default-user";
  const userId = getUserIdFromCookie();
  return userId ?? "default-user";
}
