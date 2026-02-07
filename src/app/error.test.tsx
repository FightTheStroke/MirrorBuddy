import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Error from "./error";

describe("Error Component", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Test error message");

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).history;
    window.history = { back: vi.fn() } as any;
  });

  describe("Multi-language support", () => {
    it('should display English text when navigator.language is "en"', () => {
      Object.defineProperty(window.navigator, "language", {
        value: "en",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(
        screen.getByText(/An error occurred while loading the page/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
      expect(screen.getByText("Go Back")).toBeInTheDocument();
    });

    it('should display Italian text when navigator.language is "it"', () => {
      Object.defineProperty(window.navigator, "language", {
        value: "it",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Qualcosa è andato storto")).toBeInTheDocument();
      expect(
        screen.getByText(/Si è verificato un errore durante il caricamento/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Riprova")).toBeInTheDocument();
      expect(screen.getByText("Torna indietro")).toBeInTheDocument();
    });

    it('should display French text when navigator.language is "fr"', () => {
      Object.defineProperty(window.navigator, "language", {
        value: "fr",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(
        screen.getByText("Quelque chose s'est mal passé"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Une erreur s'est produite lors du chargement/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Réessayer")).toBeInTheDocument();
      expect(screen.getByText("Retour")).toBeInTheDocument();
    });

    it('should display German text when navigator.language is "de"', () => {
      Object.defineProperty(window.navigator, "language", {
        value: "de",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Etwas ist schief gelaufen")).toBeInTheDocument();
      expect(
        screen.getByText(/Beim Laden der Seite ist ein Fehler aufgetreten/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Erneut versuchen")).toBeInTheDocument();
      expect(screen.getByText("Zurück")).toBeInTheDocument();
    });

    it('should display Spanish text when navigator.language is "es"', () => {
      Object.defineProperty(window.navigator, "language", {
        value: "es",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
      expect(
        screen.getByText(/Ocurrió un error al cargar la página/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Intentar de nuevo")).toBeInTheDocument();
      expect(screen.getByText("Volver")).toBeInTheDocument();
    });

    it("should fallback to English for unsupported locale", () => {
      Object.defineProperty(window.navigator, "language", {
        value: "ja",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(
        screen.getByText(/An error occurred while loading the page/i),
      ).toBeInTheDocument();
    });

    it('should handle locale variants like "en-US" by extracting base locale', () => {
      Object.defineProperty(window.navigator, "language", {
        value: "en-US",
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("should fallback to English if navigator.language is undefined", () => {
      Object.defineProperty(window.navigator, "language", {
        value: undefined,
        configurable: true,
      });

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  describe("Error boundary functionality", () => {
    it("should call reset function when Try Again button is clicked", async () => {
      const user = userEvent.setup();
      render(<Error error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole("button", {
        name: /try again|riprova/i,
      });
      await user.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it("should call window.history.back when Go Back button is clicked", async () => {
      const user = userEvent.setup();
      render(<Error error={mockError} reset={mockReset} />);

      const backButton = screen.getByRole("button", {
        name: /go back|torna indietro/i,
      });
      await user.click(backButton);

      expect(window.history.back).toHaveBeenCalledTimes(1);
    });

    it("should display error message in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      render(<Error error={mockError} reset={mockReset} />);

      expect(screen.getByText("Test error message")).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("should display error digest if provided", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const errorWithDigest = Object.assign(new Error("Test error"), {
        digest: "abc123",
      });

      render(<Error error={errorWithDigest} reset={mockReset} />);

      expect(screen.getByText(/Digest: abc123/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
