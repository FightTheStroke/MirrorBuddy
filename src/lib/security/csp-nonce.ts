import { randomBytes } from "crypto";
import { headers } from "next/headers";

/**
 * Generate a cryptographically secure nonce for CSP
 * Used to allow specific inline scripts while blocking others
 */
export function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * Header name for passing nonce through request chain
 */
export const CSP_NONCE_HEADER = "x-csp-nonce";

/**
 * Get the CSP nonce from request headers (Server Components only)
 * Returns undefined if called from client or if nonce is not available
 */
export async function getNonce(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get(CSP_NONCE_HEADER) || undefined;
  } catch {
    // Called from client component or outside request context
    return undefined;
  }
}
