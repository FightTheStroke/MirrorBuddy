// ============================================================================
// OIDC UTILITIES
// Shared utilities for OpenID Connect operations
// Used by all OIDC provider implementations
// Created for F-04: School Admin SSO Integration
// ============================================================================

import { createHash, randomBytes } from "crypto";
import { TokenValidationError } from "./oidc-provider";

/**
 * PKCE (Proof Key for Code Exchange) parameters
 * Implements RFC 7636 for OAuth 2.0 public clients
 */
export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * Generate PKCE code verifier and challenge
 * Implements RFC 7636 (Proof Key for Code Exchange)
 *
 * Security: PKCE prevents authorization code interception attacks
 * by binding the authorization code to the client instance
 *
 * @returns code_verifier (random string) and code_challenge (SHA256 hash)
 */
export function generatePKCE(): PKCEParams {
  // Generate random 32-byte code verifier
  // Must be between 43-128 characters (base64url encoded)
  const codeVerifier = randomBytes(32).toString("base64url");

  // Generate SHA256 hash of code verifier for code challenge
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

/**
 * Generate random state parameter for CSRF protection
 * State must be stored in session and validated on callback
 *
 * @returns Random base64url-encoded state string
 */
export function generateState(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Generate random nonce for replay attack prevention
 * Nonce must be validated in ID token claims
 *
 * @returns Random base64url-encoded nonce string
 */
export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Decode JWT payload without signature verification
 *
 * WARNING: This does NOT verify the token signature
 * Use only after signature verification or for non-security-critical data
 *
 * For production use, verify signature using provider's JWKS endpoint
 *
 * @param jwt - JSON Web Token (header.payload.signature)
 * @returns Decoded payload as JSON object
 * @throws TokenValidationError if JWT format is invalid
 */
export function decodeJWT(jwt: string): Record<string, unknown> {
  try {
    // Split JWT into parts (header.payload.signature)
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format - expected 3 parts");
    }

    // Decode base64url-encoded payload (part 1)
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );

    return payload;
  } catch (error) {
    throw new TokenValidationError("Failed to decode JWT", error);
  }
}

/**
 * Validate basic JWT structure without signature verification
 * Checks for required claims and expiration
 *
 * @param jwt - JSON Web Token to validate
 * @param requiredClaims - Array of claim names that must be present
 * @throws TokenValidationError if validation fails
 */
export function validateJWTStructure(
  jwt: string,
  requiredClaims: string[] = ["sub", "iss", "aud", "exp"],
): void {
  const payload = decodeJWT(jwt);

  // Check required claims
  for (const claim of requiredClaims) {
    if (!(claim in payload)) {
      throw new TokenValidationError(`Missing required claim: ${claim}`);
    }
  }

  // Check expiration
  const exp = payload.exp as number;
  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) {
    throw new TokenValidationError("Token has expired");
  }
}
