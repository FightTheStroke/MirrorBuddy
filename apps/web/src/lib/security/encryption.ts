/**
 * Token Encryption at Rest
 *
 * AES-256-GCM encryption for sensitive data like OAuth tokens.
 * Provides authenticated encryption to prevent tampering.
 *
 * @module security/encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { logger } from "@/lib/logger";
import { getSecret } from "@/lib/security/azure-key-vault";

const scryptAsync = promisify(scrypt);

// AES-256-GCM configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// Cached encryption key (fetched from Azure Key Vault or environment)
let ENCRYPTION_KEY: string | undefined;
let keyPromise: Promise<string> | null = null;

/**
 * Get encryption key from Azure Key Vault (with env var fallback)
 * Uses caching to avoid repeated fetches
 */
async function getEncryptionKey(): Promise<string> {
  if (ENCRYPTION_KEY) {
    return ENCRYPTION_KEY;
  }

  if (!keyPromise) {
    keyPromise = getSecret("TOKEN_ENCRYPTION_KEY").then((key) => {
      ENCRYPTION_KEY = key;
      return key;
    });
  }

  return keyPromise;
}

/**
 * Check if encryption is properly configured
 * Now async to support Azure Key Vault
 */
export async function isEncryptionConfigured(): Promise<boolean> {
  try {
    const key = await getEncryptionKey();
    return Boolean(key && key.length >= 32);
  } catch {
    return false;
  }
}

/**
 * Derive a key from the master key and salt using scrypt
 */
async function deriveKey(salt: Buffer): Promise<Buffer> {
  const key = await getEncryptionKey();
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  }
  return (await scryptAsync(key, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt a string value
 * Output format: base64(salt:iv:authTag:ciphertext)
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in base64 format, or original if encryption disabled
 */
export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;

  // In development without key, return plaintext with marker
  if (!isEncryptionConfigured()) {
    if (process.env.NODE_ENV === "production") {
      logger.error("[Encryption] TOKEN_ENCRYPTION_KEY not set in production!");
      throw new Error("Encryption key not configured");
    }
    logger.warn("[Encryption] Using unencrypted storage (dev mode)");
    return plaintext;
  }

  try {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = await deriveKey(salt);

    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + ciphertext
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    // Prefix with version marker for future-proofing
    return `enc:v1:${combined.toString("base64")}`;
  } catch (error) {
    logger.error("[Encryption] Failed to encrypt token", {
      error: String(error),
    });
    throw new Error("Token encryption failed");
  }
}

/**
 * Decrypt a token value
 *
 * @param encrypted - The encrypted string (or plaintext if unencrypted)
 * @returns Decrypted plaintext
 */
export async function decryptToken(encrypted: string): Promise<string> {
  if (!encrypted) return encrypted;

  // Check if this is an encrypted value
  if (!encrypted.startsWith("enc:v1:")) {
    // Return as-is (legacy unencrypted or dev mode)
    return encrypted;
  }

  if (!isEncryptionConfigured()) {
    if (process.env.NODE_ENV === "production") {
      logger.error("[Encryption] Cannot decrypt: key not configured");
      throw new Error("Encryption key not configured");
    }
    // In dev, if we see encrypted data but have no key, that's an error
    throw new Error("Encrypted token found but no encryption key available");
  }

  try {
    // Remove version prefix
    const data = encrypted.slice(7); // Remove 'enc:v1:'
    const combined = Buffer.from(data, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const ciphertext = combined.subarray(
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );

    const key = await deriveKey(salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    logger.error("[Encryption] Failed to decrypt token", {
      error: String(error),
    });
    throw new Error("Token decryption failed - data may be corrupted");
  }
}

/**
 * Re-encrypt all tokens with a new key (for key rotation)
 * This is a utility function - actual rotation requires DB migration
 */
export async function rotateEncryptionKey(
  oldKey: string,
  newKey: string,
  encryptedValue: string,
): Promise<string> {
  // Save current cached key
  const originalKey = ENCRYPTION_KEY;
  const originalPromise = keyPromise;

  try {
    // Temporarily use old key for decryption
    ENCRYPTION_KEY = oldKey;
    keyPromise = null;
    const plaintext = await decryptToken(encryptedValue);

    // Use new key for encryption
    ENCRYPTION_KEY = newKey;
    keyPromise = null;
    return await encryptToken(plaintext);
  } finally {
    // Restore original state
    ENCRYPTION_KEY = originalKey;
    keyPromise = originalPromise;
  }
}
