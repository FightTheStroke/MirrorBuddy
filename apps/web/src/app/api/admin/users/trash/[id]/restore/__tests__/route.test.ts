/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateAdminAuth, AuthenticationError } from '@/lib/auth/server';
import { anonymousFixture, authenticatedFixture } from '@/test/fixtures/session-compat';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: vi.fn(),
  };
});

vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return {
    ...actual,
    requireCSRF: vi.fn().mockReturnValue(true),
  };
});

const restoreUserFromBackup = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/admin/user-trash-service', () => ({
  restoreUserFromBackup: (...args: unknown[]) => restoreUserFromBackup(...args),
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

import { POST } from '../route';

describe('admin users trash restore API', () => {
  const admin = authenticatedFixture('admin-1');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminAuth).mockResolvedValue({ ...admin, isAdmin: true });
  });

  it('restores user by id', async () => {
    const request = new NextRequest('http://localhost/api/admin/users/trash/user-1/restore', {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: 'user-1' }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(restoreUserFromBackup).toHaveBeenCalledWith('user-1', 'admin-1', admin.session);
  });

  it('does not restore without an authenticated administrator', async () => {
    vi.mocked(validateAdminAuth).mockResolvedValueOnce({ ...anonymousFixture, isAdmin: false });

    const response = await POST(
      new NextRequest('http://localhost/api/admin/users/trash/user-1/restore', { method: 'POST' }),
      { params: Promise.resolve({ id: 'user-1' }) },
    );

    expect(response.status).toBe(401);
    expect(restoreUserFromBackup).not.toHaveBeenCalled();
  });

  it('surfaces live actor rejection instead of reporting restoration success', async () => {
    restoreUserFromBackup.mockRejectedValueOnce(new AuthenticationError('SESSION_REJECTED'));

    const response = await POST(
      new NextRequest('http://localhost/api/admin/users/trash/user-1/restore', { method: 'POST' }),
      { params: Promise.resolve({ id: 'user-1' }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'SESSION_REJECTED' });
    expect(restoreUserFromBackup).toHaveBeenCalledWith('user-1', 'admin-1', admin.session);
  });
});
