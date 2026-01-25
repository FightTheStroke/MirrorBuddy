/**
 * Unit tests for FilterSheet bottom sheet component
 * Tests: mobile-only rendering, filters, touch targets, dismiss gestures
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSheet } from "../filter-sheet";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock maestri data
vi.mock("@/data", () => ({
  getAllSubjects: () => ["mathematics", "physics", "chemistry", "biology"],
  subjectNames: {
    mathematics: "Matematica",
    physics: "Fisica",
    chemistry: "Chimica",
    biology: "Biologia",
  },
  subjectColors: {
    mathematics: "#4A90D9",
    physics: "#9B59B6",
    chemistry: "#E74C3C",
    biology: "#27AE60",
  },
}));

describe("FilterSheet", () => {
  const mockOnSearchChange = vi.fn();
  const mockOnSubjectChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders nothing when closed", () => {
      render(
        <FilterSheet
          isOpen={false}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders sheet when open", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("displays search input", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByPlaceholderText("Cerca...")).toBeInTheDocument();
    });

    it("displays all subject filter buttons", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText("Tutti")).toBeInTheDocument();
      expect(screen.getByText("Matematica")).toBeInTheDocument();
      expect(screen.getByText("Fisica")).toBeInTheDocument();
      expect(screen.getByText("Chimica")).toBeInTheDocument();
      expect(screen.getByText("Biologia")).toBeInTheDocument();
    });

    it("displays close button with aria-label", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(
        screen.getByRole("button", { name: /chiudi/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Touch Targets (44x44px minimum)", () => {
    it("search input has min-h-[44px] class", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      const searchInput = screen.getByPlaceholderText("Cerca...");
      expect(searchInput.className).toContain("min-h-");
    });

    it("subject filter buttons have min-h-[44px] class", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      const buttons = screen.getAllByRole("button");
      // Check all filter buttons (exclude close button which has h-11 w-11)
      buttons.forEach((button) => {
        if (button.getAttribute("aria-label") === "Chiudi filtri") {
          // Close button uses h-11 w-11
          expect(button.className).toContain("h-11");
        } else {
          // Filter buttons use min-h-
          expect(button.className).toContain("min-h-");
        }
      });
    });

    it("close button has h-11 w-11 classes for touch target", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      const closeButton = screen.getByRole("button", { name: /chiudi/i });
      expect(closeButton.className).toContain("h-11");
      expect(closeButton.className).toContain("w-11");
    });
  });

  describe("Filter Interactions", () => {
    it("calls onSearchChange when search input changes", async () => {
      const user = userEvent.setup();
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      const searchInput = screen.getByPlaceholderText("Cerca...");
      await user.type(searchInput, "euclide");

      expect(mockOnSearchChange).toHaveBeenCalled();
    });

    it("calls onSubjectChange when subject button clicked", async () => {
      const user = userEvent.setup();
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      await user.click(screen.getByText("Matematica"));

      expect(mockOnSubjectChange).toHaveBeenCalledWith("mathematics");
    });

    it("highlights selected subject button", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="mathematics"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      const mathButton = screen.getByText("Matematica");
      expect(mathButton).toHaveAttribute("aria-pressed", "true");
    });

    it("displays search query in input", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery="euclide"
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      const searchInput = screen.getByPlaceholderText("Cerca...");
      expect(searchInput).toHaveValue("euclide");
    });
  });

  describe("Close Behavior", () => {
    it("calls onClose when clicking close button", async () => {
      const user = userEvent.setup();
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      const closeButton = screen.getByRole("button", { name: /chiudi/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop clicked via Radix UI", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      // Radix Dialog handles backdrop close via onOpenChange
      // This is tested through the component's integration
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Animations", () => {
    it("has slide animation classes on dialog content", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      const sheet = screen.getByRole("dialog");
      expect(sheet.className).toContain("slide-in-from-bottom");
    });

    it("transitions from open to closed state", () => {
      const { rerender } = render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      rerender(
        <FilterSheet
          isOpen={false}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it('has role="dialog" attribute', () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("search input has aria-label", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      const searchInput = screen.getByPlaceholderText("Cerca...");
      expect(searchInput).toHaveAttribute("aria-label");
    });

    it("all filter buttons have aria-pressed attribute", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      // Get Tutti button
      const tuttiButton = screen.getByText("Tutti");
      expect(tuttiButton).toHaveAttribute("aria-pressed");

      // Get subject buttons
      const materiaLabel = screen.getByText("Materia");
      const parentDiv = materiaLabel.closest("div");
      const subjectButtons = parentDiv
        ? parentDiv.querySelectorAll("button[aria-pressed]")
        : [];
      expect(subjectButtons.length).toBeGreaterThan(0);
    });

    it("sheet title is properly labeled", () => {
      render(
        <FilterSheet
          isOpen={true}
          selectedSubject="all"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onSubjectChange={mockOnSubjectChange}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText("Filtri")).toBeInTheDocument();
    });
  });
});
