/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetMaintenanceState, mockGetUpcomingMaintenanceWindow } = vi.hoisted(() => ({
  mockGetMaintenanceState: vi.fn(),
  mockGetUpcomingMaintenanceWindow: vi.fn(),
}));

vi.mock('@/lib/maintenance/maintenance-service', () => ({
  getMaintenanceState: (...args: unknown[]) => mockGetMaintenanceState(...args),
  getUpcomingMaintenanceWindow: (...args: unknown[]) => mockGetUpcomingMaintenanceWindow(...args),
}));

import { GET, revalidate } from '../route';

describe('GET /api/maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports revalidate as 30 seconds', () => {
    expect(revalidate).toBe(30);
  });

  it('returns active status when maintenance is active', async () => {
    mockGetMaintenanceState.mockResolvedValue({
      isActive: true,
      message: 'Maintenance in progress',
      severity: 'high',
      estimatedEndTime: new Date('2026-02-16T10:00:00Z'),
    });

    const req = new NextRequest('http://localhost:3000/api/maintenance');
    const response = await GET(req as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'active',
      message: 'Maintenance in progress',
      severity: 'high',
      estimatedEndTime: '2026-02-16T10:00:00.000Z',
    });
    expect(mockGetUpcomingMaintenanceWindow).not.toHaveBeenCalled();
  });

  it('returns upcoming status when a window starts within 48h', async () => {
    mockGetMaintenanceState.mockResolvedValue({ isActive: false });
    mockGetUpcomingMaintenanceWindow.mockResolvedValue({
      id: 'mw-1',
      message: 'Scheduled update',
      severity: 'medium',
      startTime: new Date('2026-02-16T08:00:00Z'),
      endTime: new Date('2026-02-16T09:00:00Z'),
    });

    const req = new NextRequest('http://localhost:3000/api/maintenance');
    const response = await GET(req as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'upcoming',
      message: 'Scheduled update',
      severity: 'medium',
      startTime: '2026-02-16T08:00:00.000Z',
      endTime: '2026-02-16T09:00:00.000Z',
    });
  });

  it('returns none status when no active or upcoming maintenance exists', async () => {
    mockGetMaintenanceState.mockResolvedValue({ isActive: false });
    mockGetUpcomingMaintenanceWindow.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/maintenance');
    const response = await GET(req as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'none' });
  });
});
