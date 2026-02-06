/**
 * Cookie Encryption Tests
 * Tests for AES-256-GCM encryption/decryption of cookie values
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptCookieValue,
  decryptCookieValue,
  readCookieValue,
  signCookieValue,
} from "../cookie-signing";

describe("Cookie Encryption", () => {
  const originalEnv = process.env.SESSION_SECRET;

  beforeEach(() => {
    // Set a valid SESSION_SECRET for tests
    process.env.SESSION_SECRET = "0".repeat(64); // 64-char hex string
  });

  afterEach(() => {
    // Restore original environment
    process.env.SESSION_SECRET = originalEnv;
  });

  describe("encryptCookieValue", () => {
    it("should encrypt a simple string value", async () => {
      const plaintext = "user-123";
      const encrypted = await encryptCookieValue(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should produce different ciphertexts for same plaintext (random IV)", async () => {
      const plaintext = "user-123";
      const encrypted1 = await encryptCookieValue(plaintext);
      const encrypted2 = await encryptCookieValue(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should encrypt empty string", async () => {
      const encrypted = await encryptCookieValue("");
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should encrypt special characters", async () => {
      const plaintext = "user@example.com!#$%^&*()";
      const encrypted = await encryptCookieValue(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });

    it("should produce base64-encoded output", async () => {
      const encrypted = await encryptCookieValue("test-value");
      // Base64 pattern: alphanumeric + / + and optional = padding
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("should throw error if SESSION_SECRET is missing", async () => {
      delete process.env.SESSION_SECRET;

      await expect(() => encryptCookieValue("test")).rejects.toThrow(
        /SESSION_SECRET/,
      );
    });

    it("should throw error if SESSION_SECRET is too short", async () => {
      process.env.SESSION_SECRET = "short";

      await expect(() => encryptCookieValue("test")).rejects.toThrow(
        /at least 32 characters/,
      );
    });
  });

  describe("decryptCookieValue", () => {
    it("should decrypt encrypted value back to original", async () => {
      const plaintext = "user-123";
      const encrypted = await encryptCookieValue(plaintext);
      const decrypted = await decryptCookieValue(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should decrypt empty string", async () => {
      const encrypted = await encryptCookieValue("");
      const decrypted = await decryptCookieValue(encrypted);

      expect(decrypted).toBe("");
    });

    it("should decrypt special characters", async () => {
      const plaintext = "user@example.com!#$%^&*()";
      const encrypted = await encryptCookieValue(plaintext);
      const decrypted = await decryptCookieValue(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should decrypt long values", async () => {
      const plaintext = "a".repeat(1000);
      const encrypted = await encryptCookieValue(plaintext);
      const decrypted = await decryptCookieValue(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw error on invalid base64", async () => {
      await expect(() =>
        decryptCookieValue("not-valid-base64!!!"),
      ).rejects.toThrow();
    });

    it("should throw error on tampered ciphertext", async () => {
      const encrypted = await encryptCookieValue("test-value");
      // Tamper with the encrypted value
      const tampered = encrypted.slice(0, -4) + "XXXX";

      await expect(() => decryptCookieValue(tampered)).rejects.toThrow();
    });

    it("should throw error on truncated ciphertext", async () => {
      const encrypted = await encryptCookieValue("test-value");
      const truncated = encrypted.slice(0, 10);

      await expect(() => decryptCookieValue(truncated)).rejects.toThrow();
    });

    it("should throw error if SESSION_SECRET changed", async () => {
      const encrypted = await encryptCookieValue("test-value");

      // Change the secret
      process.env.SESSION_SECRET = "1".repeat(64);

      await expect(() => decryptCookieValue(encrypted)).rejects.toThrow();
    });

    it("should throw error if SESSION_SECRET is missing", async () => {
      const encrypted = await encryptCookieValue("test-value");
      delete process.env.SESSION_SECRET;

      await expect(() => decryptCookieValue(encrypted)).rejects.toThrow(
        /SESSION_SECRET/,
      );
    });
  });

  describe("Round-trip encryption/decryption", () => {
    it("should handle multiple encrypt/decrypt cycles", async () => {
      const plaintext = "user-456";

      for (let i = 0; i < 10; i++) {
        const encrypted = await encryptCookieValue(plaintext);
        const decrypted = await decryptCookieValue(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });

    it("should handle unicode characters", async () => {
      const plaintext = "用户-123-🔒-测试";
      const encrypted = await encryptCookieValue(plaintext);
      const decrypted = await decryptCookieValue(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle JSON stringified objects", async () => {
      const obj = { userId: "user-123", role: "admin", timestamp: Date.now() };
      const plaintext = JSON.stringify(obj);
      const encrypted = await encryptCookieValue(plaintext);
      const decrypted = await decryptCookieValue(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual(obj);
    });
  });

  describe("Format validation", () => {
    it("should produce output with IV + ciphertext + authTag", async () => {
      const encrypted = await encryptCookieValue("test");
      const decoded = Buffer.from(encrypted, "base64");

      // AES-256-GCM format: 12-byte IV + ciphertext + 16-byte auth tag
      // Minimum length for empty plaintext: 12 + 0 + 16 = 28 bytes
      expect(decoded.length).toBeGreaterThanOrEqual(28);
    });

    it("should have consistent format across encryptions", async () => {
      const plaintext = "consistent-test";
      const encrypted1 = await encryptCookieValue(plaintext);
      const encrypted2 = await encryptCookieValue(plaintext);

      const decoded1 = Buffer.from(encrypted1, "base64");
      const decoded2 = Buffer.from(encrypted2, "base64");

      // Length should be consistent (same plaintext length)
      expect(decoded1.length).toBe(decoded2.length);
    });
  });

  describe("Legacy backward compatibility", () => {
    it("should read encrypted cookies (new format)", async () => {
      const plaintext = "user-789";
      const encrypted = await encryptCookieValue(plaintext);
      const value = await readCookieValue(encrypted);

      expect(value).toBe(plaintext);
    });

    it("should read legacy signed-only cookies", async () => {
      const plaintext = "user-legacy-123";
      const { signed } = signCookieValue(plaintext);
      const value = await readCookieValue(signed);

      expect(value).toBe(plaintext);
    });

    it("should throw error for invalid/tampered legacy cookies", async () => {
      const { signed } = signCookieValue("user-123");
      const tampered = signed.replace(/.$/, "X");

      await expect(() => readCookieValue(tampered)).rejects.toThrow();
    });

    it("should throw error for unsigned cookies", async () => {
      const unsignedCookie = "user-123";

      await expect(() => readCookieValue(unsignedCookie)).rejects.toThrow();
    });

    it("should handle transition from legacy to encrypted format", async () => {
      // Legacy cookie
      const legacyValue = "user-transition-456";
      const { signed: legacySigned } = signCookieValue(legacyValue);
      const legacyRead = await readCookieValue(legacySigned);
      expect(legacyRead).toBe(legacyValue);

      // New encrypted cookie
      const newValue = "user-encrypted-789";
      const newEncrypted = await encryptCookieValue(newValue);
      const newRead = await readCookieValue(newEncrypted);
      expect(newRead).toBe(newValue);
    });
  });
});
