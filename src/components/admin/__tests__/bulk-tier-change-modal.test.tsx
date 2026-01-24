/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BulkTierChangeModal } from "../bulk-tier-change-modal";
import * as csrfClient from "@/lib/auth/csrf-client";

// Mock csrf-client
vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BulkTierChangeModal", () => {
  const mockUsers = [
    { id: "user1", username: "user1", email: "user1@test.com" },
    { id: "user2", username: "user2", email: "user2@test.com" },
    { id: "user3", username: null, email: "user3@test.com" },
  ];

  const mockTiers = [
    { id: "tier1", code: "BASE", name: "Base Tier" },
    { id: "tier2", code: "PRO", name: "Pro Tier" },
    { id: "tier3", code: "ENTERPRISE", name: "Enterprise Tier" },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    users: mockUsers,
    availableTiers: mockTiers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render modal when open", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    expect(screen.getByText("Bulk Tier Change")).toBeInTheDocument();
    expect(screen.getByText("3 users selected")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(<BulkTierChangeModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Bulk Tier Change")).not.toBeInTheDocument();
  });

  it("should display user list", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    // Check for the formatted display (username - email or Anonymous - email)
    expect(screen.getByText(/user1 - user1@test\.com/)).toBeInTheDocument();
    expect(screen.getByText(/user2 - user2@test\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Anonymous - user3@test\.com/)).toBeInTheDocument();
  });

  it("should display tier options", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    const select = screen.getByLabelText("New Tier");
    expect(select).toBeInTheDocument();

    fireEvent.click(select);
    expect(screen.getByText("Base Tier")).toBeInTheDocument();
    expect(screen.getByText("Pro Tier")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Tier")).toBeInTheDocument();
  });

  it("should require tier selection", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    const confirmButton = screen.getByRole("button", {
      name: /change tier for/i,
    });
    expect(confirmButton).toBeDisabled();
  });

  it("should enable confirm button when tier is selected", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    const select = screen.getByLabelText("New Tier");
    fireEvent.change(select, { target: { value: "tier2" } });

    const confirmButton = screen.getByRole("button", {
      name: /change tier for/i,
    });
    expect(confirmButton).not.toBeDisabled();
  });

  it("should call API and show progress on submit", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        summary: { total: 3, successful: 3, failed: 0 },
        results: [
          { userId: "user1", success: true },
          { userId: "user2", success: true },
          { userId: "user3", success: true },
        ],
      }),
    };

    vi.mocked(csrfClient.csrfFetch).mockResolvedValue(mockResponse as any);

    render(<BulkTierChangeModal {...defaultProps} />);

    const select = screen.getByLabelText("New Tier");
    fireEvent.change(select, { target: { value: "tier2" } });

    const confirmButton = screen.getByRole("button", {
      name: /change tier for/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(csrfClient.csrfFetch).toHaveBeenCalledWith(
        "/api/admin/users/bulk/tier",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("tier2"),
        }),
      );
    });
  });

  it("should display results summary after successful operation", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        summary: { total: 3, successful: 2, failed: 1 },
        results: [
          { userId: "user1", success: true },
          { userId: "user2", success: true },
          { userId: "user3", success: false, error: "Database error" },
        ],
      }),
    };

    vi.mocked(csrfClient.csrfFetch).mockResolvedValue(mockResponse as any);

    render(<BulkTierChangeModal {...defaultProps} />);

    const select = screen.getByLabelText("New Tier");
    fireEvent.change(select, { target: { value: "tier2" } });

    const confirmButton = screen.getByRole("button", {
      name: /change tier for/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/2 successful/i)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    });
  });

  it("should handle API errors", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({
        error: "Server error",
      }),
    };

    vi.mocked(csrfClient.csrfFetch).mockResolvedValue(mockResponse as any);

    render(<BulkTierChangeModal {...defaultProps} />);

    const select = screen.getByLabelText("New Tier");
    fireEvent.change(select, { target: { value: "tier2" } });

    const confirmButton = screen.getByRole("button", {
      name: /change tier for/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it("should close modal on cancel", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should close modal on backdrop click", () => {
    render(<BulkTierChangeModal {...defaultProps} />);

    const backdrop = screen.getByRole("presentation");
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
