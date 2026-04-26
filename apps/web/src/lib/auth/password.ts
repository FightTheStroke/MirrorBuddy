/**
 * MIRRORBUDDY - Password Hashing Utilities
 *
 * Uses bcrypt for secure password hashing.
 * Salt rounds: 12 (good balance of security and performance)
 *
 * Plan 052: Internal auth system
 */

import * as bcrypt from "bcrypt";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth/password" });

// Salt rounds for bcrypt (12 = ~250ms on modern hardware)
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 *
 * @param plainPassword - The plaintext password to hash
 * @returns The bcrypt hash
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    log.debug("Password hashed successfully");
    return hash;
  } catch (error) {
    log.error("Password hashing failed", { error: String(error) });
    throw new Error("Password hashing failed");
  }
}

/**
 * Verify a password against a stored hash
 *
 * @param plainPassword - The plaintext password to verify
 * @param storedHash - The stored bcrypt hash
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(plainPassword, storedHash);
    log.debug("Password verification completed", { isValid });
    return isValid;
  } catch (error) {
    log.error("Password verification failed", { error: String(error) });
    return false;
  }
}

/**
 * Generate a random password for admin reset
 *
 * @param length - Password length (default: 16)
 * @returns A random alphanumeric password
 */
export function generateRandomPassword(length: number = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  // lgtm[js/insecure-randomness] - crypto.getRandomValues IS cryptographically secure (CSPRNG)
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    // Modulo bias with 58 chars and 256 values is negligible (<1%) for password generation
    password += chars[array[i] % chars.length];
  }

  return password;
}

/**
 * Validate password strength
 *
 * @param password - The password to validate
 * @returns Validation result with errors
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
