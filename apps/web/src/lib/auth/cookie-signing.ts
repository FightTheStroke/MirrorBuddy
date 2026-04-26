/**
 * MirrorBuddy Cookie Signing Utility
 * HMAC-SHA256 based cookie signing for secure session management
 *
 * Protects against session fixation by cryptographically signing cookie values.
 * Unsigned or tampered cookies will fail verification.
 *
 * Related: #013 Cryptographically Signed Session Cookies
 */

import {
  createHmac,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";
import { getSecret } from "@/lib/security";

/**
 * Error thrown when cookie signing/verification operations fail
 */
export class CookieSigningError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MISSING_SECRET"
      | "INVALID_SECRET"
      | "INVALID_FORMAT"
      | "VERIFICATION_FAILED",
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "CookieSigningError";
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

// Cached session secret (fetched from Azure Key Vault or environment)
let SESSION_SECRET: string | undefined;
let secretPromise: Promise<string> | null = null;

/**
 * Reset the cached session secret (test-only utility)
 * Forces the next call to re-read from process.env or Azure Key Vault
 */
export function _resetSecretCache(): void {
  SESSION_SECRET = undefined;
  secretPromise = null;
}

/**
 * Get SESSION_SECRET from Azure Key Vault (with env var fallback)
 * Uses caching to avoid repeated fetches
 * @throws {CookieSigningError} If SESSION_SECRET is not configured
 */
async function getSessionSecret(): Promise<string> {
  if (SESSION_SECRET) {
    return validateSecret(SESSION_SECRET);
  }

  if (!secretPromise) {
    secretPromise = getSecret("SESSION_SECRET").then((secret) => {
      SESSION_SECRET = secret;
      return secret;
    });
  }

  const secret = await secretPromise;
  return validateSecret(secret);
}

/**
 * Get SESSION_SECRET synchronously from cache or environment
 * Falls back to process.env for backward compatibility when cache is empty
 * @throws {CookieSigningError} If SESSION_SECRET is not configured
 */
function getSessionSecretSync(): string {
  if (SESSION_SECRET) {
    return validateSecret(SESSION_SECRET);
  }

  // Fallback to environment variable for backward compatibility
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    SESSION_SECRET = secret; // Cache it for future use
    return validateSecret(secret);
  }

  throw new CookieSigningError(
    "SESSION_SECRET not available. Call async functions first or ensure SESSION_SECRET environment variable is set.",
    "MISSING_SECRET",
  );
}

/**
 * Validate session secret format
 * @throws {CookieSigningError} If secret is invalid
 */
