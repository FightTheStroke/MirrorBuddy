/**
 * Waitlist Cleanup Cron Job Tests
 *
 * Tests for POST /api/cron/waitlist-cleanup
 * Deletes unverified WaitlistEntry records older than 90 days.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist shared mocks so they're available inside vi.mock() factories
const { mockChildInfo, mockDeleteMany: _mockDeleteMany } = vi.hoisted(() => ({
  mockChildInfo: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    waitlistEntry: {
      deleteMany: _mockDeleteMany,
    },
  },
}));

// Mock logger - child returns a logger with the shared mockChildInfo
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: mockChildInfo,
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Import after mocks
import { POST } from '../route';
import { prisma } from '@/lib/db';

const mockDeleteMany = prisma.waitlistEntry.deleteMany as Mock;

describe('POST /api/cron/waitlist-cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret-123';
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  it('should reject request without authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should reject request with invalid CRON_SECRET', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should accept request with correct CRON_SECRET', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret-123' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('should delete unverified entries older than 90 days', async () => {
    mockDeleteMany.mockResolvedValue({ count: 5 });

    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret-123' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(5);

    // Verify deleteMany was called with correct filters
    expect(mockDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verifiedAt: null,
          createdAt: expect.objectContaining({
            lt: expect.any(Date),
          }),
        }),
      }),
    );

    // Verify the cutoff date is approximately 90 days ago
    const callArgs = mockDeleteMany.mock.calls[0][0];
    const cutoffDate: Date = callArgs.where.createdAt.lt;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const diffMs = Math.abs(cutoffDate.getTime() - ninetyDaysAgo.getTime());
    expect(diffMs).toBeLessThan(5000); // within 5 seconds
  });

  it('should return deleted count in response', async () => {
    mockDeleteMany.mockResolvedValue({ count: 12 });

    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret-123' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('deleted', 12);
    expect(data).toHaveProperty('success', true);
  });

  it('should log count of deleted entries', async () => {
    mockDeleteMany.mockResolvedValue({ count: 3 });

    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret-123' },
    });

    await POST(request);

    // Verify child logger was called with deleted count
    expect(mockChildInfo).toHaveBeenCalledWith(
      expect.stringContaining('deleted'),
      expect.objectContaining({ deleted: 3 }),
    );
  });

  it('should return 500 on database error', async () => {
    mockDeleteMany.mockRejectedValue(new Error('DB connection failed'));

    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret-123' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should work with GET method (Vercel Cron uses GET)', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/waitlist-cleanup', {
      method: 'GET',
      headers: { authorization: 'Bearer test-cron-secret-123' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
