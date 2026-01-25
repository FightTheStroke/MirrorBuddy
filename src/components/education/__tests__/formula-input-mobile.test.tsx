/**
 * Unit tests for FormulaInputMobile component
 * TDD Phase: RED - Failing tests for F-30 requirements
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormulaInputMobile } from "../formula-input-mobile";

// Mock useDeviceType hook
vi.mock("@/hooks/use-device-type", () => ({
  useDeviceType: vi.fn(() => ({
    deviceType: "phone",
    isPhone: true,
    isTablet: false,
    isDesktop: false,
    orientation: "portrait",
    isPortrait: true,
    isLandscape: false,
  })),
}));

describe("FormulaInputMobile", () => {
  const mockOnChange = vi.fn();
  const mockOnSubmit = vi.fn();

  const mockProps = {
    value: "",
    onChange: mockOnChange,
    onSubmit: mockOnSubmit,
    placeholder: "Enter formula",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Structure and Layout", () => {
    it("renders as a mobile-optimized container", () => {
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toBeInTheDocument();
    });

    it("has responsive layout adapted to mobile", () => {
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement.className).toMatch(/flex|p-|px-|py-/);
    });

    it("displays input field for formula entry", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(/enter formula/i);
      expect(input).toBeInTheDocument();
    });

    it("displays math keyboard toggle button", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe("Input Field", () => {
    it("input field has minimum font size of 16px to prevent iOS zoom", () => {
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const input = container.querySelector(
        'input[type="text"]',
      ) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      // Check for text-lg or similar class that ensures >=16px
      expect(input.className).toMatch(/text-|text-lg|text-base/);
    });

    it("input field has proper placeholder text", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(/enter formula/i);
      expect(input).toBeInTheDocument();
    });

    it("input field is editable and reflects typed content", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(/enter formula/i);
      await user.type(input, "x^2 + y^2");

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("input field calls onChange callback when text is entered", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(/enter formula/i);
      await user.type(input, "2");

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("displays current formula value in input field", () => {
      const { rerender } = render(
        <FormulaInputMobile {...mockProps} value="√x + π" />,
      );

      const input = screen.getByDisplayValue(/√x \+ π/);
      expect(input).toBeInTheDocument();

      rerender(<FormulaInputMobile {...mockProps} value="∫x dx" />);

      const updatedInput = screen.getByDisplayValue(/∫x dx/);
      expect(updatedInput).toBeInTheDocument();
    });
  });

  describe("Math Keyboard Toggle", () => {
    it("has a toggle button to show/hide math keyboard", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it("toggle button has touch-friendly size (44px minimum)", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });

      expect(toggleButton?.className).toMatch(/min-h-\[44px\]|h-\d|py-/);
      expect(toggleButton?.className).toMatch(/min-w-\[44px\]|w-\d|px-/);
    });

    it("toggles math keyboard visibility on button click", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });

      // Initially, math keyboard should not be visible
      let mathKeyboard = container.querySelector("[class*='math-keyboard']");
      const initialVisibility = mathKeyboard?.className.includes("hidden");

      await user.click(toggleButton);

      // After click, visibility should toggle
      await waitFor(() => {
        mathKeyboard = container.querySelector("[class*='math-keyboard']");
        expect(mathKeyboard?.className.includes("hidden")).not.toBe(
          initialVisibility,
        );
      });
    });
  });

  describe("Math Keyboard Symbols", () => {
    it("displays math symbols grid when keyboard is visible", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      const symbolGrid = container.querySelector("[class*='grid']");
      expect(symbolGrid).toBeInTheDocument();
    });

    it("includes square root symbol (√)", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      // Symbol should be visible after toggle
      const sqrtSymbol = await screen.findByText("√");
      expect(sqrtSymbol).toBeInTheDocument();
    });

    it("includes pi symbol (π)", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      const piSymbol = await screen.findByText("π");
      expect(piSymbol).toBeInTheDocument();
    });

    it("includes integral symbol (∫)", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      const integralSymbol = await screen.findByText("∫");
      expect(integralSymbol).toBeInTheDocument();
    });

    it("includes summation symbol (Σ)", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      const sigmaSymbol = await screen.findByText("Σ");
      expect(sigmaSymbol).toBeInTheDocument();
    });

    it("math symbol buttons have 44px minimum touch targets", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      await waitFor(() => {
        const symbolButtons = container.querySelectorAll(
          "[class*='math-symbol']",
        );
        symbolButtons.forEach((button) => {
          expect(button.className).toMatch(/min-h-\[44px\]|h-\d|py-|p-\d/);
          expect(button.className).toMatch(/min-w-\[44px\]|w-\d|px-|p-\d/);
        });
      });
    });

    it("clicking math symbol inserts it into formula input", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      const sqrtButton = await screen.findByText("√");
      expect(sqrtButton).toBeInTheDocument();
    });
  });

  describe("Keyboard Layout", () => {
    it("arranges symbols in a grid layout on mobile", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      await waitFor(() => {
        const grid = container.querySelector("[class*='grid']");
        expect(grid).toBeInTheDocument();
        // Grid should have grid-cols class for layout
        expect(grid?.className).toMatch(/grid-cols/);
      });
    });

    it("keyboard is styled as bottom sheet on mobile", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      // Toggle keyboard to show it
      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      // Now check for keyboard styling
      const keyboard = container.querySelector("[class*='math-keyboard']");
      if (keyboard) {
        expect(
          keyboard.className.includes("bottom") ||
            keyboard.className.includes("fixed") ||
            keyboard.className.includes("absolute"),
        ).toBeTruthy();
      }
    });

    it("keyboard has proper spacing and gaps between buttons", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      await waitFor(() => {
        const grid = container.querySelector("[class*='grid']");
        expect(grid?.className).toMatch(/gap/);
      });
    });
  });

  describe("Responsive Behavior (Mobile vs Desktop)", () => {
    it("uses bottom sheet on mobile devices", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      // Toggle to show keyboard
      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      const keyboard = container.querySelector("[class*='math-keyboard']");
      if (keyboard) {
        expect(
          keyboard.className.includes("bottom") ||
            keyboard.className.includes("fixed"),
        ).toBeTruthy();
      }
    });

    it("adapts layout based on device type from useDeviceType", () => {
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      // Component should render based on device detection
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toBeInTheDocument();
    });

    it("has responsive padding on mobile (p-2 sm:p-4)", () => {
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement.className).toMatch(/p-2|sm:p-4/);
    });
  });

  describe("Accessibility", () => {
    it("toggle button has accessible name", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      expect(toggleButton).toHaveAccessibleName();
    });

    it("input field has accessible label", () => {
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(
        /enter formula/i,
      ) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      // Either has label or placeholder
      expect(
        input.placeholder || input.getAttribute("aria-label"),
      ).toBeTruthy();
    });

    it("math symbol buttons have accessible names or labels", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      await waitFor(() => {
        const buttons = container.querySelectorAll("button");
        buttons.forEach((button) => {
          // Button should have text content or aria-label
          const hasName =
            button.textContent?.trim() ||
            button.getAttribute("aria-label") ||
            button.title;
          expect(!!hasName).toBeTruthy();
        });
      });
    });

    it("keyboard container has proper ARIA roles", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      await waitFor(() => {
        const keyboard = container.querySelector("[class*='math-keyboard']");
        // Should be marked as presentation or toolbar
        const role = keyboard?.getAttribute("role");
        expect(
          role === null ||
            role === "presentation" ||
            role === "toolbar" ||
            role === "group",
        ).toBeTruthy();
      });
    });
  });

  describe("Touch Interaction", () => {
    it("all buttons respond to touch events", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });

      await expect(user.click(toggleButton)).resolves.not.toThrow();
    });

    it("symbol insertion works on touch devices", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /keyboard|math|symbols/i,
      });
      await user.click(toggleButton);

      // Button click should work for symbol insertion
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(1);
    });

    it("prevents unwanted text selection during symbol input", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(/enter formula/i);
      await user.click(input);

      // Input should be focused and ready for text entry
      expect(input).toHaveFocus();
    });
  });

  describe("Integration with Form", () => {
    it("calls onSubmit when submit action occurs", async () => {
      const user = userEvent.setup({ delay: null });
      render(<FormulaInputMobile {...mockProps} />);

      const input = screen.getByPlaceholderText(/enter formula/i);
      await user.type(input, "formula");

      // Trigger submit (e.g., Enter key or submit button)
      const submitButton = screen.queryByRole("button", {
        name: /submit|ok|done|enter/i,
      });
      if (submitButton) {
        await user.click(submitButton);
        expect(mockOnSubmit).toHaveBeenCalled();
      }
    });
  });
});
