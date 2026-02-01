/**
 * Tests for GET /api/user - User creation with Base tier subscription
 * Plan 073: T4-07 - Update registration flow: default to Base tier
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";

// Mock Prisma and helper
const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockAssignBaseTierToNewUser = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: () => mockUserCreate(),
      findUnique: () => mockUserFindUnique(),
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

vi.mock("@/lib/auth/cookie-signing", () => ({
  signCookieValue: vi.fn(() => ({ signed: "signed-value", raw: "raw-value" })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: vi.fn(),
    }),
  ),
}));

vi.mock("@/lib/helpers/publish-admin-counts", () => ({
  calculateAndPublishAdminCounts: vi.fn(() => Promise.resolve()),
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

describe("GET /api/user - Base tier assignment on registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create UserSubscription with Base tier when new user registers", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      userId: null,
    });

    const mockUser = {
      id: "user-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {},
      settings: {},
      progress: {},
    };

    mockUserCreate.mockResolvedValue(mockUser);
    mockAssignBaseTierToNewUser.mockResolvedValue({
      id: "sub-123",
      tierId: "tier-base-123",
    });

    // Call the endpoint
    const response = await GET();
    const data = await response.json();

    // Verify user was created
    expect(data).toHaveProperty("id");
    expect(mockUserCreate).toHaveBeenCalled();
    expect(mockAssignBaseTierToNewUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("should not create duplicate subscription if user already has one", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");

    const mockUser = {
      id: "user-existing",
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {},
      settings: {},
      progress: {},
    };

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: mockUser.id,
    });

    mockUserFindUnique.mockResolvedValue(mockUser);

    // Call the endpoint
    await GET();

    // Verify assignBaseTier was not called for existing users
    expect(mockAssignBaseTierToNewUser).not.toHaveBeenCalled();
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
      profile: {},
      settings: {},
      progress: {},
    };

    mockUserCreate.mockResolvedValue(mockUser);
    mockAssignBaseTierToNewUser.mockResolvedValue(null); // Null indicates tier assignment failed

    // Call the endpoint - should not crash
    const response = await GET();
    const data = await response.json();

    // Verify user was created even without subscription
    expect(data).toHaveProperty("id");
    expect(mockUserCreate).toHaveBeenCalled();
    expect(mockAssignBaseTierToNewUser).toHaveBeenCalledWith(mockUser.id);
  });
});
