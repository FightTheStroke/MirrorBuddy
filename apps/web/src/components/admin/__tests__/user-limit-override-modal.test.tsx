/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserLimitOverrideModal } from "../user-limit-override-modal";

const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "@/components/ui/toast";

describe("UserLimitOverrideModal", () => {
  const mockUser = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    subscription: {
      id: "sub-123",
      tier: {
        id: "tier-pro",
        code: "PRO",
        name: "Pro",
        chatLimitDaily: 50,
        voiceMinutesDaily: 30,
        toolsLimitDaily: 20,
        docsLimitTotal: 10,
        features: {
          flashcards: true,
          quizzes: true,
          mindMaps: false,
          parentDashboard: false,
        },
      },
      overrideLimits: null,
      overrideFeatures: null,
    },
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <UserLimitOverrideModal
        isOpen={false}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    expect(screen.queryByText("Override User Limits")).not.toBeInTheDocument();
  });

  it("renders modal with user information", () => {
    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    expect(screen.getByText("Override User Limits")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("displays tier default values", () => {
    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    expect(screen.getByText("Default: 50")).toBeInTheDocument(); // chatLimitDaily
    expect(screen.getByText("Default: 30")).toBeInTheDocument(); // voiceMinutesDaily
    expect(screen.getByText("Default: 20")).toBeInTheDocument(); // toolsLimitDaily
    expect(screen.getByText("Default: 10")).toBeInTheDocument(); // docsLimitTotal
  });

  it("closes modal when Cancel is clicked", () => {
    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes modal on Escape key", () => {
    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("submits override values successfully", async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />,
    );

    // Change a limit value
    const chatLimitInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(chatLimitInput, { target: { value: "100" } });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /save overrides/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/admin/subscriptions/sub-123",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("100"),
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Overrides updated successfully",
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("handles API error gracefully", async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to update" }),
    });

    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /save overrides/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Error updating overrides",
        "Failed to update",
      );
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("displays existing overrides", () => {
    const userWithOverrides = {
      ...mockUser,
      subscription: {
        ...mockUser.subscription!,
        overrideLimits: {
          chatLimitDaily: 75,
          voiceMinutesDaily: 45,
        },
        overrideFeatures: {
          mindMaps: true,
        },
      },
    };

    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={userWithOverrides}
      />,
    );

    const chatLimitInput = screen.getAllByRole("spinbutton")[0];
    expect(chatLimitInput).toHaveValue(75);

    const voiceMinutesInput = screen.getAllByRole("spinbutton")[1];
    expect(voiceMinutesInput).toHaveValue(45);
  });

  it("does not render if user has no subscription", () => {
    const userWithoutSubscription = {
      ...mockUser,
      subscription: null,
    };

    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={userWithoutSubscription}
      />,
    );

    // Modal should not render if subscription is null
    expect(screen.queryByText("Override User Limits")).not.toBeInTheDocument();
  });

  it("sends null for empty override values", async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />,
    );

    // Submit without changing any values
    const submitButton = screen.getByRole("button", {
      name: /save overrides/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const callArgs = mockCsrfFetch.mock.calls[0][1];
      const bodyData = JSON.parse(callArgs.body);

      // Should send null when no overrides are set
      expect(bodyData.overrideLimits).toBeNull();
      expect(bodyData.overrideFeatures).toBeNull();
    });
  });

  it("displays effective limits section with tier defaults", () => {
    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    expect(screen.getByText("Effective Limits")).toBeInTheDocument();
    expect(screen.getByText("Tier Defaults")).toBeInTheDocument();

    // Effective limits should show default values when no overrides exist (displayed as Chat: 50, etc.)
    const effectiveSection = screen
      .getByText("Effective Limits")
      .closest("div");
    expect(effectiveSection?.textContent).toContain("50");
    expect(effectiveSection?.textContent).toContain("30");
    expect(effectiveSection?.textContent).toContain("20");
    expect(effectiveSection?.textContent).toContain("10");
  });

  it("shows visual indicator when override differs from default", () => {
    const userWithOverrides = {
      ...mockUser,
      subscription: {
        ...mockUser.subscription!,
        overrideLimits: {
          chatLimitDaily: 100,
        },
      },
    };

    const { container } = render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={userWithOverrides}
      />,
    );

    // Should show override indicator badge for chat (100)
    const badges = container.querySelectorAll("[data-testid='override-badge']");
    expect(badges.length).toBe(1); // Only one override badge for chat

    // Find the effective limits section
    const effectiveSection = screen
      .getByText("Effective Limits")
      .closest("div");
    expect(effectiveSection?.textContent).toContain("100");
  });

  it("updates effective limits in real-time when override value changes", async () => {
    const { container } = render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    const chatLimitInput = screen.getAllByRole("spinbutton")[0];

    // Change the value
    fireEvent.change(chatLimitInput, { target: { value: "75" } });

    await waitFor(() => {
      const effectiveSection = screen
        .getByText("Effective Limits")
        .closest("div");
      expect(effectiveSection?.textContent).toContain("75");

      // Should also have override badge now
      const badges = container.querySelectorAll(
        "[data-testid='override-badge']",
      );
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows comparison view with both tier defaults and effective values side-by-side", () => {
    render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
    );

    // Section headers
    expect(screen.getByText("Tier Defaults")).toBeInTheDocument();
    expect(screen.getByText("Effective Limits")).toBeInTheDocument();

    // Both sections should be visible with their values
    const tierSection = screen.getByText("Tier Defaults").closest("div");
    expect(tierSection?.textContent).toContain("50");

    const effectiveSection = screen
      .getByText("Effective Limits")
      .closest("div");
    expect(effectiveSection?.textContent).toContain("50");
  });

  it("displays override badge with distinct visual styling", () => {
    const userWithOverrides = {
      ...mockUser,
      subscription: {
        ...mockUser.subscription!,
        overrideLimits: {
          chatLimitDaily: 200,
          voiceMinutesDaily: 60,
        },
      },
    };

    const { container } = render(
      <UserLimitOverrideModal
        isOpen={true}
        onClose={mockOnClose}
        user={userWithOverrides}
      />,
    );

    // Find badge elements
    const badges = container.querySelectorAll("[data-testid='override-badge']");

    // Should have 2 override badges (for chat and voice overrides)
    expect(badges.length).toBe(2);

    // Badges should have distinct styling
    badges.forEach((badge) => {
      expect(badge).toHaveClass("override-badge-styling");
    });
  });
});
