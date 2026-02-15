import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindFirst, mockFindMany, mockCreate, mockUpdate, mockGetMaintenanceMode } = vi.hoisted(
  () => ({
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockGetMaintenanceMode: vi.fn(),
  }),
);

vi.mock('@/lib/db', () => ({
  prisma: {
    maintenanceWindow: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

vi.mock('@/lib/admin/control-panel-service', () => ({
  getMaintenanceMode: mockGetMaintenanceMode,
}));

import { getMaintenanceState, isMaintenanceModeEnv } from './maintenance-service';

describe('maintenance-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MAINTENANCE_MODE;
    mockFindFirst.mockResolvedValue(null);
    mockGetMaintenanceMode.mockReturnValue({
      isEnabled: false,
      customMessage: '',
      severity: 'low',
      estimatedEndTime: undefined,
    });
  });

  describe('isMaintenanceModeEnv', () => {
    it('returns true when MAINTENANCE_MODE is "true"', () => {
      process.env.MAINTENANCE_MODE = 'true';

      expect(isMaintenanceModeEnv()).toBe(true);
    });

    it('returns false when MAINTENANCE_MODE is "false"', () => {
      process.env.MAINTENANCE_MODE = 'false';

      expect(isMaintenanceModeEnv()).toBe(false);
    });

    it('returns false when MAINTENANCE_MODE is unset', () => {
      expect(isMaintenanceModeEnv()).toBe(false);
    });
  });

  describe('getMaintenanceState', () => {
    it('returns env as highest priority when MAINTENANCE_MODE is true', async () => {
      process.env.MAINTENANCE_MODE = 'true';

      const result = await getMaintenanceState();

      expect(result).toEqual({
        isActive: true,
        source: 'env',
      });
      expect(mockFindFirst).not.toHaveBeenCalled();
      expect(mockGetMaintenanceMode).not.toHaveBeenCalled();
    });

    it('returns db state when an active maintenance window exists', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'mw-1',
        startTime: new Date('2026-02-15T10:00:00Z'),
        endTime: new Date('2026-02-15T11:00:00Z'),
        message: 'Scheduled maintenance in progress',
        severity: 'high',
      });

      const result = await getMaintenanceState();

      expect(result).toEqual({
        isActive: true,
        message: 'Scheduled maintenance in progress',
        severity: 'high',
        estimatedEndTime: new Date('2026-02-15T11:00:00Z'),
        source: 'db',
      });
      expect(mockGetMaintenanceMode).not.toHaveBeenCalled();
    });

    it('falls back to in-memory state when env and db are inactive', async () => {
      mockGetMaintenanceMode.mockReturnValue({
        isEnabled: false,
        customMessage: '',
        severity: 'medium',
      });

      const result = await getMaintenanceState();

      expect(result).toEqual({
        isActive: false,
        source: 'memory',
      });
      expect(mockGetMaintenanceMode).toHaveBeenCalledTimes(1);
    });
  });
});
