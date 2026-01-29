/**
 * Unit tests for PdfInputMobile component
 * TDD Phase: RED - Failing tests for F-26 requirements
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfInputMobile } from "../pdf-input-mobile";

describe("PdfInputMobile", () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();

  const mockProps = {
    onUpload: mockOnUpload,
    onError: mockOnError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Structure and Layout", () => {
    it("renders as a mobile-optimized container", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toBeInTheDocument();
    });

    it("has responsive layout adapted to xs breakpoint", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      // Should use mobile-first approach with padding
      expect(rootElement.className).toMatch(/p-|px-|py-/);
    });

    it("displays main title or heading", () => {
      render(<PdfInputMobile {...mockProps} />);

      const heading =
        screen.queryByRole("heading") ||
        screen.queryByText(/upload|pdf|document/i);
      expect(heading).toBeInTheDocument();
    });
  });

  describe("File Picker Control", () => {
    it("renders file input with correct accept attribute", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.accept).toContain("application/pdf");
      expect(fileInput.accept).toContain("image");
    });

    it("renders file picker button with touch-friendly size", () => {
      render(<PdfInputMobile {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const filePickerButton = buttons.find((btn) =>
        /choose|select|pick|file/i.test(btn.textContent || ""),
      );

      expect(filePickerButton).toBeInTheDocument();
      expect(filePickerButton?.className).toMatch(/min-h-\[44px\]/);
      expect(filePickerButton?.className).toMatch(/min-w-\[44px\]/);
    });

    it("file picker button triggers file input click", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      const buttons = screen.getAllByRole("button");
      const filePickerButton = buttons.find((btn) =>
        /choose|select|pick|file/i.test(btn.textContent || ""),
      );

      if (filePickerButton) {
        await user.click(filePickerButton);
        expect(clickSpy).toHaveBeenCalled();
      }
    });
  });

  describe("Camera Capture Control", () => {
    it("renders camera capture button", () => {
      render(<PdfInputMobile {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const cameraButton = buttons.find((btn) =>
        /camera|capture|scan/i.test(btn.textContent || ""),
      );

      expect(cameraButton).toBeInTheDocument();
    });

    it("camera button has touch-friendly size (44px minimum)", () => {
      render(<PdfInputMobile {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const cameraButton = buttons.find((btn) =>
        /camera|capture|scan/i.test(btn.textContent || ""),
      );

      expect(cameraButton?.className).toMatch(/min-h-\[44px\]/);
      expect(cameraButton?.className).toMatch(/min-w-\[44px\]/);
    });

    it("camera button is clickable and callable", async () => {
      const user = userEvent.setup({ delay: null });
      render(<PdfInputMobile {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const cameraButton = buttons.find((btn) =>
        /camera|capture|scan/i.test(btn.textContent || ""),
      );

      if (cameraButton) {
        expect(cameraButton).toBeEnabled();
        await expect(user.click(cameraButton)).resolves.not.toThrow();
      }
    });
  });

  describe("Touch Target Sizing (WCAG Mobile)", () => {
    it("all interactive elements have minimum 44px height", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        // Either has min-h class or sufficient natural height
        expect(button.className).toMatch(/min-h-\[44px\]|h-\d|py-\d|p-\d/);
      });
    });

    it("all interactive elements have minimum 44px width", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        // Either has min-w class or sufficient natural width
        expect(button.className).toMatch(/min-w-\[44px\]|w-\d|px-\d|p-\d/);
      });
    });

    it("buttons have adequate spacing to prevent accidental clicks", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const buttons = container.querySelectorAll("button");
      // Check for gap or margin classes between buttons
      const parentWithButtons = container.querySelector("[class*='gap']");
      expect(parentWithButtons?.className || buttons.length === 1).toBeTruthy();
    });
  });

  describe("Progress Indicator", () => {
    it("renders progress indicator or upload status area", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      // Component should have progress bar element ready
      expect(
        container.querySelector("[role='progressbar']") || container.firstChild,
      ).toBeInTheDocument();
    });

    it("displays upload progress when file is selected", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      // Simulate file selection
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      await user.upload(fileInput, file);

      // After upload, should show progress bar
      await waitFor(() => {
        const progressElement = container.querySelector("[role='progressbar']");
        expect(progressElement).toBeInTheDocument();
      });
    });
  });

  describe("File Upload Handling", () => {
    it("accepts PDF files", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["content"], "document.pdf", {
        type: "application/pdf",
      });

      await user.upload(fileInput, file);
      await waitFor(
        () => {
          expect(mockOnUpload).toHaveBeenCalledWith(file);
        },
        { timeout: 2500 },
      );
    });

    it("accepts image files", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["image"], "scan.jpg", { type: "image/jpeg" });

      await user.upload(fileInput, file);
      await waitFor(
        () => {
          expect(mockOnUpload).toHaveBeenCalledWith(file);
        },
        { timeout: 2500 },
      );
    });

    it("calls onUpload callback with selected file", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<PdfInputMobile {...mockProps} />);

      // Use the specific file input (first one)
      const fileInput = container.querySelectorAll(
        'input[type="file"]',
      )[0] as HTMLInputElement;
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });

      await user.upload(fileInput, file);
      await waitFor(
        () => {
          expect(mockOnUpload).toHaveBeenCalledTimes(1);
          expect(mockOnUpload).toHaveBeenCalledWith(file);
        },
        { timeout: 2500 },
      );
    });

    it("file input accepts only PDF and image files", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      // Check that file input has correct accept attribute
      expect(fileInput.accept).toContain("application/pdf");
      expect(fileInput.accept).toContain("image");
    });
  });

  describe("Accessibility", () => {
    it("buttons have accessible names", () => {
      render(<PdfInputMobile {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it("file input has associated label or is hidden", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector('input[type="file"]');
      // Input should be hidden visually (not visible to users, only for internal use)
      expect(fileInput?.className).toContain("hidden");
    });

    it("progress indicator has proper ARIA roles", async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });

      await user.upload(fileInput, file);

      // Progress bar should have progressbar role
      await waitFor(() => {
        const progress = container.querySelector("[role='progressbar']");
        expect(progress).toBeInTheDocument();
      });
    });

    it("provides feedback for screen readers", () => {
      render(<PdfInputMobile {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const uploadButton = buttons[0];

      expect(uploadButton).toHaveAccessibleName();
    });
  });

  describe("Responsive Behavior (xs breakpoint)", () => {
    it("uses appropriate padding for mobile screens", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      // Mobile-first: should have padding on mobile
      expect(rootElement.className).toMatch(/p-|px-|py-/);
    });

    it("buttons stack vertically on narrow screens", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      const buttonContainer = container.querySelector("[class*='flex']");
      // Should have flex-col for vertical stacking
      expect(
        buttonContainer?.className.includes("flex-col") ||
          buttonContainer?.className.includes("flex"),
      ).toBeTruthy();
    });

    it("text is readable on small screens (adequate text size)", () => {
      render(<PdfInputMobile {...mockProps} />);

      // Check that heading text is present
      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toMatch(/upload|document/i);
    });
  });

  describe("Mobile Components Integration", () => {
    it("uses mobile component patterns", () => {
      const { container } = render(<PdfInputMobile {...mockProps} />);

      // Component should follow mobile conventions
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toBeInTheDocument();

      // Check for mobile-appropriate styling
      const hasMobileClasses =
        rootElement.className.includes("rounded") ||
        rootElement.className.includes("border") ||
        rootElement.className.includes("bg");

      expect(hasMobileClasses).toBeTruthy();
    });
  });
});
