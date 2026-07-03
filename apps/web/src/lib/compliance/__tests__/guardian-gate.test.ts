/**
 * @vitest-environment node
 * Unit tests for the guardian gate (T1.6, D-11)
 *
 * Verifies server-side minor protection for payment endpoints:
 * - Minor without parental consent → blocked + audit event
 * - Adult → allowed
 * - Consented minor → allowed
 * - Unknown age → allowed (fail-open, mirrors checkCoppaStatus convention)
 * - DB error → blocked (fail-closed, mirrors checkCoppaStatus convention)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const { createMockPrisma } = await import("@/test/mocks/prisma");
  return { prisma: createMockPrisma() };
});

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  isEmailConfigured: () => false,
}));

vi.mock("@/lib/logger", () => ({
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

const { mockRecordComplianceEvent } = vi.hoisted(() => ({
  mockRecordComplianceEvent: vi.fn(),
}));

vi.mock("@/lib/safety/server", () => ({
  recordComplianceEvent: mockRecordComplianceEvent,
}));

import { prisma } from "@/lib/db";
import type { MockPrisma } from "@/test/mocks/prisma";
import {
  assertNotUnconsentedMinor,
  guardianRequiredResponse,
  GUARDIAN_REQUIRED_CODE,
} from "../guardian-gate";

const mockPrisma = prisma as unknown as MockPrisma;

describe("assertNotUnconsentedMinor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a minor without parental consent", async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 10 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce(null);

    const result = await assertNotUnconsentedMinor(
      "user_minor_1",
      "/api/checkout",
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("guardian_consent_missing");
  });

  it("records a compliance audit event on refusal without raw userId (no PII)", async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 12 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce({
      consentGranted: false,
      consentGrantedAt: null,
      verificationSentAt: null,
      verificationExpiresAt: null,
    });

    await assertNotUnconsentedMinor("user_minor_2", "/api/billing/portal");

    expect(mockRecordComplianceEvent).toHaveBeenCalledTimes(1);
    const [eventType, options] = mockRecordComplianceEvent.mock.calls[0];
    expect(eventType).toBe("guardrail_triggered");
    expect(options.outcome).toBe("blocked");
    expect(options.ageGroup).toBe("child");
    expect(options.regulatoryContext).toMatchObject({ coppa: true });
    // No PII in audit payload
    expect(JSON.stringify(options)).not.toContain("user_minor_2");
  });

  it("allows an adult account", async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 35 });

    const result = await assertNotUnconsentedMinor(
      "user_adult",
      "/api/checkout",
    );

    expect(result.allowed).toBe(true);
    expect(mockRecordComplianceEvent).not.toHaveBeenCalled();
    // Adult: no consent lookup needed
    expect(mockPrisma.coppaConsent.findUnique).not.toHaveBeenCalled();
  });

  it("allows a minor WITH granted parental consent", async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 11 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce({
      consentGranted: true,
      consentGrantedAt: new Date(),
      verificationSentAt: new Date(),
      verificationExpiresAt: null,
    });

    const result = await assertNotUnconsentedMinor(
      "user_consented_minor",
      "/api/checkout",
    );

    expect(result.allowed).toBe(true);
    expect(mockRecordComplianceEvent).not.toHaveBeenCalled();
  });

  it("allows unknown age (fail-open, mirrors checkCoppaStatus: requiresConsent = age !== null && age < 13)", async () => {
    // No profile row at all
    mockPrisma.profile.findUnique.mockResolvedValueOnce(null);

    const result = await assertNotUnconsentedMinor(
      "user_no_profile",
      "/api/checkout",
    );

    expect(result.allowed).toBe(true);
    expect(mockRecordComplianceEvent).not.toHaveBeenCalled();
  });

  it("allows profile with null age (fail-open convention)", async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: null });

    const result = await assertNotUnconsentedMinor(
      "user_null_age",
      "/api/billing/portal",
    );

    expect(result.allowed).toBe(true);
  });

  it("blocks on DB error (fail-closed, mirrors checkCoppaStatus error path)", async () => {
    mockPrisma.profile.findUnique.mockRejectedValueOnce(
      new Error("db unavailable"),
    );

    const result = await assertNotUnconsentedMinor(
      "user_db_error",
      "/api/checkout",
    );

    expect(result.allowed).toBe(false);
  });
});

describe("guardianRequiredResponse", () => {
  it("returns 403 with GUARDIAN_REQUIRED code", async () => {
    const res = guardianRequiredResponse();
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.code).toBe(GUARDIAN_REQUIRED_CODE);
    expect(body.code).toBe("GUARDIAN_REQUIRED");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});
