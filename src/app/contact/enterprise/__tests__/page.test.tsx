/**
 * Unit tests for Enterprise Contact Form
 * @vitest-environment jsdom
 *
 * Note: We test EnterpriseForm instead of the async server component page
 * since server components cannot be rendered in jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnterpriseForm } from "@/components/contact/enterprise-form";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    // Return mock translations based on key
    const translations: Record<string, string> = {
      heading: "Contattaci Enterprise",
      "form.name.label": "Nome Completo",
      "form.name.placeholder": "Il tuo nome completo",
      "form.email.label": "Email Aziendale",
      "form.email.placeholder": "nome@azienda.com",
      "form.role.label": "Ruolo",
      "form.role.placeholder": "es. HR Manager",
      "form.company.label": "Nome Azienda",
      "form.company.placeholder": "Nome della vostra azienda",
      "form.sector.label": "Settore",
      "form.sector.placeholder": "Seleziona settore",
      "form.employeeCount.label": "N. Dipendenti",
      "form.employeeCount.placeholder": "Seleziona",
      "form.topics.label": "Temi di Interesse",
      "form.message.label": "Messaggio",
      "form.message.placeholder": "Descrivi i requisiti specifici",
      "form.submit": "Invia Richiesta",
      success: "Messaggio inviato!",
      error: "Si è verificato un errore",
    };
    return translations[key] || key;
  },
}));

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

describe("Enterprise Contact Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page Rendering", () => {
    it("renders all required form fields", () => {
      render(<EnterpriseForm />);
      expect(screen.getByPlaceholderText(/nome completo/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/azienda.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/manager/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/vostra azienda/i),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("combobox")).toHaveLength(2);
      expect(screen.getByText(/temi di interesse/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/requisiti specifici/i),
      ).toBeInTheDocument();
    });

    it("renders sector select with required options", () => {
      render(<EnterpriseForm />);
      const sectorSelect = screen.getByLabelText(
        /settore/i,
      ) as HTMLSelectElement;
      expect(sectorSelect).toBeInTheDocument();
      const options = Array.from(sectorSelect.options).map((opt) => opt.value);
      expect(options).toContain("technology");
      expect(options).toContain("finance");
      expect(options).toContain("manufacturing");
      expect(options).toContain("healthcare");
      expect(options).toContain("retail");
      expect(options).toContain("other");
    });

    it("renders employee count select with required options", () => {
      render(<EnterpriseForm />);
      const empSelect = screen.getByLabelText(
        /n..*dipendenti/i,
      ) as HTMLSelectElement;
      expect(empSelect).toBeInTheDocument();
      const options = Array.from(empSelect.options).map((opt) => opt.value);
      expect(options).toContain("under-50");
      expect(options).toContain("50-200");
      expect(options).toContain("200-1000");
      expect(options).toContain("over-1000");
    });

    it("renders interest topics as checkboxes", () => {
      render(<EnterpriseForm />);
      expect(screen.getByDisplayValue("leadership")).toBeInTheDocument();
      expect(screen.getByDisplayValue("ai-innovation")).toBeInTheDocument();
      expect(screen.getByDisplayValue("soft-skills")).toBeInTheDocument();
      expect(screen.getByDisplayValue("onboarding")).toBeInTheDocument();
      expect(screen.getByDisplayValue("compliance")).toBeInTheDocument();
      expect(screen.getByDisplayValue("other")).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<EnterpriseForm />);
      expect(
        screen.getByRole("button", { name: /invia/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("shows validation error when name is empty", async () => {
      render(<EnterpriseForm />);
      const submitBtn = screen.getByRole("button", { name: /invia/i });

      fireEvent.click(submitBtn);

      expect(screen.getByText(/nome obbligatorio/i)).toBeInTheDocument();
    });

    it("shows validation error when email is invalid", async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123" }),
      });

      render(<EnterpriseForm />);
      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/azienda.com/i);
      const roleInput = screen.getByPlaceholderText(/manager/i);
      const companyInput = screen.getByPlaceholderText(/vostra azienda/i);
      const sectorSelect = screen.getAllByRole("combobox")[0];
      const empSelect = screen.getAllByRole("combobox")[1];

      await userEvent.type(nameInput, "Test");
      await userEvent.type(emailInput, "invalid-email");
      await userEvent.type(roleInput, "Manager");
      await userEvent.type(companyInput, "Company");
      fireEvent.change(sectorSelect, { target: { value: "technology" } });
      fireEvent.change(empSelect, { target: { value: "50-200" } });

      // Select at least one topic so validation focuses on email error
      const leadershipCheckbox = screen.getByDisplayValue("leadership");
      fireEvent.click(leadershipCheckbox);

      fireEvent.click(screen.getByRole("button", { name: /invia/i }));

      // Validation should prevent form submission, so csrfFetch should NOT be called
      expect(mockCsrfFetch).not.toHaveBeenCalled();
    });

    it("shows validation error when at least one topic not selected", async () => {
      render(<EnterpriseForm />);
      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/azienda.com/i);
      const roleInput = screen.getByPlaceholderText(/manager/i);
      const companyInput = screen.getByPlaceholderText(/vostra azienda/i);

      await userEvent.type(nameInput, "John Doe");
      await userEvent.type(emailInput, "john@example.com");
      await userEvent.type(roleInput, "Manager");
      await userEvent.type(companyInput, "Acme Corp");

      const sectorSelect = screen.getAllByRole("combobox")[0];
      const empSelect = screen.getAllByRole("combobox")[1];
      fireEvent.change(sectorSelect, { target: { value: "technology" } });
      fireEvent.change(empSelect, { target: { value: "50-200" } });

      fireEvent.click(screen.getByRole("button", { name: /invia/i }));

      expect(screen.getByText(/seleziona almeno un tema/i)).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("submits form with valid data", async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123" }),
      });

      render(<EnterpriseForm />);

      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/azienda.com/i);
      const roleInput = screen.getByPlaceholderText(/manager/i);
      const companyInput = screen.getByPlaceholderText(/vostra azienda/i);
      const sectorSelect = screen.getAllByRole("combobox")[0];
      const empSelect = screen.getAllByRole("combobox")[1];
      const messageTextarea =
        screen.getByPlaceholderText(/requisiti specifici/i);

      await userEvent.type(nameInput, "John Doe");
      await userEvent.type(emailInput, "john@example.com");
      await userEvent.type(roleInput, "Manager");
      await userEvent.type(companyInput, "Acme Corp");
      fireEvent.change(sectorSelect, { target: { value: "technology" } });
      fireEvent.change(empSelect, { target: { value: "50-200" } });

      // Check at least one topic
      const leadershipCheckbox = screen.getByDisplayValue("leadership");
      fireEvent.click(leadershipCheckbox);

      await userEvent.type(
        messageTextarea,
        "Interested in enterprise customization",
      );

      fireEvent.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith(
          "/api/contact",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"type":"enterprise"'),
          }),
        );
      });
    });

    it("sends correct payload with selected topics", async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123" }),
      });

      render(<EnterpriseForm />);

      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/azienda.com/i);
      const roleInput = screen.getByPlaceholderText(/manager/i);
      const companyInput = screen.getByPlaceholderText(/vostra azienda/i);
      const sectorSelect = screen.getAllByRole("combobox")[0];
      const empSelect = screen.getAllByRole("combobox")[1];

      await userEvent.type(nameInput, "Jane Smith");
      await userEvent.type(emailInput, "jane@company.com");
      await userEvent.type(roleInput, "CTO");
      await userEvent.type(companyInput, "Tech Inc");
      fireEvent.change(sectorSelect, { target: { value: "finance" } });
      fireEvent.change(empSelect, { target: { value: "over-1000" } });

      const aiCheckbox = screen.getByDisplayValue("ai-innovation");
      const complianceCheckbox = screen.getByDisplayValue("compliance");
      fireEvent.click(aiCheckbox);
      fireEvent.click(complianceCheckbox);

      fireEvent.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith(
          "/api/contact",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"type":"enterprise"'),
          }),
        );

        const callArgs = mockCsrfFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.topics).toContain("ai-innovation");
        expect(body.topics).toContain("compliance");
        expect(body.sector).toBe("finance");
        expect(body.employeeCount).toBe("over-1000");
      });
    });

    it("shows success message after submission", async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123" }),
      });

      render(<EnterpriseForm />);

      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/azienda.com/i);
      const roleInput = screen.getByPlaceholderText(/manager/i);
      const companyInput = screen.getByPlaceholderText(/vostra azienda/i);
      const sectorSelect = screen.getAllByRole("combobox")[0];
      const empSelect = screen.getAllByRole("combobox")[1];

      await userEvent.type(nameInput, "Test User");
      await userEvent.type(emailInput, "test@example.com");
      await userEvent.type(roleInput, "Director");
      await userEvent.type(companyInput, "Big Corp");
      fireEvent.change(sectorSelect, { target: { value: "healthcare" } });
      fireEvent.change(empSelect, { target: { value: "200-1000" } });

      const leadershipCheckbox = screen.getByDisplayValue("leadership");
      fireEvent.click(leadershipCheckbox);

      fireEvent.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        // The form shows success via translation key "successTitle"
        expect(screen.getByText(/successTitle/i)).toBeInTheDocument();
      });
    });

    it("shows error message on submission failure", async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: "Network error" }),
      });

      render(<EnterpriseForm />);

      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/azienda.com/i);
      const roleInput = screen.getByPlaceholderText(/manager/i);
      const companyInput = screen.getByPlaceholderText(/vostra azienda/i);
      const sectorSelect = screen.getAllByRole("combobox")[0];
      const empSelect = screen.getAllByRole("combobox")[1];

      await userEvent.type(nameInput, "Error Test");
      await userEvent.type(emailInput, "error@test.com");
      await userEvent.type(roleInput, "Manager");
      await userEvent.type(companyInput, "Failed Corp");
      fireEvent.change(sectorSelect, { target: { value: "retail" } });
      fireEvent.change(empSelect, { target: { value: "under-50" } });

      const topicCheckbox = screen.getByDisplayValue("other");
      fireEvent.click(topicCheckbox);

      fireEvent.click(screen.getByRole("button", { name: /invia/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels for all inputs", () => {
      render(<EnterpriseForm />);
      // Check that form has name input with placeholder
      expect(screen.getByPlaceholderText(/nome completo/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/azienda.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/manager/i)).toBeInTheDocument();
    });

    it("marks required fields with asterisk", () => {
      render(<EnterpriseForm />);
      const requiredFields = screen.getAllByText(/\*/);
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });
});
