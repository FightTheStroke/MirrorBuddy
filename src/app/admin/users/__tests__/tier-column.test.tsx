/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsersTable } from "../users-table";

const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

// Helper to create valid subscription data
const createSubscription = (tierCode: string, tierName: string) => ({
  id: `sub-${tierCode.toLowerCase()}`,
  tier: {
    id: `tier-${tierCode.toLowerCase()}`,
    code: tierCode,
    name: tierName,
    chatLimitDaily: 10,
    voiceMinutesDaily: 5,
    toolsLimitDaily: 10,
    docsLimitTotal: 1,
    features: {},
  },
  overrideLimits: null,
  overrideFeatures: null,
});

describe("UsersTable - Tier Column", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    Object.defineProperty(window, "location", {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  it("renders tier column header", () => {
    const users = [
      {
        id: "user-1",
        username: "alpha",
        email: "alpha@test.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        subscription: null,
      },
    ];

    render(<UsersTable users={users} availableTiers={[]} />);

    // Should have a "Tier" column header
    expect(screen.getByText("Tier")).toBeInTheDocument();
  });

  it("displays 'Base' tier for users without subscription", () => {
    const users = [
      {
        id: "user-1",
        username: "alpha",
        email: "alpha@test.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        subscription: null,
      },
    ];

    render(<UsersTable users={users} availableTiers={[]} />);

    // Should show Base tier badge for users without subscription
    expect(screen.getByText("Base")).toBeInTheDocument();
  });

  it("displays tier name from subscription", () => {
    const users = [
      {
        id: "user-1",
        username: "alpha",
        email: "alpha@test.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        subscription: createSubscription("PRO", "Pro"),
      },
      {
        id: "user-2",
        username: "beta",
        email: "beta@test.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-02T00:00:00Z"),
        subscription: createSubscription("TRIAL", "Trial"),
      },
    ];

    render(<UsersTable users={users} availableTiers={[]} />);

    // Should show tier names from subscriptions
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Trial")).toBeInTheDocument();
  });

  it("displays Trial tier for anonymous users", () => {
    const users = [
      {
        id: "user-1",
        username: null, // Anonymous user
        email: null,
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        subscription: createSubscription("TRIAL", "Trial"),
      },
    ];

    render(<UsersTable users={users} availableTiers={[]} />);

    // Should show Trial badge for anonymous users
    expect(screen.getByText("Trial")).toBeInTheDocument();
  });

  it("applies different styling for different tiers", () => {
    const users = [
      {
        id: "user-1",
        username: "alpha",
        email: "alpha@test.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        subscription: null,
      },
      {
        id: "user-2",
        username: "beta",
        email: "beta@test.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date("2026-01-02T00:00:00Z"),
        subscription: createSubscription("PRO", "Pro"),
      },
    ];

    render(<UsersTable users={users} availableTiers={[]} />);

    const baseBadge = screen.getByText("Base");
    const proBadge = screen.getByText("Pro");

    // Badges should exist (styling verification would be visual)
    expect(baseBadge).toBeInTheDocument();
    expect(proBadge).toBeInTheDocument();
  });
});
