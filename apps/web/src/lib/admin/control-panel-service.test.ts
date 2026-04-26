import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('control-panel-service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getMaintenanceMode returns the current in-memory maintenance state', async () => {
    const { getMaintenanceMode, updateMaintenanceMode } = await import('./control-panel-service');

    const initialState = getMaintenanceMode();
    expect(initialState).toEqual({
      isEnabled: false,
      customMessage: '',
      severity: 'low',
    });

    const updatedState = updateMaintenanceMode({
      isEnabled: true,
      customMessage: 'Maintenance in progress',
      severity: 'high',
      estimatedEndTime: '2026-02-15T11:00:00.000Z',
    });

    expect(getMaintenanceMode()).toEqual(updatedState);
    expect(getMaintenanceMode()).toMatchObject({
      isEnabled: true,
      customMessage: 'Maintenance in progress',
      severity: 'high',
      estimatedEndTime: new Date('2026-02-15T11:00:00.000Z'),
    });
  });
});
