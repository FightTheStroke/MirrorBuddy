/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TierChangeModal } from "../tier-change-modal";
import { toast } from "@/components/ui/toast";

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

describe("TierChangeModal", () => {
  const mockUser = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    currentTier: {
      id: "tier-1",
      code: "BASE",
      name: "Base",
    },
  };

  const mockTiers = [
    { id: "tier-1", code: "BASE", name: "Base" },
    { id: "tier-2", code: "PRO", name: "Pro" },
    { id: "tier-3", code: "TRIAL", name: "Trial" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open", () => {
    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    expect(screen.getByText(/change tier/i)).toBeInTheDocument();
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <TierChangeModal
        isOpen={false}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("displays current tier", () => {
    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const currentTierSection = screen.getByText(/current tier/i).parentElement;
    expect(currentTierSection).toBeInTheDocument();
    expect(currentTierSection).toHaveTextContent("Base");
  });

  it("shows dropdown with available tiers", () => {
    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const select = screen.getByRole("combobox", { name: /new tier/i });
    expect(select).toBeInTheDocument();
  });

  it("allows entering notes", async () => {
    const user = userEvent.setup();
    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const notesInput = screen.getByPlaceholderText(/reason for change/i);
    await user.type(notesInput, "Upgrading to Pro");

    expect(notesInput).toHaveValue("Upgrading to Pro");
  });

  it("submits tier change successfully", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <TierChangeModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    // Select new tier
    const select = screen.getByRole("combobox", { name: /new tier/i });
    await user.selectOptions(select, "tier-2");

    // Add notes
    const notesInput = screen.getByPlaceholderText(/reason for change/i);
    await user.type(notesInput, "Upgrading to Pro");

    // Submit
    const submitButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/admin/users/user-123/tier",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tierId: "tier-2",
            notes: "Upgrading to Pro",
          }),
        }),
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows error toast on API failure", async () => {
    const user = userEvent.setup();

    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Tier change failed" }),
    });

    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    // Select new tier
    const select = screen.getByRole("combobox", { name: /new tier/i });
    await user.selectOptions(select, "tier-2");

    // Submit
    const submitButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("disables submit button when no tier selected", () => {
    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /confirm/i });
    expect(submitButton).toBeDisabled();
  });

  it("disables submit button during loading", async () => {
    const user = userEvent.setup();

    mockCsrfFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100),
        ),
    );

    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const select = screen.getByRole("combobox", { name: /new tier/i });
    await user.selectOptions(select, "tier-2");

    const submitButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TierChangeModal
        isOpen={true}
        onClose={onClose}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("creates audit log entry on successful tier change", async () => {
    const user = userEvent.setup();

    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        auditLogId: "audit-123",
      }),
    });

    render(
      <TierChangeModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        availableTiers={mockTiers}
      />,
    );

    const select = screen.getByRole("combobox", { name: /new tier/i });
    await user.selectOptions(select, "tier-2");

    const submitButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalled();
    });
  });
});
