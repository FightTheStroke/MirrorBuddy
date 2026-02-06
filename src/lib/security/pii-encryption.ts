/**
 * PII Encryption Service
 *
 * AES-256-GCM encryption for Personally Identifiable Information (PII).
 * Provides authenticated encryption and deterministic hashing for indexed lookups.
 *
 * @module security/pii-encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
} from "crypto";
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

// Cached PII encryption key (fetched from Azure Key Vault or environment)
let PII_KEY: string | undefined;
let keyPromise: Promise<string> | null = null;

/**
 * Get PII encryption key from Azure Key Vault (with env var fallback)
 * Tries PII_ENCRYPTION_KEY first, then falls back to ENCRYPTION_KEY
 * Uses caching to avoid repeated fetches
 */
async function getPIIKey(): Promise<string> {
  if (PII_KEY) {
    return PII_KEY;
  }

  if (!keyPromise) {
    keyPromise = getSecret("PII_ENCRYPTION_KEY")
      .catch(() => getSecret("ENCRYPTION_KEY"))
      .catch(() => {
        // Final fallback to empty string (will be caught by isConfigured check)
        return "";
      })
      .then((key) => {
        PII_KEY = key;
        return key;
      });
  }

  return keyPromise;
}

/**
 * Check if PII encryption is properly configured
 * Now async to support Azure Key Vault
 */
export async function isPIIEncryptionConfigured(): Promise<boolean> {
  try {
    const key = await getPIIKey();
    return Boolean(key && key.length >= 32);
  } catch {
    return false;
  }
}

/**
 * Derive a key from the master key and salt using scrypt
 */
async function deriveKey(salt: Buffer): Promise<Buffer> {
  const key = await getPIIKey();
  if (!key) {
    throw new Error("PII_ENCRYPTION_KEY or ENCRYPTION_KEY not configured");
  }
  return (await scryptAsync(key, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt a PII string value
 * Output format: pii:v1:base64(salt:iv:authTag:ciphertext)
 *
 * @param plaintext - The PII string to encrypt
 * @returns Encrypted string in base64 format with version prefix
 */
export async function encryptPII(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;

  // In production, encryption is mandatory
  if (!isPIIEncryptionConfigured()) {
    if (process.env.NODE_ENV === "production") {
      logger.error(
        "[PII-Encryption] PII_ENCRYPTION_KEY not set in production!",
      );
      throw new Error("PII encryption key not configured");
    }
    logger.warn("[PII-Encryption] Using unencrypted storage (dev mode)");
    return plaintext;
  }

  try {
    // Generate random salt and IV for each encryption
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

    // Use 'pii:v1:' prefix to distinguish from token encryption
    return `pii:v1:${combined.toString("base64")}`;
  } catch (error) {
    logger.error("[PII-Encryption] Failed to encrypt PII", {
      error: String(error),
    });
    throw new Error("PII encryption failed");
  }
}

/**
 * Decrypt a PII value
 *
 * @param encrypted - The encrypted string (or plaintext if unencrypted in dev)
 * @returns Decrypted plaintext
 */
export async function decryptPII(encrypted: string): Promise<string> {
  if (!encrypted) return encrypted;

  // Check if this is an encrypted value
  if (!encrypted.startsWith("pii:v1:")) {
    // Return as-is (legacy unencrypted or dev mode)
    return encrypted;
  }

  if (!isPIIEncryptionConfigured()) {
    if (process.env.NODE_ENV === "production") {
      logger.error("[PII-Encryption] Cannot decrypt: key not configured");
      throw new Error("PII encryption key not configured");
    }
    // In dev, if we see encrypted data but have no key, that's an error
    throw new Error("Encrypted PII found but no encryption key available");
  }

  try {
    // Remove version prefix
    const data = encrypted.slice(7); // Remove 'pii:v1:'
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
    logger.error("[PII-Encryption] Failed to decrypt PII", {
      error: String(error),
    });
    throw new Error("PII decryption failed - data may be corrupted");
  }
}

/**
 * Create a deterministic SHA-256 hash of PII for indexed lookups
 *
 * Use this for creating searchable indexed columns (e.g., email_hash)
 * while keeping the actual PII encrypted.
 *
 * @param plaintext - The PII string to hash
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export async function hashPII(plaintext: string): Promise<string> {
  // SHA-256 is deterministic - same input always produces same hash
  const hash = createHash("sha256");
  hash.update(plaintext, "utf8");
  return hash.digest("hex");
}
