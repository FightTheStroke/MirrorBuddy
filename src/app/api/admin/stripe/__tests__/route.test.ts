/**
 * @vitest-environment node
 * Tests for Stripe admin route handlers (service-level tests)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_opts: unknown, fn: () => unknown) => fn()),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  },
}));

vi.mock('@/lib/auth/server', () => ({
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
}));

vi.mock('@/lib/security', () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/admin/stripe-admin-service', () => ({
  getDashboardData: vi.fn().mockResolvedValue({
    configured: true,
    products: [],
    subscriptions: [],
    revenue: null,
    refunds: [],
  }),
}));

vi.mock('@/lib/admin/stripe-settings-service', () => ({
  getPaymentSettings: vi.fn().mockResolvedValue({
    paymentsEnabled: false,
    updatedAt: '2024-01-01',
    updatedBy: null,
  }),
  updatePaymentSettings: vi.fn().mockResolvedValue({
    paymentsEnabled: true,
    updatedAt: '2024-01-01',
    updatedBy: 'admin-1',
  }),
}));

vi.mock('@/lib/admin/audit-service', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { validateAdminReadOnlyAuth } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/admin/audit-service';

describe('GET /api/admin/stripe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 if not admin', async () => {
    vi.mocked(validateAdminReadOnlyAuth).mockResolvedValueOnce({
      authenticated: false,
      canAccessAdminReadOnly: false,
      userId: undefined,
    } as unknown as Awaited<ReturnType<typeof validateAdminReadOnlyAuth>>);

    const req = new NextRequest('http://localhost:3000/api/admin/stripe');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should return 200 with dashboard data', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stripe');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.configured).toBe(true);
    expect(data.settings).toBeDefined();
  });
});

describe('POST /api/admin/stripe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 400 for invalid body', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should update settings and log audit action', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentsEnabled: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.paymentsEnabled).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE_PAYMENT_SETTINGS',
        entityType: 'GlobalConfig',
      }),
    );
  });
});
