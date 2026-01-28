/**
 * MIRRORBUDDY - Email Capture Prompt Component Tests
 *
 * Tests for trial email capture UI:
 * - Rendering and display logic
 * - Email submission
 * - Dismissal behavior
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailCapturePrompt } from "../email-capture-prompt";

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock: Storage = {
  length: 0,
  key: () => null,
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Assign to global
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("EmailCapturePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock to return null (not dismissed)
    vi.mocked(localStorageMock.getItem).mockReturnValue(null);
  });

  it("renders email capture prompt", () => {
    render(<EmailCapturePrompt sessionId="test-session" messageCount={5} />);

    expect(
      screen.getByText(/sblocca tutte le funzionalità/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it("submits email successfully", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, email: "user@example.com" }),
    } as Response);

    render(<EmailCapturePrompt sessionId="test-session" messageCount={5} />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /verifica email/i,
    });

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/trial/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "test-session",
          email: "user@example.com",
        }),
      });
    });
  });

  it("validates email format", async () => {
    render(<EmailCapturePrompt sessionId="test-session" messageCount={5} />);

    const emailInput = screen.getByPlaceholderText(
      /email/i,
    ) as HTMLInputElement;
    const submitButton = screen.getByText(/verifica email/i);

    // Change the input value
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    // Trigger submit
    fireEvent.click(submitButton);

    // Wait a bit for async validation
    await waitFor(
      () => {
        // Should not have called fetch with invalid email
        expect(global.fetch).not.toHaveBeenCalled();
      },
      { timeout: 1500 },
    );
  });

  it("dismisses prompt and stores in localStorage", () => {
    render(<EmailCapturePrompt sessionId="test-session" messageCount={5} />);

    // Use the button in the form, not the X icon
    const dismissButton = screen.getByText(/forse più tardi/i);
    fireEvent.click(dismissButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "mirrorbuddy-email-prompt-dismissed",
      "true",
    );
  });

  it("does not render if already dismissed", () => {
    vi.mocked(localStorageMock.getItem).mockReturnValue("true");

    const { container } = render(
      <EmailCapturePrompt sessionId="test-session" messageCount={5} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows after 5 messages by default", () => {
    const { container, rerender } = render(
      <EmailCapturePrompt sessionId="test-session" messageCount={4} />,
    );

    // Should not render below threshold
    expect(container.firstChild).toBeNull();

    rerender(<EmailCapturePrompt sessionId="test-session" messageCount={5} />);

    // Should render at threshold
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText(/verifica email/i)).toBeInTheDocument();
  });

  it("shows when hitting limit", () => {
    render(
      <EmailCapturePrompt
        sessionId="test-session"
        messageCount={10}
        showOnLimit={true}
      />,
    );

    expect(screen.getByText(/continua con la beta/i)).toBeInTheDocument();
  });
});
