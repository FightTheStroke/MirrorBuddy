/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    }),
    validateAdminReadOnlyAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      canAccessAdminReadOnly: true,
      userId: 'admin-1',
    }),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores user by id', async () => {
    const request = new NextRequest('http://localhost/api/admin/users/trash/user-1/restore');

    const response = await POST(request, {
      params: Promise.resolve({ id: 'user-1' }),
    });

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(restoreUserFromBackup).toHaveBeenCalledWith('user-1', 'admin-1');
  });
});