function validateSecret(secret: string): string {
  if (!secret) {
    throw new CookieSigningError(
      "SESSION_SECRET environment variable is not set. Generate one with: openssl rand -hex 32",
      "MISSING_SECRET",
    );
  }

  if (secret.length < 32) {
    throw new CookieSigningError(
      "SESSION_SECRET must be at least 32 characters for security. Generate one with: openssl rand -hex 32",
      "INVALID_SECRET",
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
  const hmac = createHmac("sha256", secret);
  hmac.update(value);
  return hmac.digest("hex");
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
  const secret = getSessionSecretSync();
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
    const lastDotIndex = signedValue.lastIndexOf(".");

    if (lastDotIndex === -1) {
      return {
        valid: false,
        error: "Invalid cookie format: missing signature",
      };
    }

    const value = signedValue.substring(0, lastDotIndex);
    const providedSignature = signedValue.substring(lastDotIndex + 1);

    if (!value || !providedSignature) {
      return {
        valid: false,
        error: "Invalid cookie format: empty value or signature",
      };
    }

    // Verify signature
    const secret = getSessionSecretSync();
    const expectedSignature = generateSignature(value, secret);

    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (providedBuffer.length !== expectedBuffer.length) {
      return {
        valid: false,
        error: "Invalid signature length",
      };
    }

    const isValid = timingSafeEqual(providedBuffer, expectedBuffer);

    if (!isValid) {
      return {
        valid: false,
        error:
          "Signature verification failed: cookie may have been tampered with",
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
  const lastDotIndex = value.lastIndexOf(".");
  if (lastDotIndex === -1) return false;

  const signature = value.substring(lastDotIndex + 1);
  // HMAC-SHA256 hex signature is 64 characters
  return signature.length === 64 && /^[0-9a-f]+$/i.test(signature);
}

/**
 * Derive a 256-bit encryption key from SESSION_SECRET using SHA-256
 * @param secret - The SESSION_SECRET to derive from
 * @returns 32-byte encryption key
 */
function deriveEncryptionKey(secret: string): Buffer {
  // Use SHA-256 to derive a consistent 256-bit key from SESSION_SECRET
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a cookie value using AES-256-GCM
 *
 * Provides both confidentiality and authenticity through authenticated encryption.
 * Each encryption uses a random IV, so the same plaintext produces different ciphertexts.
 *
 * @param value - The plaintext value to encrypt
 * @returns Base64-encoded encrypted value (format: iv + ciphertext + authTag)
 * @throws {CookieSigningError} If SESSION_SECRET is not configured or encryption fails
 *
 * @example
 * ```ts
 * const encrypted = encryptCookieValue('user-123');
 * // Store encrypted in cookie (it's already base64-encoded)
 * ```
 */
export async function encryptCookieValue(value: string): Promise<string> {
  try {
    const secret = await getSessionSecret();
    const key = deriveEncryptionKey(secret);

    // Generate random 12-byte IV (recommended for GCM)
    const iv = randomBytes(12);

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    // Encrypt the value
    let encrypted = cipher.update(value, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();

    // Combine: iv (12 bytes) + ciphertext (variable) + authTag (16 bytes)
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // Return base64-encoded result
    return combined.toString("base64");
  } catch (error) {
    if (error instanceof CookieSigningError) {
      throw error;
    }

    throw new CookieSigningError(
      `Cookie encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      "INVALID_FORMAT",
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Decrypt a cookie value encrypted with encryptCookieValue
 *
 * Verifies authenticity through the GCM authentication tag.
 * Tampering or corruption will cause decryption to fail.
 *
 * @param encryptedValue - Base64-encoded encrypted value from encryptCookieValue
 * @returns Decrypted plaintext value
 * @throws {CookieSigningError} If decryption fails (invalid format, wrong key, or tampered data)
 *
 * @example
 * ```ts
 * const decrypted = decryptCookieValue(encryptedCookie);
 * console.log('User ID:', decrypted);
 * ```
 */
export async function decryptCookieValue(
  encryptedValue: string,
): Promise<string> {
  try {
    const secret = await getSessionSecret();
    const key = deriveEncryptionKey(secret);

    // Decode base64
    const combined = Buffer.from(encryptedValue, "base64");

    // Minimum length: 12 (IV) + 0 (ciphertext) + 16 (authTag) = 28 bytes
    if (combined.length < 28) {
      throw new CookieSigningError(
        "Invalid encrypted cookie: data too short",
        "INVALID_FORMAT",
      );
    }

    // Extract components
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(combined.length - 16);
    const ciphertext = combined.subarray(12, combined.length - 16);

    // Create decipher
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    if (error instanceof CookieSigningError) {
      throw error;
    }

    // GCM authentication failure or other decryption errors
    throw new CookieSigningError(
      `Cookie decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      "VERIFICATION_FAILED",
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Read and verify a cookie value with backward compatibility
 *
 * MIGRATION PATH: This function supports a graceful transition from signed-only
 * cookies to encrypted cookies:
 * 1. First attempts to decrypt (assumes new encrypted format)
 * 2. If decryption fails, falls back to legacy signed-only verification
 * 3. This allows existing signed cookies to continue working during rollout
 *
 * Once all cookies have been migrated to encrypted format, the legacy fallback
 * can be removed in a future version.
 *
 * @param cookieValue - The cookie value (either encrypted or legacy signed format)
 * @returns The verified plaintext value
 * @throws {CookieSigningError} If both decryption and signature verification fail
 *
 * @example
 * ```ts
 * try {
 *   const userId = readCookieValue(cookieValue);
 *   console.log('User ID:', userId);
 * } catch (error) {
 *   console.error('Invalid or tampered cookie');
 * }
 * ```
 */
export async function readCookieValue(cookieValue: string): Promise<string> {
  // Try encrypted format first (new cookies)
  try {
    return await decryptCookieValue(cookieValue);
  } catch (decryptError) {
    // Decryption failed - try legacy signed-only format for backward compatibility
    if (isSignedCookie(cookieValue)) {
      const verificationResult = verifyCookieValue(cookieValue);

      if (verificationResult.valid && verificationResult.value) {
        // Successfully verified legacy signed cookie
        return verificationResult.value;
      }

      // Legacy signature verification failed
      throw new CookieSigningError(
        `Legacy cookie verification failed: ${verificationResult.error || "unknown error"}`,
        "VERIFICATION_FAILED",
      );
    }

    // Not encrypted and not a valid signed cookie - throw original decryption error
    if (decryptError instanceof CookieSigningError) {
      throw decryptError;
    }

    throw new CookieSigningError(
      `Cookie read failed: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`,
      "VERIFICATION_FAILED",
      decryptError instanceof Error ? decryptError : undefined,
    );
  }
}
