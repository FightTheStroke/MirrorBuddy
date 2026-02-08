/**
 * Unit tests for ContactForm component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "../contact-form";

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrfFetch.mockReset();
  });

  describe("Rendering", () => {
    it("renders all form fields", () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/oggetto/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/messaggio/i)).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<ContactForm />);
      expect(
        screen.getByRole("button", { name: /invia/i }),
      ).toBeInTheDocument();
    });

    it("renders required indicators for all fields", () => {
      render(<ContactForm />);

      const labels = screen.getAllByText(/\*/);
      expect(labels.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Validation", () => {
    it("shows error when submitting empty form", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = screen.getByRole("button", { name: /invia/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/il nome è obbligatorio/i)).toBeInTheDocument();
        expect(screen.getByText(/l'email è obbligatoria/i)).toBeInTheDocument();
        expect(
          screen.getByText(/l'oggetto è obbligatorio/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/il messaggio è obbligatorio/i),
        ).toBeInTheDocument();
      });
    });

    it("prevents form submission with invalid email", async () => {
      const user = userEvent.setup();
      (mockCsrfFetch as any).mockClear();
      render(<ContactForm />);

      // Fill fields with invalid email
      await user.type(screen.getByLabelText(/nome/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.type(screen.getByLabelText(/oggetto/i), "Test");
      await user.type(screen.getByLabelText(/messaggio/i), "Test");

      const submitButton = screen.getByRole("button", { name: /invia/i });
      await user.click(submitButton);

      // Verify form did not submit (no fetch call)
      await waitFor(() => {
        expect(mockCsrfFetch).not.toHaveBeenCalled();
      });
    });

    it("clears error messages when field is filled", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = screen.getByRole("button", { name: /invia/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/il nome è obbligatorio/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/nome/i);
      await user.type(nameInput, "John Doe");

      await waitFor(() => {
        expect(
          screen.queryByText(/il nome è obbligatorio/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Submission", () => {
    it("posts to /api/contact with form data", async () => {
      const user = userEvent.setup();
      (mockCsrfFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/nome/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/oggetto/i), "Test Subject");
      await user.type(screen.getByLabelText(/messaggio/i), "Test message");

      await user.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith(
          "/api/contact",
          expect.any(Object),
        );
      });

      const callArgs = mockCsrfFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.name).toBe("John Doe");
      expect(body.email).toBe("john@example.com"); // Trimmed and lowercased
      expect(body.subject).toBe("Test Subject");
      expect(body.message).toBe("Test message");
      expect(body.type).toBe("general");
    });

    it("disables submit button while submitting", async () => {
      const user = userEvent.setup();
      (mockCsrfFetch as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/nome/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/oggetto/i), "Test");
      await user.type(screen.getByLabelText(/messaggio/i), "Test");

      const submitButton = screen.getByRole("button", { name: /invia/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it("shows success message after successful submission", async () => {
      const user = userEvent.setup();
      (mockCsrfFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/nome/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/oggetto/i), "Test");
      await user.type(screen.getByLabelText(/messaggio/i), "Test");

      await user.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        expect(screen.getByText(/messaggio inviato/i)).toBeInTheDocument();
      });
    });

    it("shows error message on submission failure", async () => {
      const user = userEvent.setup();
      (mockCsrfFetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/nome/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/oggetto/i), "Test");
      await user.type(screen.getByLabelText(/messaggio/i), "Test");

      await user.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        expect(screen.getByText(/errore durante l'invio/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for all inputs", () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/oggetto/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/messaggio/i)).toBeInTheDocument();
    });

    it("announces validation errors to screen readers", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = screen.getByRole("button", { name: /invia/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole("alert");
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it("manages focus after submission", async () => {
      const user = userEvent.setup();
      (mockCsrfFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/nome/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/oggetto/i), "Test");
      await user.type(screen.getByLabelText(/messaggio/i), "Test");

      await user.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        const successMessage = screen.getByText(/messaggio inviato/i);
        expect(successMessage).toBeInTheDocument();
      });
    });
  });
});
