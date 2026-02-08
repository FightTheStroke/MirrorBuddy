/**
 * Unit tests for DirectInviteModal component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { DirectInviteModal } from "../direct-invite-modal";
import { getTranslation } from "@/test/i18n-helpers";

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("DirectInviteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          userId: "user-123",
          username: "testuser1a2b",
          email: "test@example.com",
        }),
    });
  });

  it("does not render when closed", () => {
    render(<DirectInviteModal isOpen={false} onClose={vi.fn()} />);

    expect(
      screen.queryByText(
        getTranslation("admin.components.directInviteModal.titleCreate"),
      ),
    ).not.toBeInTheDocument();
  });

  it("renders form when open", () => {
    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByText(
        getTranslation("admin.components.directInviteModal.titleCreate"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email *")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        getTranslation("admin.components.directInviteModal.nameLabel"),
      ),
    ).toBeInTheDocument();
  });

  it("submits form with email only", async () => {
    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.createUser"),
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/invites/direct",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "test@example.com", name: undefined }),
        }),
      );
    });
  });

  it("submits form with email and name", async () => {
    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email *");
    const nameInput = screen.getByLabelText(
      getTranslation("admin.components.directInviteModal.nameLabel"),
    );

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(nameInput, { target: { value: "Test User" } });

    const submitButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.createUser"),
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/invites/direct",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            name: "Test User",
          }),
        }),
      );
    });
  });

  it("shows success state with generated username", async () => {
    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.createUser"),
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          getTranslation("admin.components.directInviteModal.titleSuccess"),
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("testuser1a2b")).toBeInTheDocument();
  });

  it("shows error message on API failure", async () => {
    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Email already exists" }),
    });

    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.createUser"),
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel clicked", () => {
    const onClose = vi.fn();
    render(<DirectInviteModal isOpen={true} onClose={onClose} />);

    const cancelButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.cancel"),
    });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSuccess callback on successful creation", async () => {
    const onSuccess = vi.fn();
    render(
      <DirectInviteModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.createUser"),
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("copies username to clipboard", async () => {
    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email *");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: getTranslation("admin.components.directInviteModal.createUser"),
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("testuser1a2b")).toBeInTheDocument();
    });

    vi.useFakeTimers();
    const copyButton = screen.getByTitle(
      getTranslation("admin.components.directInviteModal.copyUsername"),
    );
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("testuser1a2b");

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("closes modal on Escape key", () => {
    const onClose = vi.fn();
    render(<DirectInviteModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("closes modal on backdrop click", () => {
    const onClose = vi.fn();
    render(<DirectInviteModal isOpen={true} onClose={onClose} />);

    // Click on backdrop (the outer div with role="presentation")
    const backdrop = screen.getByRole("presentation");
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("has proper ARIA attributes", () => {
    render(<DirectInviteModal isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "direct-invite-title");
  });
});
