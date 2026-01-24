/**
 * Unit tests for Resend Email Quota API
 * Tests F-05 (real-time metrics) and F-22 (automated limit queries)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getResendLimits,
  clearResendLimitsCache,
  isEmailQuotaStressed,
  getEmailQuotaReport,
  type ResendLimits,
} from "../resend-limits";

describe("Resend Limits API", () => {
  beforeEach(() => {
    clearResendLimitsCache();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns error when RESEND_API_KEY is missing", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const limits = await getResendLimits();

    expect(limits.error).toBe("RESEND_API_KEY not configured");
    expect(limits.emailsToday.used).toBe(0);
    expect(limits.emailsToday.limit).toBe(0);
    expect(limits.emailsMonth.used).toBe(0);
    expect(limits.emailsMonth.limit).toBe(0);

    process.env.RESEND_API_KEY = originalKey;
  });

  it("returns typed ResendLimits interface", async () => {
    process.env.RESEND_API_KEY = "test-key";

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    const limits: ResendLimits = await getResendLimits();

    expect(limits).toHaveProperty("emailsToday");
    expect(limits).toHaveProperty("emailsMonth");
    expect(limits).toHaveProperty("timestamp");

    expect(limits.emailsToday).toHaveProperty("used");
    expect(limits.emailsToday).toHaveProperty("limit");
    expect(limits.emailsToday).toHaveProperty("percent");

    expect(limits.emailsMonth).toHaveProperty("used");
    expect(limits.emailsMonth).toHaveProperty("limit");
    expect(limits.emailsMonth).toHaveProperty("percent");

    expect(typeof limits.emailsToday.used).toBe("number");
    expect(typeof limits.emailsToday.limit).toBe("number");
    expect(typeof limits.emailsToday.percent).toBe("number");
    expect(typeof limits.emailsMonth.limit).toBe("number");
  });

  it("sets daily limit to 100 emails", async () => {
    process.env.RESEND_API_KEY = "test-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    const limits = await getResendLimits();

    expect(limits.emailsToday.limit).toBe(100);
  });

  it("sets monthly limit to 3000 emails", async () => {
    process.env.RESEND_API_KEY = "test-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    const limits = await getResendLimits();

    expect(limits.emailsMonth.limit).toBe(3000);
  });

  it("caches results for 5 minutes (F-22)", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    global.fetch = fetchMock;

    // First call - should fetch
    const limits1 = await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const limits2 = await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1, no new call

    // Results should be identical (same timestamp)
    expect(limits1.timestamp).toBe(limits2.timestamp);
  });

  it("calculates daily usage percentage correctly", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Mock 50 emails today - spread across the day from start of day to now
    const timeRange = now.getTime() - startOfDay.getTime();
    const interval = Math.max(1000, timeRange / 51);

    const emailsToday = Array(50)
      .fill(null)
      .map((_, i) => ({
        id: `email-${i}`,
        created_at: new Date(
          startOfDay.getTime() + (i + 1) * interval,
        ).toISOString(),
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: emailsToday,
      }),
    });

    clearResendLimitsCache();
    const limits = await getResendLimits();

    // 50 / 100 = 50%
    expect(limits.emailsToday.used).toBe(50);
    expect(limits.emailsToday.percent).toBeCloseTo(50, 1);
  });

  it("calculates monthly usage percentage correctly", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Mock 1500 emails this month
    const emailsMonth = Array(1500)
      .fill(null)
      .map((_, i) => ({
        id: `email-${i}`,
        created_at: new Date(startOfMonth.getTime() + i * 60000).toISOString(),
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: emailsMonth,
      }),
    });

    clearResendLimitsCache();
    const limits = await getResendLimits();

    // 1500 / 3000 = 50%
    expect(limits.emailsMonth.used).toBe(1500);
    expect(limits.emailsMonth.percent).toBeCloseTo(50, 1);
  });

  it("handles API errors gracefully", async () => {
    process.env.RESEND_API_KEY = "test-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const limits = await getResendLimits();

    expect(limits.error).toBeDefined();
    expect(limits.emailsToday.used).toBe(0);
    expect(limits.emailsMonth.used).toBe(0);
  });

  it("handles network errors gracefully", async () => {
    process.env.RESEND_API_KEY = "test-key";

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const limits = await getResendLimits();

    expect(limits.error).toBeDefined();
    expect(limits.emailsToday.used).toBe(0);
  });

  it("clears cache when clearResendLimitsCache is called", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    global.fetch = fetchMock;

    // First call
    await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Clear cache
    clearResendLimitsCache();

    // Second call - should fetch again
    await getResendLimits();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("detects quota stress at 80% threshold", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Mock 85 emails today (85% of 100) - spread across the day from start of day to now
    const timeRange = now.getTime() - startOfDay.getTime();
    const interval = Math.max(1000, timeRange / 86);

    const emailsToday = Array(85)
      .fill(null)
      .map((_, i) => ({
        id: `email-${i}`,
        created_at: new Date(
          startOfDay.getTime() + (i + 1) * interval,
        ).toISOString(),
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: emailsToday,
      }),
    });

    clearResendLimitsCache();
    const stressed = await isEmailQuotaStressed(80);

    expect(stressed).toBe(true);
  });

  it("does not detect stress below threshold", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Mock 70 emails today (70% of 100) - spread across the day from start of day to now
    const timeRange = now.getTime() - startOfDay.getTime();
    const interval = Math.max(1000, timeRange / 71);

    const emailsToday = Array(70)
      .fill(null)
      .map((_, i) => ({
        id: `email-${i}`,
        created_at: new Date(
          startOfDay.getTime() + (i + 1) * interval,
        ).toISOString(),
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: emailsToday,
      }),
    });

    clearResendLimitsCache();
    const stressed = await isEmailQuotaStressed(80);

    expect(stressed).toBe(false);
  });

  it("generates readable quota report", async () => {
    process.env.RESEND_API_KEY = "test-key";

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Mock 30 emails today - spread across the day from start of day to now
    // This ensures all emails fall within "today" regardless of when the test runs
    const timeRange = now.getTime() - startOfDay.getTime();
    const interval = Math.max(1000, timeRange / 31); // At least 1 second apart, spread across available time

    const emailsToday = Array(30)
      .fill(null)
      .map((_, i) => ({
        id: `email-${i}`,
        created_at: new Date(
          startOfDay.getTime() + (i + 1) * interval,
        ).toISOString(),
      }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: emailsToday,
      }),
    });

    clearResendLimitsCache();
    const report = await getEmailQuotaReport();

    expect(report).toContain("Daily");
    expect(report).toContain("Monthly");
    expect(report).toContain("30/100");
    expect(report).toContain("30.0%");
  });
});
