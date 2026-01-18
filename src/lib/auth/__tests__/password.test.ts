import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { hashPassword, verifyPassword, generateRandomPassword, validatePasswordStrength } from '../password';

vi.mock('bcrypt');

describe('password utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('creates a bcrypt hash', async () => {
      const mockHash = '$2b$12$mockHashedPassword';
      vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHash as never);
      const result = await hashPassword('MyPassword123!');
      expect(result).toBe(mockHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('MyPassword123!', 12);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      const result = await verifyPassword('correct', '$2b$12$hash');
      expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
      const result = await verifyPassword('wrong', '$2b$12$hash');
      expect(result).toBe(false);
    });
  });

  describe('generateRandomPassword', () => {
    it('creates passwords of specified length', () => {
      const pwd = generateRandomPassword(20);
      expect(pwd).toHaveLength(20);
      expect(/^[A-Za-z0-9!@#$%]+$/.test(pwd)).toBe(true);
    });

    it('defaults to 16 characters', () => {
      expect(generateRandomPassword()).toHaveLength(16);
    });
  });

  describe('validatePasswordStrength', () => {
    it('detects weak passwords', () => {
      expect(validatePasswordStrength('weak').valid).toBe(false);
      expect(validatePasswordStrength('lowercase1').valid).toBe(false);
      expect(validatePasswordStrength('UPPERCASE1').valid).toBe(false);
      expect(validatePasswordStrength('NoNumbers').valid).toBe(false);
    });

    it('accepts strong passwords', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('provides error messages for missing criteria', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
      expect(result.errors.length).toBe(3);
    });
  });
});
