/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { GET } from '../route';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  const admin = { authenticated: true, isAdmin: true, userId: 'admin-1' };
  return {
    ...actual,
    validateAdminAuth: async () => admin,
    validateAdminReadOnlyAuth: async () => ({ ...admin, canAccessAdminReadOnly: true }),
  };
});

const request = () => new NextRequest('http://localhost:3000/api/admin/sentry/issues');

describe('GET /api/admin/sentry/issues when Sentry answers with an error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SENTRY_AUTH_TOKEN', 'test-token');
    vi.stubEnv('SENTRY_ORG', 'test-org');
    vi.stubEnv('SENTRY_PROJECT', 'test-project');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([502, 503, 504, 429])(
    'treats an upstream %i as a transient outage: warning, not error',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('gateway', { status })));

      const response = await GET(request());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metric.unavailabilityReason).toBe('collectionFailed');
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Sentry API temporarily unavailable',
        expect.objectContaining({ component: 'sentry-issues', status }),
      );
    },
  );

  it.each([400, 401, 403, 404])(
    'still reports a configuration fault %i as an error',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('denied', { status })));

      await GET(request());

      expect(logger.error).toHaveBeenCalledWith(
        'Sentry API error response',
        expect.objectContaining({ component: 'sentry-issues', status }),
      );
    },
  );
});
