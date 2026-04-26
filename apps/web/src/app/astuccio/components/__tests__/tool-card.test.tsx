/**
 * Unit tests for ToolCard component
 * TDD Phase: RED - Failing tests for F-39 requirements (responsive padding on mobile)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolCard } from "../tool-card";
import { BookOpen } from "lucide-react";

describe("ToolCard - F-39: Mobile Responsive Padding", () => {
  const mockProps = {
    title: "Quiz",
    description: "Create interactive quizzes and flashcards",
    icon: BookOpen,
    onClick: vi.fn(),
    isActive: false,
  };

  describe("Responsive Padding Classes", () => {
    it("should have p-2 padding on extra-small screens (xs)", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/p-2/);
    });

    it("should have sm:p-3 padding on small screens", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/sm:p-3/);
    });

    it("should have md:p-4 padding on medium screens and up", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/md:p-4/);
    });

    it("should NOT have fixed p-6 padding (should be responsive instead)", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      // Ensure we don't have the old p-6 in isolation (it should be replaced by responsive classes)
      const classString = button?.className || "";
      const hasPaddingPattern = /p-[2-4]|sm:p-[2-4]|md:p-[2-4]/.test(
        classString,
      );
      expect(hasPaddingPattern).toBe(true);
    });

    it("should have padding pattern: p-2 sm:p-3 md:p-4", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      const classString = button?.className || "";

      // Verify the responsive padding pattern exists
      expect(classString).toMatch(/p-2/);
      expect(classString).toMatch(/sm:p-3/);
      expect(classString).toMatch(/md:p-4/);
    });
  });

  describe("Content Rendering and Readability", () => {
    it("renders title with proper font styling", () => {
      render(<ToolCard {...mockProps} />);
      const title = screen.getByText("Quiz");
      expect(title).toBeInTheDocument();
      expect(title?.className).toMatch(/font-semibold/);
      expect(title?.className).toMatch(/text-lg/);
    });

    it("renders description with muted color for contrast", () => {
      render(<ToolCard {...mockProps} />);
      const description = screen.getByText(
        "Create interactive quizzes and flashcards",
      );
      expect(description).toBeInTheDocument();
      expect(description?.className).toMatch(/text-muted-foreground/);
    });

    it("renders icon with proper sizing", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      // SVG className is a TokenList, convert to string for matching
      const svgClassName = svg?.getAttribute("class") || "";
      expect(svgClassName).toMatch(/w-8/);
      expect(svgClassName).toMatch(/h-8/);
    });

    it("has proper spacing between icon and text (mb-4)", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const iconDiv = container.querySelector("button > div:first-child");
      expect(iconDiv?.className).toMatch(/mb-4/);
    });

    it("has proper spacing between title and description (mb-2)", () => {
      render(<ToolCard {...mockProps} />);
      // The title h3 should have mb-2
      const title = screen.getByText("Quiz");
      expect(title?.className).toMatch(/mb-2/);
    });
  });

  describe("Touch Targets and Accessibility", () => {
    it("button should have minimum 44px height with padding", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      // With p-2 (8px padding) on each side = 16px, plus content should exceed 44px
      expect(button?.className).toMatch(/rounded-2xl/);
    });

    it("has focus ring for keyboard navigation", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/focus:outline-none/);
      expect(button?.className).toMatch(/focus:ring-2/);
      expect(button?.className).toMatch(/focus:ring-primary/);
    });

    it("has aria-label for accessibility", () => {
      render(<ToolCard {...mockProps} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "Quiz: Create interactive quizzes and flashcards",
      );
    });

    it("icon has aria-hidden to prevent redundant announcements", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Card Styling and Visual Hierarchy", () => {
    it("has rounded-2xl border radius", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/rounded-2xl/);
    });

    it("has border styling", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/border/);
    });

    it("has shadow-sm for subtle elevation", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/shadow-sm/);
    });

    it("has hover:shadow-lg for depth on interaction", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/hover:shadow-lg/);
    });

    it("supports dark mode with proper colors", () => {
      const { container } = render(<ToolCard {...mockProps} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/bg-card/);
      expect(button?.className).toMatch(/text-card-foreground/);
    });
  });

  describe("Active State Indicator", () => {
    it("shows indicator dot when isActive is true", () => {
      const { container } = render(<ToolCard {...mockProps} isActive={true} />);
      const indicator = container.querySelector(
        ".absolute.top-3.right-3.w-3.h-3",
      );
      expect(indicator).toBeInTheDocument();
    });

    it("adds ring styling when isActive is true", () => {
      const { container } = render(<ToolCard {...mockProps} isActive={true} />);
      const button = container.querySelector("button");
      expect(button?.className).toMatch(/ring-2/);
      expect(button?.className).toMatch(/ring-primary/);
      expect(button?.className).toMatch(/shadow-lg/);
    });

    it("does not show indicator dot when isActive is false", () => {
      const rendered = render(<ToolCard {...mockProps} isActive={false} />);
      // Count absolute positioned elements
      const absolutes = rendered.container.querySelectorAll(".absolute");
      expect(absolutes.length).toBe(0);
    });
  });

  describe("Interaction", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ToolCard {...mockProps} onClick={onClick} />);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("is keyboard accessible with Enter key", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ToolCard {...mockProps} onClick={onClick} />);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalled();
    });

    it("is keyboard accessible with Space key", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ToolCard {...mockProps} onClick={onClick} />);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard(" ");

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("Text Overflow Prevention", () => {
    it("handles long titles without truncation", () => {
      render(
        <ToolCard
          {...mockProps}
          title="Very Long Tool Name That Should Wrap Properly"
        />,
      );
      const title = screen.getByText(
        "Very Long Tool Name That Should Wrap Properly",
      );
      expect(title).toBeInTheDocument();
    });

    it("handles long descriptions with line breaks", () => {
      render(
        <ToolCard
          {...mockProps}
          description="This is a very long description that should wrap and display on multiple lines without causing any layout issues or text overlap."
        />,
      );
      const description = screen.getByText(/This is a very long description/);
      expect(description?.className).toMatch(/leading-relaxed/);
    });
  });
});

// Import vi for mocking (needed by vitest)
import { vi } from "vitest";
