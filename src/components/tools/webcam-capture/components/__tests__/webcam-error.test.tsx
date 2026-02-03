/**
 * @file webcam-error.test.tsx
 * @brief Tests for WebcamError component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebcamError } from "../webcam-error";
import { NextIntlClientProvider } from "next-intl";

const mockMessages = {
  tools: {
    webcam: {
      errors: {
        permission: {
          title: "Permesso fotocamera negato",
          message: "Abilita l'accesso alla fotocamera",
          instruction1: "Clicca l'icona nella barra degli indirizzi",
          instruction2: "Trova Fotocamera",
          instruction3: "Seleziona Consenti",
          instruction4: "Ricarica la pagina",
        },
        unavailable: {
          title: "Fotocamera non disponibile",
          message: "Collega una webcam o usa un dispositivo con fotocamera",
        },
        timeout: {
          title: "Timeout fotocamera",
          message: "La fotocamera non risponde",
        },
        retry: "Riprova",
        close: "Chiudi",
      },
    },
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="it" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
};

describe("WebcamError", () => {
  it("should display permission denied error with instructions", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    renderWithIntl(
      <WebcamError
        error="Permission denied"
        errorType="permission"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    // Check title is displayed
    expect(screen.getByText("Permesso fotocamera negato")).toBeInTheDocument();

    // Check instructions are displayed
    expect(
      screen.getByText(/Clicca l'icona nella barra degli indirizzi/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Trova Fotocamera/)).toBeInTheDocument();
    expect(screen.getByText(/Seleziona Consenti/)).toBeInTheDocument();
    expect(screen.getByText(/Ricarica la pagina/)).toBeInTheDocument();
  });

  it("should display unavailable error without permission instructions", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    renderWithIntl(
      <WebcamError
        error="Camera not found"
        errorType="unavailable"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    // Check title is displayed
    expect(screen.getByText("Fotocamera non disponibile")).toBeInTheDocument();

    // Instructions should NOT be displayed for unavailable error
    expect(
      screen.queryByText(/Clicca l'icona nella barra degli indirizzi/),
    ).not.toBeInTheDocument();
  });

  it("should display timeout error", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    renderWithIntl(
      <WebcamError
        error="Timeout"
        errorType="timeout"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Timeout fotocamera")).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onClose = vi.fn();

    renderWithIntl(
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

    renderWithIntl(
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

  it("should have dark theme styling", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    const { container } = renderWithIntl(
      <WebcamError
        error="Permission denied"
        errorType="permission"
        onRetry={onRetry}
        onClose={onClose}
      />,
    );

    // Check for bg-slate-900 class
    const errorContainer = container.querySelector(".bg-slate-900");
    expect(errorContainer).toBeInTheDocument();
  });
});
