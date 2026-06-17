import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcrypt';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import {
  isValidPinFormat,
  getParentalPinStatus,
  setParentalPin,
  verifyParentalPin,
} from '../pin-service';

describe('parental-gate pin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidPinFormat', () => {
    it('accepts 4 to 6 digit strings', () => {
      expect(isValidPinFormat('1234')).toBe(true);
      expect(isValidPinFormat('123456')).toBe(true);
    });

    it('rejects wrong length, non-digits and non-strings', () => {
      expect(isValidPinFormat('123')).toBe(false);
      expect(isValidPinFormat('1234567')).toBe(false);
      expect(isValidPinFormat('12a4')).toBe(false);
      expect(isValidPinFormat(1234)).toBe(false);
      expect(isValidPinFormat(undefined)).toBe(false);
    });
  });

  describe('getParentalPinStatus', () => {
    it('returns isSet:true when a hash exists', async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({ parentalPinHash: 'x' } as never);
      expect(await getParentalPinStatus('u1')).toEqual({ isSet: true });
    });

    it('returns isSet:false when no hash', async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({ parentalPinHash: null } as never);
      expect(await getParentalPinStatus('u1')).toEqual({ isSet: false });
    });

    it('returns isSet:false for an empty userId without querying', async () => {
      expect(await getParentalPinStatus('')).toEqual({ isSet: false });
      expect(prisma.settings.findUnique).not.toHaveBeenCalled();
    });

    it('fails closed on a database error', async () => {
      vi.mocked(prisma.settings.findUnique).mockRejectedValue(new Error('db') as never);
      expect(await getParentalPinStatus('u1')).toEqual({ isSet: false });
    });
  });

  describe('setParentalPin', () => {
    it('hashes the PIN and upserts a bcrypt hash', async () => {
      vi.mocked(prisma.settings.upsert).mockResolvedValue({} as never);
      await setParentalPin('u1', '1234');

      expect(prisma.settings.upsert).toHaveBeenCalledTimes(1);
      const arg = vi.mocked(prisma.settings.upsert).mock.calls[0]![0] as {
        where: { userId: string };
        create: { parentalPinHash: string };
        update: { parentalPinHash: string };
      };
      expect(arg.where).toEqual({ userId: 'u1' });
      expect(arg.create.parentalPinHash).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare('1234', arg.create.parentalPinHash)).toBe(true);
    });

    it('throws on an invalid PIN and never writes', async () => {
      await expect(setParentalPin('u1', '12')).rejects.toThrow('Invalid PIN format');
      expect(prisma.settings.upsert).not.toHaveBeenCalled();
    });

    it('throws on a missing userId', async () => {
      await expect(setParentalPin('', '1234')).rejects.toThrow('Missing userId');
    });
  });

  describe('verifyParentalPin', () => {
    it('returns true when the PIN matches the stored hash', async () => {
      const hash = await bcrypt.hash('1234', 10);
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        parentalPinHash: hash,
      } as never);
      expect(await verifyParentalPin('u1', '1234')).toBe(true);
    });

    it('returns false when the PIN does not match', async () => {
      const hash = await bcrypt.hash('0000', 10);
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        parentalPinHash: hash,
      } as never);
      expect(await verifyParentalPin('u1', '1234')).toBe(false);
    });

    it('returns false when no PIN is configured', async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({ parentalPinHash: null } as never);
      expect(await verifyParentalPin('u1', '1234')).toBe(false);
    });

    it('returns false for an invalid format without querying', async () => {
      expect(await verifyParentalPin('u1', 'abc')).toBe(false);
      expect(prisma.settings.findUnique).not.toHaveBeenCalled();
    });

    it('fails closed on a database error', async () => {
      vi.mocked(prisma.settings.findUnique).mockRejectedValue(new Error('db') as never);
      expect(await verifyParentalPin('u1', '1234')).toBe(false);
    });
  });
});
