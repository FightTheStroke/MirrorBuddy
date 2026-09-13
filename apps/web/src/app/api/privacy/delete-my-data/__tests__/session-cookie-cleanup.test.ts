// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  LEGACY_AUTH_COOKIE,
  VISITOR_COOKIE_NAME,
} from '@/lib/auth';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  store: { set: vi.fn(), delete: vi.fn() },
}));
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue(mocks.store) }));
vi.mock('@/lib/auth/server', () => ({
  validateAuth: vi.fn().mockResolvedValue({ authenticated: true, userId: 'user-1' }),
}));
vi.mock('@/lib/security', () => ({ requireCSRF: () => true }));
vi.mock('@/lib/tracing', () => ({
  getRequestLogger: () => ({ info: vi.fn() }),
  getRequestId: () => 'request-1',
}));
vi.mock('../helpers', () => ({
  executeUserDataDeletion: mocks.execute,
  logDeletionAudit: vi.fn(),
  getUserDataSummary: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: vi.fn() } } }));

import { POST } from '../route';
import { DELETE } from '../../../user/data/route';

describe.each([
  ['privacy deletion', POST],
  ['user data deletion', DELETE],
] as const)('%s clears session cookies only after durable deletion', (_name, handler) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.execute.mockResolvedValue({ success: true, deletedData: {} });
  });
  const request = () =>
    new NextRequest('http://localhost/api/privacy/delete-my-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmDeletion: true }),
    });

  it('clears the primary, legacy alias, and identity hint but preserves visitor budgets', async () => {
    expect((await handler(request())).status).toBe(200);
    for (const name of [AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE, AUTH_COOKIE_CLIENT]) {
      expect(mocks.store.set).toHaveBeenCalledWith(
        name,
        '',
        expect.objectContaining({ maxAge: 0, path: '/' }),
      );
    }
    expect(mocks.store.set.mock.calls.some(([name]) => name === VISITOR_COOKIE_NAME)).toBe(false);
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.store.set.mock.invocationCallOrder[0],
    );
  });

  it('does not clear browser identity when deletion fails', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('deletion failed'));
    expect((await handler(request())).status).toBeGreaterThanOrEqual(500);
    expect(mocks.store.set).not.toHaveBeenCalled();
    expect(mocks.store.delete).not.toHaveBeenCalled();
  });
});
