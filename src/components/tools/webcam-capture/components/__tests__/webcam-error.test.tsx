/**
 * @file webcam-error.test.tsx
 * @brief Tests for WebcamError component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebcamError } from "../webcam-error";

// Note: Component has hardcoded Italian text, not using i18n

describe("WebcamError", () => {
  it("should display permission denied error with instructions", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <WebcamError
        error="Permission denied"
        errorType="permission"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    // Check error message is displayed
    expect(screen.getByText("Permission denied")).toBeInTheDocument();

    // Check instructions are displayed (hardcoded in Italian)
    expect(
      screen.getByText(/Clicca l'icona.*nella barra degli indirizzi/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fotocamera.*Camera/i)).toBeInTheDocument();
    expect(screen.getByText(/Consenti/i)).toBeInTheDocument();
    expect(screen.getByText(/Ricarica la pagina/i)).toBeInTheDocument();
  });

  it("should display unavailable error without permission instructions", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <WebcamError
        error="Camera not found"
        errorType="unavailable"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    // Check error message is displayed
    expect(screen.getByText("Camera not found")).toBeInTheDocument();

    // Instructions should NOT be displayed for unavailable error
    expect(
      screen.queryByText(/Clicca l'icona nella barra degli indirizzi/),
    ).not.toBeInTheDocument();
  });

  it("should display timeout error", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <WebcamError
        error="Timeout"
        errorType="timeout"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Timeout")).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <WebcamError
        error="Permission denied"
        errorType="permission"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /Riprova/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <WebcamError
        error="Permission denied"
        errorType="permission"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /Chiudi/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should have appropriate styling with red error indicator", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <WebcamError
        error="Permission denied"
        errorType="permission"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    // Check for red error indicator (bg-red-500/20)
    const errorIcon = container.querySelector(".bg-red-500\\/20");
    expect(errorIcon).toBeInTheDocument();
  });
});
