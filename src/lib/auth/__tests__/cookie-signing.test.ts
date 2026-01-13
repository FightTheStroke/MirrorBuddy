/**
 * Cookie Signing Tests
 * Task #013: Cryptographically Signed Session Cookies
 *
 * Tests HMAC-SHA256 cookie signing and verification utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  signCookieValue,
  verifyCookieValue,
  isSignedCookie,
  CookieSigningError,
} from '../cookie-signing';

describe('Cookie Signing', () => {
  const originalEnv = process.env.SESSION_SECRET;

  beforeEach(() => {
    // Set valid secret for tests
    process.env.SESSION_SECRET = 'test-secret-key-with-sufficient-length-32-bytes';
  });

  afterEach(() => {
    // Restore original environment
    process.env.SESSION_SECRET = originalEnv;
  });

  describe('signCookieValue', () => {
    it('should sign a cookie value and return SignedCookie object', () => {
      const result = signCookieValue('user-123');

      expect(result).toHaveProperty('value', 'user-123');
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('signed');
      expect(result.signature).toMatch(/^[0-9a-f]{64}$/); // SHA256 hex is 64 chars
      expect(result.signed).toBe(`user-123.${result.signature}`);
    });

    it('should produce consistent signatures for same input', () => {
      const result1 = signCookieValue('user-123');
      const result2 = signCookieValue('user-123');

      expect(result1.signature).toBe(result2.signature);
      expect(result1.signed).toBe(result2.signed);
    });

    it('should produce different signatures for different inputs', () => {
      const result1 = signCookieValue('user-123');
      const result2 = signCookieValue('user-456');

      expect(result1.signature).not.toBe(result2.signature);
      expect(result1.signed).not.toBe(result2.signed);
    });

    it('should handle UUID values correctly', () => {
      const uuid = 'a1b2c3d4-e5f6-4789-9012-345678901234';
      const result = signCookieValue(uuid);

      expect(result.value).toBe(uuid);
      expect(result.signed).toContain(uuid);
      expect(result.signed).toMatch(/^a1b2c3d4-e5f6-4789-9012-345678901234\.[0-9a-f]{64}$/);
    });

    it('should handle empty string', () => {
      const result = signCookieValue('');

      expect(result.value).toBe('');
      expect(result.signature).toMatch(/^[0-9a-f]{64}$/);
      expect(result.signed).toMatch(/^\.[0-9a-f]{64}$/);
    });

    it('should throw error when SESSION_SECRET is missing', () => {
      delete process.env.SESSION_SECRET;

      expect(() => signCookieValue('user-123')).toThrow(CookieSigningError);
      expect(() => signCookieValue('user-123')).toThrow(/SESSION_SECRET environment variable is not set/);
    });

    it('should throw error when SESSION_SECRET is too short', () => {
      process.env.SESSION_SECRET = 'too-short';

      expect(() => signCookieValue('user-123')).toThrow(CookieSigningError);
      expect(() => signCookieValue('user-123')).toThrow(/must be at least 32 characters/);
    });

    it('should handle special characters in value', () => {
      const specialValue = 'user@example.com_!#$%';
      const result = signCookieValue(specialValue);

      expect(result.value).toBe(specialValue);
      expect(result.signature).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('verifyCookieValue', () => {
    it('should verify valid signed cookie', () => {
      const signed = signCookieValue('user-123');
      const result = verifyCookieValue(signed.signed);

      expect(result.valid).toBe(true);
      expect(result.value).toBe('user-123');
      expect(result.error).toBeUndefined();
    });

    it('should reject tampered cookie value', () => {
      const signed = signCookieValue('user-123');
      const tampered = signed.signed.replace('user-123', 'user-456');

      const result = verifyCookieValue(tampered);

      expect(result.valid).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toContain('Signature verification failed');
    });

    it('should reject tampered signature', () => {
      const signed = signCookieValue('user-123');
      const signature = signed.signature;
      // Flip a bit in the signature
      const tamperedSig = signature.substring(0, 10) + 'x' + signature.substring(11);
      const tampered = `user-123.${tamperedSig}`;

      const result = verifyCookieValue(tampered);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject cookie signed with different secret', () => {
      const signed = signCookieValue('user-123');

      // Change secret
      process.env.SESSION_SECRET = 'different-secret-key-with-sufficient-length';

      const result = verifyCookieValue(signed.signed);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });

    it('should reject unsigned cookie (no dot separator)', () => {
      const result = verifyCookieValue('user-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing signature');
    });

    it('should reject cookie with empty value', () => {
      const result = verifyCookieValue('.abcd1234');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty value or signature');
    });

    it('should reject cookie with empty signature', () => {
      const result = verifyCookieValue('user-123.');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty value or signature');
    });

    it('should reject cookie with invalid signature format', () => {
      const result = verifyCookieValue('user-123.not-a-valid-signature');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature length');
    });

    it('should handle missing SESSION_SECRET gracefully', () => {
      const signed = signCookieValue('user-123');
      delete process.env.SESSION_SECRET;

      const result = verifyCookieValue(signed.signed);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('SESSION_SECRET');
    });

    it('should handle cookie with multiple dots correctly', () => {
      // Value contains dots (e.g., email address)
      const signed = signCookieValue('user.name@example.com');
      const result = verifyCookieValue(signed.signed);

      expect(result.valid).toBe(true);
      expect(result.value).toBe('user.name@example.com');
    });

    it('should use timing-safe comparison (smoke test)', () => {
      // This is a smoke test - we can't easily test timing directly
      // but we verify that different length signatures don't throw
      const signed = signCookieValue('user-123');
      const shortSig = signed.signature.substring(0, 32);
      const tampered = `user-123.${shortSig}`;

      const result = verifyCookieValue(tampered);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature length');
    });
  });

  describe('isSignedCookie', () => {
    it('should return true for valid signed cookie format', () => {
      const signed = signCookieValue('user-123');

      expect(isSignedCookie(signed.signed)).toBe(true);
    });

    it('should return false for unsigned value (no dot)', () => {
      expect(isSignedCookie('user-123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSignedCookie('')).toBe(false);
    });

    it('should return false for value with short signature', () => {
      expect(isSignedCookie('user-123.abc')).toBe(false);
    });

    it('should return false for value with non-hex signature', () => {
      const invalidSig = 'g'.repeat(64); // 'g' is not a valid hex character
      expect(isSignedCookie(`user-123.${invalidSig}`)).toBe(false);
    });

    it('should return true for correct format even if signature is invalid', () => {
      // isSignedCookie only checks format, not validity
      const validHexSig = 'a'.repeat(64);
      expect(isSignedCookie(`user-123.${validHexSig}`)).toBe(true);
    });

    it('should handle value with multiple dots', () => {
      const signed = signCookieValue('user.name@example.com');
      expect(isSignedCookie(signed.signed)).toBe(true);
    });

    it('should return false for malformed signatures', () => {
      const testCases = [
        'user-123.', // Empty signature
        'user-123.abc123', // Too short
        'user-123.' + 'z'.repeat(64), // Non-hex chars
        'user-123.' + 'a'.repeat(63), // One char short
        'user-123.' + 'a'.repeat(65), // One char long
      ];

      for (const testCase of testCases) {
        expect(isSignedCookie(testCase)).toBe(false);
      }
    });
  });

  describe('CookieSigningError', () => {
    it('should create error with correct properties', () => {
      const error = new CookieSigningError('Test error', 'MISSING_SECRET');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CookieSigningError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('MISSING_SECRET');
      expect(error.name).toBe('CookieSigningError');
    });

    it('should support all error codes', () => {
      const codes: Array<'MISSING_SECRET' | 'INVALID_FORMAT' | 'VERIFICATION_FAILED'> = [
        'MISSING_SECRET',
        'INVALID_FORMAT',
        'VERIFICATION_FAILED',
      ];

      for (const code of codes) {
        const error = new CookieSigningError('Test', code);
        expect(error.code).toBe(code);
      }
    });

    it('should support optional cause parameter', () => {
      const cause = new Error('Original error');
      const error = new CookieSigningError('Wrapped error', 'VERIFICATION_FAILED', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('Security Properties', () => {
    it('should produce 256-bit (64 hex char) signatures', () => {
      const signed = signCookieValue('user-123');
      expect(signed.signature).toHaveLength(64);
    });

    it('should not expose secret in error messages', () => {
      process.env.SESSION_SECRET = 'super-secret-key-do-not-expose-this';

      try {
        const signed = signCookieValue('user-123');
        process.env.SESSION_SECRET = 'different-key-with-sufficient-length';
        const result = verifyCookieValue(signed.signed);

        expect(result.error).not.toContain('super-secret');
        expect(result.error).not.toContain('expose');
      } finally {
        process.env.SESSION_SECRET = 'test-secret-key-with-sufficient-length-32-bytes';
      }
    });

    it('should handle adversarial inputs without crashing', () => {
      const adversarialInputs = [
        '.', // Just a dot
        '..', // Double dot
        '...', // Triple dot
        'a'.repeat(10000), // Very long string
        '\x00\x01\x02', // Null bytes
        '${process.env}', // Template injection attempt
        '../../../etc/passwd', // Path traversal
        '<script>alert(1)</script>', // XSS attempt (shouldn't affect cookie signing)
      ];

      for (const input of adversarialInputs) {
        // Should not crash
        expect(() => signCookieValue(input)).not.toThrow();
        expect(() => verifyCookieValue(input)).not.toThrow();
        expect(() => isSignedCookie(input)).not.toThrow();
      }
    });

    it('should produce different signatures for similar values', () => {
      const values = ['user-1', 'user-10', 'user-100', 'user-1000'];
      const signatures = values.map(v => signCookieValue(v).signature);

      // All signatures should be different
      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).toBe(values.length);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should support complete sign-verify workflow', () => {
      const userId = 'a1b2c3d4-e5f6-4789-9012-345678901234';

      // Sign
      const signed = signCookieValue(userId);
      expect(signed.value).toBe(userId);

      // Store (simulated)
      const cookieValue = signed.signed;

      // Retrieve and verify
      const verified = verifyCookieValue(cookieValue);
      expect(verified.valid).toBe(true);
      expect(verified.value).toBe(userId);
    });

    it('should support backward compatibility check', () => {
      const legacyUnsigned = 'a1b2c3d4-e5f6-4789-9012-345678901234';
      const newSigned = signCookieValue(legacyUnsigned);

      // Can distinguish between signed and unsigned
      expect(isSignedCookie(legacyUnsigned)).toBe(false);
      expect(isSignedCookie(newSigned.signed)).toBe(true);

      // Legacy cookie verification fails (as expected)
      const legacyResult = verifyCookieValue(legacyUnsigned);
      expect(legacyResult.valid).toBe(false);

      // New cookie verification succeeds
      const newResult = verifyCookieValue(newSigned.signed);
      expect(newResult.valid).toBe(true);
    });

    it('should handle session rotation workflow', () => {
      const oldUserId = 'old-user-123';
      const newUserId = 'new-user-456';

      // Old session
      const oldSigned = signCookieValue(oldUserId);
      expect(verifyCookieValue(oldSigned.signed).valid).toBe(true);

      // Rotate to new session
      const newSigned = signCookieValue(newUserId);
      expect(verifyCookieValue(newSigned.signed).valid).toBe(true);

      // Both are valid (different signatures)
      expect(oldSigned.signature).not.toBe(newSigned.signature);
    });
  });

  describe('Edge Cases', () => {
    it('should handle Unicode characters in value', () => {
      const unicode = 'user-🎯-测试-مرحبا';
      const signed = signCookieValue(unicode);
      const verified = verifyCookieValue(signed.signed);

      expect(verified.valid).toBe(true);
      expect(verified.value).toBe(unicode);
    });

    it('should handle very long values', () => {
      const longValue = 'user-' + 'a'.repeat(1000);
      const signed = signCookieValue(longValue);
      const verified = verifyCookieValue(signed.signed);

      expect(verified.valid).toBe(true);
      expect(verified.value).toBe(longValue);
    });

    it('should handle value that looks like a signature', () => {
      const fakeSignature = 'a'.repeat(64);
      const signed = signCookieValue(fakeSignature);
      const verified = verifyCookieValue(signed.signed);

      expect(verified.valid).toBe(true);
      expect(verified.value).toBe(fakeSignature);
    });

    it('should handle newlines and whitespace in value', () => {
      const value = 'user\n123\t456 789';
      const signed = signCookieValue(value);
      const verified = verifyCookieValue(signed.signed);

      expect(verified.valid).toBe(true);
      expect(verified.value).toBe(value);
    });
  });
});
