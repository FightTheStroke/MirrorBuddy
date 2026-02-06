/**
 * Key Rotation Helper Functions
 *
 * Internal encryption/decryption utilities for key rotation operations.
 *
 * @module security/key-rotation-helpers
 * @internal
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

async function deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(masterKey, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Decrypt token format (enc:v1:)
 */
export async function decryptTokenWithKey(
  encrypted: string,
  masterKey: string,
): Promise<string> {
  if (!encrypted || !encrypted.startsWith("enc:v1:")) {
    return encrypted;
  }

  const data = encrypted.slice(7);
  const combined = Buffer.from(data, "base64");

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );

  const key = await deriveKey(masterKey, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encrypt token format (enc:v1:)
 */
export async function encryptTokenWithKey(
  plaintext: string,
  masterKey: string,
): Promise<string> {
  if (!plaintext) return plaintext;

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(masterKey, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return `enc:v1:${combined.toString("base64")}`;
}

/**
 * Decrypt PII format (pii:v1:)
 */
export async function decryptPIIWithKey(
  encrypted: string,
  masterKey: string,
): Promise<string> {
  if (!encrypted || !encrypted.startsWith("pii:v1:")) {
    return encrypted;
  }

  const data = encrypted.slice(7);
  const combined = Buffer.from(data, "base64");

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );

  const key = await deriveKey(masterKey, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encrypt PII format (pii:v1:)
 */
export async function encryptPIIWithKey(
  plaintext: string,
  masterKey: string,
): Promise<string> {
  if (!plaintext) return plaintext;

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(masterKey, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return `pii:v1:${combined.toString("base64")}`;
}
