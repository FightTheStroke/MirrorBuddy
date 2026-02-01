/**
 * Tests for POST /api/onboarding - User creation with Base tier subscription
 * Plan 073: T4-07 - Update registration flow: default to Base tier
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../handlers";
import { NextRequest } from "next/server";

// Mock Prisma and helper
const mockUserCreate = vi.fn();
const mockOnboardingStateUpsert = vi.fn();
const mockProfileUpsert = vi.fn();
const mockAssignBaseTierToNewUser = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: () => mockUserCreate(),
    },
    onboardingState: {
      upsert: () => mockOnboardingStateUpsert(),
    },
    profile: {
      upsert: () => mockProfileUpsert(),
    },
  },
  isDatabaseNotInitialized: vi.fn(() => false),
}));

vi.mock("@/lib/tier/registration-helper", () => ({
  assignBaseTierToNewUser: (userId: string) =>
    mockAssignBaseTierToNewUser(userId),
}));

// Mock dependencies
vi.mock("@/lib/auth/session-auth", () => ({
  validateAuth: vi.fn(),
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn(() => true),
}));

vi.mock("@/lib/auth/cookie-signing", () => ({
  signCookieValue: vi.fn(() => ({ signed: "signed-value", raw: "raw-value" })),
}));

// Track cookies that are set
const mockCookiesSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: (...args: unknown[]) => mockCookiesSet(...args),
    }),
  ),
}));

vi.mock("@/lib/helpers/publish-admin-counts", () => ({
  calculateAndPublishAdminCounts: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/compliance/coppa-service", () => ({
  COPPA_AGE_THRESHOLD: 13,
  requestParentalConsent: vi.fn(() =>
    Promise.resolve({
      emailSent: true,
      expiresAt: new Date(),
    }),
  ),
  checkCoppaStatus: vi.fn(() =>
    Promise.resolve({
      consentGranted: false,
      consentPending: false,
    }),
  ),
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

describe("POST /api/onboarding - Base tier assignment on registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create UserSubscription with Base tier when new user registers via onboarding", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      userId: null,
    });

    const mockUser = {
      id: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserCreate.mockResolvedValue(mockUser);
    mockAssignBaseTierToNewUser.mockResolvedValue({
      id: "sub-123",
      tierId: "tier-base-123",
    });
    mockOnboardingStateUpsert.mockResolvedValue({
      userId: mockUser.id,
      hasCompletedOnboarding: false,
      currentStep: "welcome",
    });

    const requestData = {
      data: {
        name: "Test User",
        age: 15,
        schoolLevel: "superiore" as const,
      },
      hasCompletedOnboarding: false,
      currentStep: "welcome" as const,
      isReplayMode: false,
    };

    const mockRequest = new Request("http://localhost:3000/api/onboarding", {
      method: "POST",
      headers: { "x-csrf-token": "valid-token" },
      body: JSON.stringify(requestData),
    });

    // Call the endpoint
    const response = (await POST(mockRequest as any)) as unknown as Response;
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUserCreate).toHaveBeenCalled();
    expect(mockAssignBaseTierToNewUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("should not create duplicate subscription for existing user", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");

    const mockUser = {
      id: "user-existing",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: mockUser.id,
    });

    mockOnboardingStateUpsert.mockResolvedValue({
      userId: mockUser.id,
      hasCompletedOnboarding: false,
      currentStep: "profile",
    });

    const _mockRequest = {
      headers: new Headers({ "x-csrf-token": "valid-token" }),
    } as NextRequest;

    const requestData = {
      data: {
        name: "Existing User",
        age: 15,
        schoolLevel: "superiore" as const,
      },
      hasCompletedOnboarding: false,
      currentStep: "profile" as const,
      isReplayMode: false,
    };

    const request = new Request("http://localhost:3000/api/onboarding", {
      method: "POST",
      headers: { "x-csrf-token": "valid-token" },
      body: JSON.stringify(requestData),
    });

    await POST(request as any);

    // Verify assignBaseTier was not called for existing users
    expect(mockAssignBaseTierToNewUser).not.toHaveBeenCalled();
  });

  it("should set both httpOnly and client-readable cookies for new user", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      userId: null,
    });

    const mockUser = {
      id: "user-cookie-test",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserCreate.mockResolvedValue(mockUser);
    mockAssignBaseTierToNewUser.mockResolvedValue({
      id: "sub-123",
      tierId: "tier-base-123",
    });
    mockOnboardingStateUpsert.mockResolvedValue({
      userId: mockUser.id,
      hasCompletedOnboarding: false,
      currentStep: "welcome",
    });

    const requestData = {
      data: {
        name: "Cookie Test User",
        age: 15,
        schoolLevel: "superiore" as const,
      },
      hasCompletedOnboarding: false,
      currentStep: "welcome" as const,
      isReplayMode: false,
    };

    const request = new Request("http://localhost:3000/api/onboarding", {
      method: "POST",
      headers: { "x-csrf-token": "valid-token" },
      body: JSON.stringify(requestData),
    });

    await POST(request as any);

    // CRITICAL: Both cookies must be set
    const cookieCalls = mockCookiesSet.mock.calls;
    const cookieNames = cookieCalls.map((call) => call[0]);

    expect(cookieNames).toContain("mirrorbuddy-user-id");
    expect(cookieNames).toContain("mirrorbuddy-user-id-client");

    // Verify httpOnly cookie is signed
    const httpOnlyCall = cookieCalls.find(
      (call) => call[0] === "mirrorbuddy-user-id",
    );
    expect(httpOnlyCall?.[1]).toBe("signed-value");
    expect(httpOnlyCall?.[2]?.httpOnly).toBe(true);

    // Verify client cookie is user id (not signed)
    const clientCall = cookieCalls.find(
      (call) => call[0] === "mirrorbuddy-user-id-client",
    );
    expect(clientCall?.[1]).toBe("user-cookie-test");
    expect(clientCall?.[2]?.httpOnly).toBe(false);
  });

  it("should handle missing Base tier gracefully", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      userId: null,
    });

    const mockUser = {
      id: "user-456",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserCreate.mockResolvedValue(mockUser);
    mockAssignBaseTierToNewUser.mockResolvedValue(null); // Null indicates tier assignment failed
    mockOnboardingStateUpsert.mockResolvedValue({
      userId: mockUser.id,
      hasCompletedOnboarding: false,
      currentStep: "welcome",
    });

    const _mockRequest = {
      headers: new Headers({ "x-csrf-token": "valid-token" }),
    } as NextRequest;

    const requestData = {
      data: {
        name: "Test User",
        age: 15,
        schoolLevel: "superiore" as const,
      },
      hasCompletedOnboarding: false,
      currentStep: "welcome" as const,
      isReplayMode: false,
    };

    const request = new Request("http://localhost:3000/api/onboarding", {
      method: "POST",
      headers: { "x-csrf-token": "valid-token" },
      body: JSON.stringify(requestData),
    });

    // Should not crash
    const response = (await POST(request as any)) as unknown as Response;
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify user was created even without subscription
    expect(mockUserCreate).toHaveBeenCalled();
    expect(mockAssignBaseTierToNewUser).toHaveBeenCalledWith(mockUser.id);
  });
});
