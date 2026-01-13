/**
 * MirrorBuddy Cookie Signing Utility
 * HMAC-SHA256 based cookie signing for secure session management
 *
 * Protects against session fixation by cryptographically signing cookie values.
 * Unsigned or tampered cookies will fail verification.
 *
 * Related: #013 Cryptographically Signed Session Cookies
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Error thrown when cookie signing/verification operations fail
 */
export class CookieSigningError extends Error {
  constructor(
    message: string,
    public readonly code: 'MISSING_SECRET' | 'INVALID_SECRET' | 'INVALID_FORMAT' | 'VERIFICATION_FAILED',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CookieSigningError';
  }
}

/**
 * Result of cookie signing operation
 */
export interface SignedCookie {
  /** Original value */
  value: string;
  /** HMAC-SHA256 signature (hex encoded) */
  signature: string;
  /** Combined format: value.signature */
  signed: string;
}

/**
 * Result of cookie verification operation
 */
export interface VerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Original value (only if valid) */
  value?: string;
  /** Error message (only if invalid) */
  error?: string;
}

/**
 * Get SESSION_SECRET from environment with validation
 * @throws {CookieSigningError} If SESSION_SECRET is not configured
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new CookieSigningError(
      'SESSION_SECRET environment variable is not set. Generate one with: openssl rand -hex 32',
      'MISSING_SECRET'
    );
  }

  if (secret.length < 32) {
    throw new CookieSigningError(
      'SESSION_SECRET must be at least 32 characters for security. Generate one with: openssl rand -hex 32',
      'INVALID_SECRET'
    );
  }

  return secret;
}

/**
 * Generate HMAC-SHA256 signature for a value
 * @param value - The value to sign
 * @param secret - The secret key to use for signing
 * @returns Hex-encoded signature
 */
function generateSignature(value: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(value);
  return hmac.digest('hex');
}

/**
 * Sign a cookie value with HMAC-SHA256
 *
 * @param value - The cookie value to sign (typically a user ID)
 * @returns Signed cookie with value and signature
 * @throws {CookieSigningError} If SESSION_SECRET is not configured
 *
 * @example
 * ```ts
 * const signed = signCookieValue('user-123');
 * // signed.signed = "user-123.a1b2c3d4..."
 * // Store signed.signed in the cookie
 * ```
 */
export function signCookieValue(value: string): SignedCookie {
  const secret = getSessionSecret();
  const signature = generateSignature(value, secret);

  return {
    value,
    signature,
    signed: `${value}.${signature}`,
  };
}

/**
 * Verify a signed cookie value
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param signedValue - The signed cookie value (format: "value.signature")
 * @returns Verification result with valid flag and extracted value
 *
 * @example
 * ```ts
 * const result = verifyCookieValue(cookieValue);
 * if (result.valid) {
 *   console.log('User ID:', result.value);
 * } else {
 *   console.error('Invalid cookie:', result.error);
 * }
 * ```
 */
export function verifyCookieValue(signedValue: string): VerificationResult {
  try {
    // Parse signed value
    const lastDotIndex = signedValue.lastIndexOf('.');

    if (lastDotIndex === -1) {
      return {
        valid: false,
        error: 'Invalid cookie format: missing signature',
      };
    }

    const value = signedValue.substring(0, lastDotIndex);
    const providedSignature = signedValue.substring(lastDotIndex + 1);

    if (!value || !providedSignature) {
      return {
        valid: false,
        error: 'Invalid cookie format: empty value or signature',
      };
    }

    // Verify signature
    const secret = getSessionSecret();
    const expectedSignature = generateSignature(value, secret);

    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return {
        valid: false,
        error: 'Invalid signature length',
      };
    }

    const isValid = timingSafeEqual(providedBuffer, expectedBuffer);

    if (!isValid) {
      return {
        valid: false,
        error: 'Signature verification failed: cookie may have been tampered with',
      };
    }

    return {
      valid: true,
      value,
    };
  } catch (error) {
    if (error instanceof CookieSigningError) {
      return {
        valid: false,
        error: error.message,
      };
    }

    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if a cookie value appears to be signed
 * (contains a dot separator and signature-like suffix)
 *
 * This is a quick check and does NOT verify the signature.
 * Use verifyCookieValue() for actual verification.
 *
 * @param value - The cookie value to check
 * @returns True if the value appears to be signed
 *
 * @example
 * ```ts
 * if (isSignedCookie(cookieValue)) {
 *   // Verify signature
 *   const result = verifyCookieValue(cookieValue);
 * } else {
 *   // Legacy unsigned cookie - handle backward compatibility
 * }
 * ```
 */
export function isSignedCookie(value: string): boolean {
  const lastDotIndex = value.lastIndexOf('.');
  if (lastDotIndex === -1) return false;

  const signature = value.substring(lastDotIndex + 1);
  // HMAC-SHA256 hex signature is 64 characters
  return signature.length === 64 && /^[0-9a-f]+$/i.test(signature);
}
