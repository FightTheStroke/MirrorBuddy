/**
 * @vitest-environment node
 *
 * Regression test for Bug 2: createEmptyLimits must return free tier
 * limits as fallback, NOT zeros (which causes "Insufficient email quota").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getResendLimits, clearResendLimitsCache } from "../resend-limits";

describe("Resend Limits - fallback values (regression)", () => {
  const EXPECTED_DAILY_LIMIT = 100;
  const EXPECTED_MONTHLY_LIMIT = 3000;

  beforeEach(() => {
    clearResendLimitsCache();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns free tier limits when API key is missing", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const limits = await getResendLimits();

    expect(limits.error).toBeDefined();
    expect(limits.emailsToday.limit).toBe(EXPECTED_DAILY_LIMIT);
    expect(limits.emailsMonth.limit).toBe(EXPECTED_MONTHLY_LIMIT);
    // Used should still be 0 (unknown usage is safest as 0)
    expect(limits.emailsToday.used).toBe(0);
    expect(limits.emailsMonth.used).toBe(0);

    process.env.RESEND_API_KEY = originalKey;
  });

  it("returns free tier limits when API call fails", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "test-key";

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const limits = await getResendLimits();

    expect(limits.error).toBeDefined();
    expect(limits.emailsToday.limit).toBe(EXPECTED_DAILY_LIMIT);
    expect(limits.emailsMonth.limit).toBe(EXPECTED_MONTHLY_LIMIT);
    expect(limits.emailsToday.used).toBe(0);
    expect(limits.emailsMonth.used).toBe(0);

    process.env.RESEND_API_KEY = originalKey;
  });

  it("never returns limit: 0 which would block all sends", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const limits = await getResendLimits();

    expect(limits.emailsToday.limit).toBeGreaterThan(0);
    expect(limits.emailsMonth.limit).toBeGreaterThan(0);

    process.env.RESEND_API_KEY = originalKey;
  });
});
