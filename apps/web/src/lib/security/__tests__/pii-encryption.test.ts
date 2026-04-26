/**
 * PII Encryption Tests
 *
 * Tests for PII-specific encryption/decryption/hashing functions
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock azure-key-vault BEFORE importing pii-encryption to avoid caching issues
vi.mock("@/lib/security/azure-key-vault", () => ({
  getSecret: vi.fn((keyName: string) => {
    // Check env vars at call time, not import time
    const value = process.env[keyName];
    if (value) {
      return Promise.resolve(value);
    }
    return Promise.reject(new Error(`Secret ${keyName} not found`));
  }),
}));

import {
  encryptPII,
  decryptPII,
  hashPII,
  _resetPIIKeyCache,
} from "../pii-encryption";

describe("PII Encryption", () => {
  const originalEnv = process.env.PII_ENCRYPTION_KEY;

  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    _resetPIIKeyCache();

    // Set a test encryption key
    process.env.PII_ENCRYPTION_KEY =
      "test-key-for-pii-encryption-at-least-32-chars-long";
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.PII_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.PII_ENCRYPTION_KEY;
    }
  });

  describe("encryptPII and decryptPII", () => {
    it("should encrypt then decrypt to return original plaintext", async () => {
      const plaintext = "sensitive-user-email@example.com";

      const encrypted = await encryptPII(plaintext);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertexts for same plaintext (random IV)", async () => {
      const plaintext = "john.doe@example.com";

      const encrypted1 = await encryptPII(plaintext);
      const encrypted2 = await encryptPII(plaintext);

      // Different ciphertexts due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same plaintext
      expect(await decryptPII(encrypted1)).toBe(plaintext);
      expect(await decryptPII(encrypted2)).toBe(plaintext);
    });

    it("should handle empty strings", async () => {
      const encrypted = await encryptPII("");
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe("");
    });

    it("should handle unicode characters", async () => {
      const plaintext = "user-名前-é-ñ@example.com";

      const encrypted = await encryptPII(plaintext);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw meaningful error for invalid ciphertext", async () => {
      const invalidCiphertext = "pii:v1:invalid-base64-data!!!";

      await expect(decryptPII(invalidCiphertext)).rejects.toThrow(
        /PII decryption failed/i,
      );
    });

    it("should throw error for corrupted ciphertext", async () => {
      const plaintext = "test@example.com";
      const encrypted = await encryptPII(plaintext);

      // Corrupt the encrypted data
      const corrupted = encrypted.slice(0, -5) + "AAAAA";

      await expect(decryptPII(corrupted)).rejects.toThrow(
        /PII decryption failed/i,
      );
    });

    it("should return encrypted format with version prefix", async () => {
      const encrypted = await encryptPII("test@example.com");

      expect(encrypted).toMatch(/^pii:v1:/);
    });
  });

  describe("hashPII", () => {
    it("should be deterministic (same input = same hash)", async () => {
      const plaintext = "john.doe@example.com";

      const hash1 = await hashPII(plaintext);
      const hash2 = await hashPII(plaintext);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await hashPII("user1@example.com");
      const hash2 = await hashPII("user2@example.com");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce hex string of consistent length", async () => {
      const hash = await hashPII("test@example.com");

      // SHA-256 produces 64 hex characters (32 bytes * 2)
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash.length).toBe(64);
    });

    it("should handle empty strings", async () => {
      const hash = await hashPII("");

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle unicode characters", async () => {
      const hash = await hashPII("user-名前-é-ñ@example.com");

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("Environment key fallback", () => {
    it("should use ENCRYPTION_KEY if PII_ENCRYPTION_KEY not set", async () => {
      delete process.env.PII_ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY =
        "fallback-encryption-key-at-least-32-chars-long";

      const plaintext = "test@example.com";
      const encrypted = await encryptPII(plaintext);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);

      delete process.env.ENCRYPTION_KEY;
    });

    it("should throw error in production without encryption key", async () => {
      delete process.env.PII_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      // Clear cache after deleting env vars
      _resetPIIKeyCache();

      // Use vi.stubEnv to mock NODE_ENV
      vi.stubEnv("NODE_ENV", "production");

      await expect(encryptPII("test")).rejects.toThrow(/key not configured/i);

      // Restore
      vi.unstubAllEnvs();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long strings", async () => {
      const longString = "a".repeat(10000);

      const encrypted = await encryptPII(longString);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe(longString);
    });

    it("should handle special characters", async () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

      const _encrypted = await encryptPII(specialChars);
      const decrypted = await decryptPII(specialChars);

      expect(decrypted).toBe(specialChars);
    });

    it("should handle multiline strings", async () => {
      const multiline = "line1\nline2\nline3";

      const encrypted = await encryptPII(multiline);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe(multiline);
    });

    it("should handle strings with null bytes", async () => {
      const withNullByte = "test\x00data";

      const encrypted = await encryptPII(withNullByte);
      const decrypted = await decryptPII(encrypted);

      expect(decrypted).toBe(withNullByte);
    });

    it("should return empty string as-is without encrypting", async () => {
      const result = await encryptPII("");

      expect(result).toBe("");
    });

    it("should handle decryption of legacy unencrypted data (no prefix)", async () => {
      const legacyData = "user@example.com";

      const result = await decryptPII(legacyData);

      // Should return as-is for backward compatibility
      expect(result).toBe(legacyData);
    });
  });

  describe("Version Prefix", () => {
    it("should include version prefix in encrypted output", async () => {
      const encrypted = await encryptPII("test@example.com");

      expect(encrypted).toMatch(/^pii:v1:/);
    });

    it("should handle future version prefixes gracefully", async () => {
      const futureVersion = "pii:v2:some-encrypted-data";

      // This should fail as we only support v1
      await expect(decryptPII(futureVersion)).rejects.toThrow(
        /PII decryption failed/i,
      );
    });
  });

  describe("Cryptographic Properties", () => {
    it("should use authenticated encryption (verify integrity)", async () => {
      const plaintext = "test@example.com";
      const encrypted = await encryptPII(plaintext);

      // Tamper with the encrypted data (modify last character)
      const tampered =
        encrypted.slice(0, -1) + (encrypted.slice(-1) === "A" ? "B" : "A");

      // Decryption should fail due to authentication tag mismatch
      await expect(decryptPII(tampered)).rejects.toThrow(
        /PII decryption failed/i,
      );
    });

    it("should produce unique ciphertexts across multiple encryptions (IV randomness)", async () => {
      const plaintext = "test@example.com";
      const encrypted = [];

      // Generate multiple encryptions
      for (let i = 0; i < 5; i++) {
        encrypted.push(await encryptPII(plaintext));
      }

      // All should be unique (due to random IV)
      const uniqueSet = new Set(encrypted);
      expect(uniqueSet.size).toBe(5);

      // But all should decrypt to same plaintext
      for (const ciphertext of encrypted) {
        expect(await decryptPII(ciphertext)).toBe(plaintext);
      }
    });
  });
});
