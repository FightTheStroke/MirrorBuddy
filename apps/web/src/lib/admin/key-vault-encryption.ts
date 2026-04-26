/**
 * Key Vault Encryption
 * AES-256-GCM encryption/decryption for API keys
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Get encryption key from environment
 * Must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  if (key.length < 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be at least 32 characters for AES-256-GCM",
    );
  }
  return Buffer.from(key.slice(0, 32));
}

/**
 * Encrypt a secret value
 * Returns encrypted value, IV, and auth tag as hex strings
 */
export function encryptSecret(value: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt a secret value
 */
export function decryptSecret(
  encrypted: string,
  iv: string,
  authTag: string,
): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask a value for display (show last 4 chars only)
 */
export function maskValue(value: string): string {
  if (value.length <= 4) {
    return "****";
  }
  const lastFour = value.slice(-4);
  const masked = "*".repeat(Math.min(value.length - 4, 12));
  return masked + lastFour;
}
