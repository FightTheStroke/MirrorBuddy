import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    globalConfig: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { prisma } from '@/lib/db';
import {
  getPaymentSettings,
  updatePaymentSettings,
} from '../stripe-settings-service';

const mockFindFirst = prisma.globalConfig.findFirst as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.globalConfig.upsert as ReturnType<typeof vi.fn>;

describe('stripe-settings-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPaymentSettings', () => {
    it('should return default settings when no config exists', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await getPaymentSettings();

      expect(result.paymentsEnabled).toBe(false);
      expect(result.updatedBy).toBeNull();
    });

    it('should return existing settings', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'global',
        paymentsEnabled: true,
        updatedAt: new Date('2024-01-01'),
        updatedBy: 'admin-123',
      });

      const result = await getPaymentSettings();

      expect(result.paymentsEnabled).toBe(true);
      expect(result.updatedBy).toBe('admin-123');
    });
  });

  describe('updatePaymentSettings', () => {
    it('should enable payments', async () => {
      const now = new Date();
      mockUpsert.mockResolvedValue({
        id: 'global',
        paymentsEnabled: true,
        updatedAt: now,
        updatedBy: 'admin-123',
      });

      const result = await updatePaymentSettings(true, 'admin-123');

      expect(result.paymentsEnabled).toBe(true);
      expect(result.updatedBy).toBe('admin-123');
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: 'global' },
        update: { paymentsEnabled: true, updatedBy: 'admin-123' },
        create: { id: 'global', paymentsEnabled: true, updatedBy: 'admin-123' },
      });
    });

    it('should disable payments', async () => {
      const now = new Date();
      mockUpsert.mockResolvedValue({
        id: 'global',
        paymentsEnabled: false,
        updatedAt: now,
        updatedBy: 'admin-456',
      });

      const result = await updatePaymentSettings(false, 'admin-456');

      expect(result.paymentsEnabled).toBe(false);
    });
  });
});
