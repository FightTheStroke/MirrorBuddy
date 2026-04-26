/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockActivate, mockDeactivate, mockCreate, mockLogAdminAction } = vi.hoisted(() => ({
  mockActivate: vi.fn(),
  mockDeactivate: vi.fn(),
  mockCreate: vi.fn(),
  mockLogAdminAction: vi.fn(),
}));

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._middlewares: unknown[]) =>
    (handler: (ctx: { req: Request; userId: string }) => Promise<Response>) =>
    async (req: Request) =>
      handler({ req, userId: 'admin-1' }),
  withSentry: () => null,
  withCSRF: null,
  withAdmin: null,
}));

vi.mock('@/lib/maintenance/maintenance-service', () => ({
  activateMaintenanceWindow: (...args: unknown[]) => mockActivate(...args),
  deactivateMaintenanceWindow: (...args: unknown[]) => mockDeactivate(...args),
  createMaintenanceWindow: (...args: unknown[]) => mockCreate(...args),
}));

vi.mock('@/lib/admin/audit-service', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

import { POST } from '../route';

describe('POST /api/admin/maintenance/toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activates an existing maintenance window', async () => {
    mockActivate.mockResolvedValue({ id: 'win-1', isActive: true });

    const request = new NextRequest('http://localhost:3000/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ windowId: 'win-1', activate: true }),
    });

    const response = await (POST as (req: NextRequest) => Promise<Response>)(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockActivate).toHaveBeenCalledWith('win-1');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACTIVATE_MAINTENANCE', entityId: 'win-1' }),
    );
    expect(body.success).toBe(true);
  });

  it('deactivates an existing maintenance window', async () => {
    mockDeactivate.mockResolvedValue({ id: 'win-1', isActive: false });

    const request = new NextRequest('http://localhost:3000/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ windowId: 'win-1', activate: false }),
    });

    const response = await (POST as (req: NextRequest) => Promise<Response>)(request);

    expect(response.status).toBe(200);
    expect(mockDeactivate).toHaveBeenCalledWith('win-1');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEACTIVATE_MAINTENANCE', entityId: 'win-1' }),
    );
  });

  it('returns 400 when activate is not boolean', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ windowId: 'win-1', activate: 'yes' }),
    });

    const response = await (POST as (req: NextRequest) => Promise<Response>)(request);

    expect(response.status).toBe(400);
    expect(mockActivate).not.toHaveBeenCalled();
    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  it('returns 400 when deactivating without windowId', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ activate: false }),
    });

    const response = await (POST as (req: NextRequest) => Promise<Response>)(request);

    expect(response.status).toBe(400);
    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  it('creates and activates an ad-hoc maintenance window', async () => {
    mockCreate.mockResolvedValue({ id: 'adhoc-1' });
    mockActivate.mockResolvedValue({ id: 'adhoc-1', isActive: true });

    const request = new NextRequest('http://localhost:3000/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ activate: true, message: 'Emergency patching', estimatedMinutes: 30 }),
    });

    const response = await (POST as (req: NextRequest) => Promise<Response>)(request);

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Emergency patching',
        estimatedMinutes: 30,
        createdBy: 'admin-1',
      }),
    );
    expect(mockActivate).toHaveBeenCalledWith('adhoc-1');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACTIVATE_MAINTENANCE', entityId: 'adhoc-1' }),
    );
  });
});
