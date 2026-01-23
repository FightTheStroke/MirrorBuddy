/**
 * Server-only visitor ID utilities
 * Uses next/headers which only works in Server Components
 */

import { cookies } from "next/headers";
import { VISITOR_COOKIE_NAME } from "./visitor-id";

/**
 * Get visitor ID from server component context
 * Uses Next.js cookies() function
 *
 * @example
 * // In a Server Component or Server Action:
 * const visitorId = await getVisitorIdFromContext();
 */
export async function getVisitorIdFromContext(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(VISITOR_COOKIE_NAME);
    return cookie?.value ?? null;
  } catch {
    return null;
  }
}
