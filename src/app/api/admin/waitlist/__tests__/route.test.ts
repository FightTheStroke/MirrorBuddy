/**
 * @vitest-environment node
 *
 * Unit tests for GET /api/admin/waitlist
 *
 * F-01: Paginated list of waitlist entries
 * F-02: Search by email works
 * F-03: Filter by verified status works
 * F-04: Requires admin auth (401/403 for non-admins)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock logger
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

// Mock admin auth — default to authenticated admin; override per test
vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-001',
    }),
    validateAdminReadOnlyAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      canAccessAdminReadOnly: true,
      userId: 'admin-001',
    }),
  };
});

// Mock CSRF (GET requests don't need it but keep consistent)
vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return { ...actual, requireCSRF: vi.fn().mockReturnValue(true) };
});

// Mock prisma — only waitlistEntry methods needed
vi.mock('@/lib/db', () => ({
  prisma: {
    waitlistEntry: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from '../route';
import { prisma } from '@/lib/db';
import { validateAdminAuth } from '@/lib/auth/server';

const mockFindMany = prisma.waitlistEntry.findMany as ReturnType<typeof vi.fn>;
const mockCount = prisma.waitlistEntry.count as ReturnType<typeof vi.fn>;
const mockValidateAdminAuth = validateAdminAuth as ReturnType<typeof vi.fn>;

// Representative waitlist entry fixture
const ENTRY_A = {
  id: 'entry-aaa',
  email: 'alice@example.com',
  name: 'Alice',
  locale: 'it',
  source: 'coming-soon',
  gdprConsentAt: new Date('2025-01-01T10:00:00Z'),
  gdprConsentVersion: '1.0',
  marketingConsent: true,
  marketingConsentAt: new Date('2025-01-01T10:00:00Z'),
  verificationToken: 'tok-aaa',
  verificationExpiresAt: new Date('2025-01-02T10:00:00Z'),
  verifiedAt: new Date('2025-01-01T12:00:00Z'),
  unsubscribeToken: 'unsub-aaa',
  unsubscribedAt: null,
  promoCode: 'PROMO001',
  promoRedeemedAt: null,
  convertedUserId: null,
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-01-01T12:00:00Z'),
};

const ENTRY_B = {
  id: 'entry-bbb',
  email: 'bob@example.com',
  name: 'Bob',
  locale: 'en',
  source: 'coming-soon',
  gdprConsentAt: new Date('2025-01-02T10:00:00Z'),
  gdprConsentVersion: '1.0',
  marketingConsent: false,
  marketingConsentAt: null,
  verificationToken: 'tok-bbb',
  verificationExpiresAt: new Date('2025-01-03T10:00:00Z'),
  verifiedAt: null,
  unsubscribeToken: 'unsub-bbb',
  unsubscribedAt: null,
  promoCode: null,
  promoRedeemedAt: null,
  convertedUserId: null,
  createdAt: new Date('2025-01-02T10:00:00Z'),
  updatedAt: new Date('2025-01-02T10:00:00Z'),
};

function makeRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/admin/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: admin authenticated
    mockValidateAdminAuth.mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-001',
    });
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
      userId: null,
    });

    const req = makeRequest('http://localhost/api/admin/waitlist');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated but not admin', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
      userId: 'user-999',
    });

    const req = makeRequest('http://localhost/api/admin/waitlist');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBeTruthy();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  // ── Paginated list ────────────────────────────────────────────────────────

  it('returns paginated list with default page/pageSize', async () => {
    mockFindMany.mockResolvedValueOnce([ENTRY_A, ENTRY_B]);
    mockCount.mockResolvedValueOnce(2);

    const req = makeRequest('http://localhost/api/admin/waitlist');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(2);
    expect(body.pagination).toMatchObject({
      total: 2,
      page: 1,
      pageSize: expect.any(Number),
    });
  });

  it('respects explicit page and pageSize params', async () => {
    mockFindMany.mockResolvedValueOnce([ENTRY_B]);
    mockCount.mockResolvedValueOnce(10);

    const req = makeRequest('http://localhost/api/admin/waitlist?page=2&pageSize=5');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.pageSize).toBe(5);
    expect(body.pagination.total).toBe(10);
    // skip = (2-1)*5 = 5
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
  });

  // ── Search by email ───────────────────────────────────────────────────────

  it('filters entries when search param is provided', async () => {
    mockFindMany.mockResolvedValueOnce([ENTRY_A]);
    mockCount.mockResolvedValueOnce(1);

    const req = makeRequest('http://localhost/api/admin/waitlist?search=alice');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: expect.objectContaining({ contains: 'alice' }),
        }),
      }),
    );
  });

  it('returns empty list when search matches nothing', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const req = makeRequest('http://localhost/api/admin/waitlist?search=nobody@nowhere.com');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  // ── Filter by verified ────────────────────────────────────────────────────

  it('filters verified=true — passes not-null verifiedAt to query', async () => {
    mockFindMany.mockResolvedValueOnce([ENTRY_A]);
    mockCount.mockResolvedValueOnce(1);

    const req = makeRequest('http://localhost/api/admin/waitlist?verified=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verifiedAt: { not: null },
        }),
      }),
    );
  });

  it('filters verified=false — passes null verifiedAt to query', async () => {
    mockFindMany.mockResolvedValueOnce([ENTRY_B]);
    mockCount.mockResolvedValueOnce(1);

    const req = makeRequest('http://localhost/api/admin/waitlist?verified=false');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verifiedAt: null,
        }),
      }),
    );
  });

  it('does not filter by verifiedAt when verified param absent', async () => {
    mockFindMany.mockResolvedValueOnce([ENTRY_A, ENTRY_B]);
    mockCount.mockResolvedValueOnce(2);

    const req = makeRequest('http://localhost/api/admin/waitlist');
    await GET(req);

    const callArg = mockFindMany.mock.calls[0][0] as { where?: Record<string, unknown> };
    expect(callArg.where?.verifiedAt).toBeUndefined();
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns 500 on database error', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB connection lost'));

    const req = makeRequest('http://localhost/api/admin/waitlist');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
  });
});
