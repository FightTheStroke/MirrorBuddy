import { headers } from "next/headers";

/**
 * Header name for passing nonce through request chain
 * Next.js looks for 'x-nonce' to automatically apply to inline scripts
 */
export const CSP_NONCE_HEADER = "x-nonce";

/**
 * Generate a cryptographically secure nonce for CSP
 * Uses the format recommended by Next.js docs
 */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Get the CSP nonce from request headers (Server Components only)
 * Next.js middleware sets this header and Next.js automatically
 * applies it to inline scripts during dynamic rendering.
 *
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
