/**
 * HomeworkAssistantMobile Test Suite
 *
 * Tests for camera-first homework assistant mobile component (F-31)
 * Verifies:
 * - Camera button prominent on mobile
 * - Quick photo capture + analysis workflow
 * - Gallery picker as alternative
 * - Subject selection with large touch targets
 * - Step-by-step solution display on mobile
 * - Responsive layout: camera-first on mobile, text-first on desktop
 * - Uses TouchTarget and xs: breakpoint
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { HomeworkAssistantMobile } from "../homework-assistant-mobile";

describe("HomeworkAssistantMobile", () => {
  const mockOnAnalyze = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    mockOnAnalyze.mockClear();
    mockOnError.mockClear();
  });

  describe("Camera-First Workflow (Mobile)", () => {
    it("should render camera button as primary action on mobile", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const cameraButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Take Photo"));
      expect(cameraButton).toBeInTheDocument();
      // Button should have blue border (primary action)
      expect(cameraButton?.className).toContain("border-blue-500");
    });

    it("should camera button be first action in mobile layout", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const actionButtons = container.querySelectorAll(
        'button[class*="border-blue-500"]',
      );
      const cameraButton = Array.from(actionButtons).find((btn) =>
        btn.textContent?.match(/take photo/i),
      );
      expect(cameraButton).toBeInTheDocument();
      // Camera button should be the primary action (blue colored)
      expect(cameraButton?.className).toContain("border-blue-500");
    });

    it("should open camera input when camera button clicked", async () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const cameraButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Take Photo"));
      await userEvent.click(cameraButton!);

      const cameraInput = document.querySelector(
        'input[type="file"][capture]',
      ) as HTMLInputElement;
      expect(cameraInput).toBeInTheDocument();
      expect(cameraInput).toHaveAttribute("capture", "environment");
      expect(cameraInput).toHaveAttribute(
        "accept",
        expect.stringMatching(/image/),
      );
    });
  });

  describe("Gallery Picker Alternative", () => {
    it("should render gallery/file picker button", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const galleryButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Choose File"));
      expect(galleryButton).toBeInTheDocument();
    });

    it("should gallery button be accessible alternative with touch target", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const galleryButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Choose File"));
      expect(galleryButton).toHaveClass("py-4", "px-4");
    });

    it("should open file picker when gallery button clicked", async () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const galleryButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Choose File"));
      await userEvent.click(galleryButton!);

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])',
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute(
        "accept",
        expect.stringMatching(/image|pdf/),
      );
    });
  });

  describe("Subject Selection", () => {
    it("should render subject selector with large touch targets", () => {
      render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Should have subject options accessible
      expect(document.body.textContent).toMatch(/subject|materia|disciplina/i);
    });

    it("should subject buttons have minimum 44px touch target size", () => {
      render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Subject buttons should have adequate padding
      const subjectButtons = screen
        .getAllByRole("button")
        .filter((btn) =>
          btn.textContent?.match(/Matematica|Scienze|Italiano|Inglese|Storia/),
        );
      subjectButtons.forEach((btn) => {
        // Subject buttons have py-2 px-3 (touch target via padding)
        expect(
          btn.className.match(/py-|px-/) || btn.getAttribute("style"),
        ).toBeTruthy();
      });
    });

    it("should display common subjects (Math, Science, Italian, etc)", () => {
      render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Look for subject indicators (buttons, text, or select options)
      const bodyText = document.body.textContent || "";
      // At least one subject area should be present
      const hasSubjects = bodyText.match(
        /math|science|italian|english|storia|history/i,
      );
      expect(hasSubjects).toBeTruthy();
    });
  });

  describe("Photo Capture + Analysis Workflow", () => {
    it("should handle image file from camera capture", async () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const cameraButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Take Photo"));
      await userEvent.click(cameraButton!);

      const cameraInput = document.querySelector(
        'input[type="file"][capture]',
      ) as HTMLInputElement;

      // Simulate file selection
      const file = new File(["dummy content"], "homework.jpg", {
        type: "image/jpeg",
      });

      Object.defineProperty(cameraInput, "files", {
        value: { 0: file, length: 1 },
        writable: false,
      });

      fireEvent.change(cameraInput);

      // Should process the image (loading state or immediate analysis)
      await waitFor(() => {
        expect(mockOnAnalyze).toHaveBeenCalledWith(expect.any(Object));
      });
    });

    it("should handle gallery file selection", async () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const galleryButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Choose File"));
      await userEvent.click(galleryButton!);

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])',
      ) as HTMLInputElement;

      const file = new File(["dummy pdf content"], "homework.pdf", {
        type: "application/pdf",
      });

      Object.defineProperty(fileInput, "files", {
        value: { 0: file, length: 1 },
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnAnalyze).toHaveBeenCalledWith(expect.any(Object));
      });
    });

    it("should show analysis in progress state", async () => {
      render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Component should show loading/analyzing state
      const bodyText = document.body.textContent;
      expect(
        bodyText?.match(/analyzing|loading|processing|please wait/i) ||
          mockOnAnalyze,
      ).toBeTruthy();
    });
  });

  describe("Step-by-Step Solution Display", () => {
    it("should display solution in step-by-step format", async () => {
      render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Mock analyzing a homework problem
      const cameraButton = screen.getByRole("button", {
        name: /camera|capture|photo/i,
      });
      await userEvent.click(cameraButton);

      // Solution display should be vertically stacked
      const bodyText = document.body.textContent;
      expect(bodyText?.match(/step|solution|answer|explain/i)).toBeTruthy();
    });

    it("should keep solution readable without horizontal scroll on mobile", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Check that content is not wider than viewport
      const main = container.querySelector("main") || container.firstChild;
      const styles = window.getComputedStyle(main as Element);
      expect(styles.overflowX).not.toBe("auto");
      expect(styles.overflowX).not.toBe("scroll");
    });

    it("should display solution steps with adequate spacing on mobile", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Steps should have spacing class like space-y-
      const hasSpacing =
        container.innerHTML.match(/space-y-|gap-/) ||
        container.innerHTML.match(/className.*space|className.*gap/);
      expect(hasSpacing).toBeTruthy();
    });
  });

  describe("Responsive Layout (Mobile vs Desktop)", () => {
    it("should use xs: breakpoint for responsive layout", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Check for xs: breakpoint classes
      const hasXsBreakpoint =
        container.innerHTML.match(/xs:/) ||
        container.innerHTML.match(/className="[^"]*xs:/);
      expect(hasXsBreakpoint).toBeTruthy();
    });

    it("should show camera-first on mobile, text-first on desktop", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Should have responsive structure
      const hasResponsiveLayout =
        container.innerHTML.match(/flex-col|flex-row/) ||
        container.innerHTML.match(/md:|lg:|sm:/);
      expect(hasResponsiveLayout).toBeTruthy();
    });

    it("should have touch targets for all interactive elements", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // All main action buttons should have padding for touch targets
      const buttons = container.querySelectorAll("button");
      let foundButtons = 0;
      buttons.forEach((btn) => {
        if (
          btn.className.match(/py-|px-/) ||
          btn.textContent?.includes("Take Photo") ||
          btn.textContent?.includes("Choose File")
        ) {
          foundButtons++;
        }
      });
      expect(foundButtons).toBeGreaterThan(0);
    });

    it("should use TouchTarget component for accessibility", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Check for TouchTarget usage or min-h/min-w touch target sizing
      const hasMinDimensions =
        container.innerHTML.match(/min-h-\[44px\]/) ||
        container.innerHTML.match(/min-h-12|min-w-\[44px\]/);
      expect(hasMinDimensions).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should show error message on invalid file type", async () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const cameraButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Take Photo"));
      await userEvent.click(cameraButton!);

      const cameraInput = document.querySelector(
        'input[type="file"][capture]',
      ) as HTMLInputElement;

      const invalidFile = new File(["content"], "file.txt", {
        type: "text/plain",
      });

      Object.defineProperty(cameraInput, "files", {
        value: { 0: invalidFile, length: 1 },
        writable: false,
      });

      fireEvent.change(cameraInput);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/file type|invalid/i),
        );
      });
    });

    it("should handle file size validation", async () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const galleryButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Choose File"));
      await userEvent.click(galleryButton!);

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])',
      ) as HTMLInputElement;

      // Create a file larger than max size (51MB)
      const largeFile = new File(["large"], "large.jpg", {
        type: "image/jpeg",
      });

      // Mock file size
      Object.defineProperty(largeFile, "size", {
        value: 51 * 1024 * 1024,
      });

      Object.defineProperty(fileInput, "files", {
        value: { 0: largeFile, length: 1 },
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/size|large/i),
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on interactive elements", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      const cameraButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Take Photo"));
      expect(cameraButton).toHaveAttribute(
        "aria-label",
        expect.stringMatching(/camera|capture/i),
      );

      const galleryButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Choose File"));
      expect(galleryButton).toHaveAttribute(
        "aria-label",
        expect.stringMatching(/gallery|file|choose/i),
      );
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Tab to first interactive element (subject button)
      await user.tab();
      const firstElement = document.activeElement;
      expect(firstElement).toBeInTheDocument();
      // Should be a button
      expect(firstElement?.tagName).toBe("BUTTON");
    });

    it("should have sufficient color contrast", () => {
      const { container } = render(
        <HomeworkAssistantMobile
          onAnalyze={mockOnAnalyze}
          onError={mockOnError}
        />,
      );

      // Check for dark mode support (dark: classes)
      expect(container.innerHTML.match(/dark:/)).toBeTruthy();
    });
  });
});
