/**
 * Unit tests for Resend Email Quota API
 * Tests F-05 (real-time metrics) and F-22 (automated limit queries)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getResendLimits,
  clearResendLimitsCache,
  isEmailQuotaStressed,
  getEmailQuotaReport,
  type ResendLimits,
} from '../resend-limits';
import { generateEmailsInRange } from './helpers/email-factory';

/** Helper: mock fetch to return a given email list */
function mockFetchEmails(emails: Array<{ id: string; created_at: string }>) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: emails }),
  });
}

describe('Resend Limits API', () => {
  beforeEach(() => {
    // Stabilize time-dependent tests (daily/monthly windows) to avoid CI flakes around midnight.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T12:00:00.000Z'));

    clearResendLimitsCache();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns error when RESEND_API_KEY is missing', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const limits = await getResendLimits();

    expect(limits.error).toBe('RESEND_API_KEY not configured');
    expect(limits.emailsToday.used).toBe(0);
    expect(limits.emailsToday.limit).toBe(100); // Free tier fallback
    expect(limits.emailsMonth.used).toBe(0);
    expect(limits.emailsMonth.limit).toBe(3000); // Free tier fallback

    process.env.RESEND_API_KEY = originalKey;
  });

  it('returns typed ResendLimits interface', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetchEmails([]);

    const limits: ResendLimits = await getResendLimits();

    expect(limits).toHaveProperty('emailsToday');
    expect(limits).toHaveProperty('emailsMonth');
    expect(limits).toHaveProperty('timestamp');

    expect(limits.emailsToday).toHaveProperty('used');
    expect(limits.emailsToday).toHaveProperty('limit');
    expect(limits.emailsToday).toHaveProperty('percent');

    expect(limits.emailsMonth).toHaveProperty('used');
    expect(limits.emailsMonth).toHaveProperty('limit');
    expect(limits.emailsMonth).toHaveProperty('percent');

    expect(typeof limits.emailsToday.used).toBe('number');
    expect(typeof limits.emailsToday.limit).toBe('number');
    expect(typeof limits.emailsToday.percent).toBe('number');
    expect(typeof limits.emailsMonth.limit).toBe('number');
  });

  it('sets daily limit to 100 emails', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetchEmails([]);

    const limits = await getResendLimits();

    expect(limits.emailsToday.limit).toBe(100);
  });

  it('sets monthly limit to 3000 emails', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetchEmails([]);

    const limits = await getResendLimits();

    expect(limits.emailsMonth.limit).toBe(3000);
  });

  it('caches results for 5 minutes (F-22)', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    global.fetch = fetchMock;

    // First call - should fetch
    const limits1 = await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const limits2 = await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(limits1.timestamp).toBe(limits2.timestamp);
  });

  it('calculates daily usage percentage correctly', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mockFetchEmails(generateEmailsInRange(50, startOfDay, now));

    clearResendLimitsCache();
    const limits = await getResendLimits();

    expect(limits.emailsToday.used).toBe(50);
    expect(limits.emailsToday.percent).toBeCloseTo(50, 1);
  });

  it('calculates monthly usage percentage correctly', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    mockFetchEmails(generateEmailsInRange(1500, startOfMonth, now));

    clearResendLimitsCache();
    const limits = await getResendLimits();

    expect(limits.emailsMonth.used).toBe(1500);
    expect(limits.emailsMonth.percent).toBeCloseTo(50, 1);
  });

  it('handles API errors gracefully', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const limits = await getResendLimits();

    expect(limits.error).toBeDefined();
    expect(limits.emailsToday.used).toBe(0);
    expect(limits.emailsMonth.used).toBe(0);
  });

  it('handles network errors gracefully', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const limits = await getResendLimits();

    expect(limits.error).toBeDefined();
    expect(limits.emailsToday.used).toBe(0);
  });

  it('clears cache when clearResendLimitsCache is called', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    global.fetch = fetchMock;

    await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clearResendLimitsCache();

    await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('detects quota stress at 80% threshold', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mockFetchEmails(generateEmailsInRange(85, startOfDay, now));

    clearResendLimitsCache();
    const stressed = await isEmailQuotaStressed(80);

    expect(stressed).toBe(true);
  });

  it('does not detect stress below threshold', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mockFetchEmails(generateEmailsInRange(70, startOfDay, now));

    clearResendLimitsCache();
    const stressed = await isEmailQuotaStressed(80);

    expect(stressed).toBe(false);
  });

  it('generates readable quota report', async () => {
    process.env.RESEND_API_KEY = 'test-key';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mockFetchEmails(generateEmailsInRange(30, startOfDay, now));

    clearResendLimitsCache();
    const report = await getEmailQuotaReport();

    expect(report).toContain('Daily');
    expect(report).toContain('Monthly');
    expect(report).toContain('30/100');
    expect(report).toContain('30.0%');
  });
});
