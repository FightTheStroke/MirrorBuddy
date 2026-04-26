/**
 * Server-only visitor ID utilities
 * Uses next/headers which only works in Server Components
 *
 * IMPORTANT: All visitor IDs are validated as UUID v4
 */

import { cookies } from "next/headers";
import {
  VISITOR_COOKIE_NAME,
  validateVisitorId,
} from "@/lib/auth";

/**
 * Get visitor ID from server component context
 * Uses Next.js cookies() function
 * VALIDATES the visitor ID is a proper UUID v4
 *
 * @example
 * // In a Server Component or Server Action:
 * const visitorId = await getVisitorIdFromContext();
 *
 * @returns Validated visitor ID or null if invalid/missing
 */
export async function getVisitorIdFromContext(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(VISITOR_COOKIE_NAME);
    return validateVisitorId(cookie?.value);
  } catch {
    return null;
  }
}
