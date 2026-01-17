/**
 * @file user-id.ts
 * @brief User ID utility
 */

import { getUserIdFromCookie } from "@/lib/auth/client-auth";

export function getUserId(): string {
  if (typeof window === "undefined") return "default-user";
  const userId = getUserIdFromCookie();
  return userId ?? "default-user";
}
