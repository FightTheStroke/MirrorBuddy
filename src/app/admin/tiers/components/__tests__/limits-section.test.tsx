/**
 * Unit tests for LimitsSection component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import _userEvent from "@testing-library/user-event";
import { LimitsSection } from "../limits-section";

describe("LimitsSection", () => {
  let mockOnChange: any;

  const defaultFormData = {
    chatLimitDaily: 10,
    voiceMinutesDaily: 5,
    toolsLimitDaily: 10,
    docsLimitTotal: 1,
  };

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe("Rendering", () => {
    it("renders the component with title", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );
      expect(screen.getByText("Limiti")).toBeInTheDocument();
    });

    it("renders all 4 limit input fields", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      expect(
        screen.getByLabelText(/Messaggi Chat Giornalieri/i),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Minuti Voce Giornalieri/i),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Strumenti Giornalieri/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Documenti Totali/i)).toBeInTheDocument();
    });

    it("renders help text for each field", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      // Check for help text descriptions
      expect(
        screen.getByText(/numero massimo di messaggi/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/minuti di utilizzo voce/i)).toBeInTheDocument();
      expect(
        screen.getByText(/numero massimo di strumenti/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/numero massimo di documenti/i),
      ).toBeInTheDocument();
    });

    it("displays correct input values", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const chatInput = screen.getByLabelText(
        /Messaggi Chat Giornalieri/i,
      ) as HTMLInputElement;
      const voiceInput = screen.getByLabelText(
        /Minuti Voce Giornalieri/i,
      ) as HTMLInputElement;

      expect(chatInput).toHaveValue(10);
      expect(voiceInput).toHaveValue(5);
    });

    it("displays max value hint for each field", () => {
      const { container } = render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      // Check for max value display in the DOM
      const maxHints = container.querySelectorAll("span");
      const maxTexts = Array.from(maxHints).map((h) => h.textContent);

      expect(maxTexts.some((t) => t?.includes("500"))).toBe(true);
      expect(maxTexts.some((t) => t?.includes("1440"))).toBe(true);
    });
  });

  describe("User Interactions", () => {
    it("calls onChange with valid chat limit value", async () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const chatInput = screen.getByLabelText(
        /Messaggi Chat Giornalieri/i,
      ) as HTMLInputElement;
      fireEvent.change(chatInput, { target: { value: "20" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("calls onChange with valid voice minutes value", async () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const voiceInput = screen.getByLabelText(
        /Minuti Voce Giornalieri/i,
      ) as HTMLInputElement;
      fireEvent.change(voiceInput, { target: { value: "15" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("calls onChange with valid tools limit value", async () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const toolsInput = screen.getByLabelText(
        /Strumenti Giornalieri/i,
      ) as HTMLInputElement;
      fireEvent.change(toolsInput, { target: { value: "25" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("calls onChange with valid docs limit value", async () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const docsInput = screen.getByLabelText(
        /Documenti Totali/i,
      ) as HTMLInputElement;
      fireEvent.change(docsInput, { target: { value: "50" } });

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("enforces min value of 0 on all inputs", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      inputs.forEach((input) => {
        expect(input).toHaveAttribute("min", "0");
      });
    });

    it("enforces max values on all inputs", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const chatInput = screen.getByLabelText(
        /Messaggi Chat Giornalieri/i,
      ) as HTMLInputElement;
      const voiceInput = screen.getByLabelText(
        /Minuti Voce Giornalieri/i,
      ) as HTMLInputElement;
      const toolsInput = screen.getByLabelText(
        /Strumenti Giornalieri/i,
      ) as HTMLInputElement;
      const docsInput = screen.getByLabelText(
        /Documenti Totali/i,
      ) as HTMLInputElement;

      // All inputs should have a max attribute
      expect(chatInput).toHaveAttribute("max", "500");
      expect(voiceInput).toHaveAttribute("max", "1440");
      expect(toolsInput).toHaveAttribute("max", "500");
      expect(docsInput).toHaveAttribute("max", "10000");
    });

    it("shows placeholder text indicating min and max values", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const chatInput = screen.getByLabelText(
        /Messaggi Chat Giornalieri/i,
      ) as HTMLInputElement;
      expect(chatInput).toHaveAttribute("placeholder", "Min: 0, Max: 500");

      const voiceInput = screen.getByLabelText(
        /Minuti Voce Giornalieri/i,
      ) as HTMLInputElement;
      expect(voiceInput).toHaveAttribute("placeholder", "Min: 0, Max: 1440");
    });
  });

  describe("Input Types", () => {
    it("uses number input type for all fields", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
      expect(inputs.length).toBe(4);
      inputs.forEach((input) => {
        expect(input).toHaveAttribute("type", "number");
      });
    });
  });

  describe("Responsive Layout", () => {
    it("renders in a 2-column grid", () => {
      const { container } = render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("grid-cols-1", "md:grid-cols-2");
    });

    it("renders with proper spacing between fields", () => {
      const { container } = render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("gap-6");
    });
  });

  describe("Error Display", () => {
    it("allows user to enter valid values without errors", () => {
      render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const chatInput = screen.getByLabelText(
        /Messaggi Chat Giornalieri/i,
      ) as HTMLInputElement;
      fireEvent.change(chatInput, { target: { value: "100" } });
      fireEvent.blur(chatInput);

      const alerts = screen.queryAllByRole("alert");
      expect(alerts.length).toBe(0);
      expect(mockOnChange).toHaveBeenCalledWith({ chatLimitDaily: 100 });
    });

    it("prevents onChange when value is invalid on blur", () => {
      const { rerender: _rerender } = render(
        <LimitsSection formData={defaultFormData} onChange={mockOnChange} />,
      );

      const chatInput = screen.getByLabelText(
        /Messaggi Chat Giornalieri/i,
      ) as HTMLInputElement;
      mockOnChange.mockClear();

      // Try to enter an invalid value that exceeds max
      fireEvent.change(chatInput, { target: { value: "" } });
      fireEvent.blur(chatInput);

      // Should not call onChange for invalid input
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
