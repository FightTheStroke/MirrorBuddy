/**
 * Unit tests for ToolMaestroSelectionDialog component
 * Tests: rendering, accessibility, keyboard navigation, step flow
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolMaestroSelectionDialog } from "../tool-maestro-selection-dialog";
import { getTranslation } from "@/test/i18n-helpers";

const stripMotionProps = (props: Record<string, unknown>) => {
  const {
    whileHover: _whileHover,
    whileTap: _whileTap,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    variants: _variants,
    layout: _layout,
    layoutId: _layoutId,
    drag: _drag,
    dragConstraints: _dragConstraints,
    dragElastic: _dragElastic,
    dragMomentum: _dragMomentum,
    ...rest
  } = props;
  return rest;
};

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock next-intl with translations loaded dynamically from actual i18n files
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: { tool?: string }) => {
    const keyMap: Record<string, string> = {
      "toolSelection.title": "education.toolSelection.title",
      "toolSelection.chooseSubject": "education.toolSelection.chooseSubject",
      "toolSelection.chooseMaestro": "education.toolSelection.chooseMaestro",
      "toolSelection.chooseProfessor":
        "education.toolSelection.chooseProfessor",
      "toolSelection.back": "education.toolSelection.back",
      "toolSelection.confirm": "common.confirm",
      "toolSelection.close": "education.toolSelection.close",
    };
    const translationKey = keyMap[key];
    if (translationKey) {
      let text = getTranslation(translationKey);
      // Handle interpolation
      if (params?.tool) {
        text = text.replace("{tool}", params.tool);
      }
      return text;
    }
    return key;
  },
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock maestri data - defined inside the factory to avoid hoisting issues
vi.mock("@/data", () => {
  const maestriData = [
    {
      id: "euclide",
      name: "euclide",
      displayName: "Euclide",
      subject: "mathematics",
      specialty: "Geometria",
      avatar: "/maestri/euclide.webp",
      personality: "Logico",
      teachingStyle: "Deduttivo",
      voiceId: "alloy",
      color: "#4A90D9",
      gradient: "from-blue-500 to-blue-600",
      systemPrompt: "Test prompt",
      greeting: "Ciao!",
    },
    {
      id: "feynman",
      name: "feynman",
      displayName: "Feynman",
      subject: "physics",
      specialty: "Fisica Quantistica",
      avatar: "/maestri/feynman.webp",
      personality: "Curioso",
      teachingStyle: "Intuitivo",
      voiceId: "echo",
      color: "#9B59B6",
      gradient: "from-purple-500 to-purple-600",
      systemPrompt: "Test prompt",
      greeting: "Ciao!",
    },
  ];

  const subjectsData = ["mathematics", "physics", "history"];

  return {
    getMaestriBySubject: (subject: string) =>
      maestriData.filter((m) => m.subject === subject),
    getAllSubjects: () => subjectsData,
    maestri: maestriData,
  };
});

describe("ToolMaestroSelectionDialog", () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders nothing when closed", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={false}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders dialog when open", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("displays correct tool label for mindmap", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      // Now uses capitalized tool type instead of translation
      expect(screen.getByText(/Mindmap/)).toBeInTheDocument();
    });

    it("displays correct tool label for quiz", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="quiz"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText(/Quiz/)).toBeInTheDocument();
    });

    it("renders professor selection cards", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      // Check for presence of professor names from mock data
      expect(screen.getByText("Euclide")).toBeInTheDocument();
      expect(screen.getByText("Feynman")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it('has role="dialog" attribute', () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it('has aria-modal="true" attribute', () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has aria-labelledby pointing to title", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");
      // Check the title element exists and has the right id
      const titleElement = document.getElementById("dialog-title");
      expect(titleElement).toBeInTheDocument();
    });

    it("close button has aria-label", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(
        screen.getByRole("button", {
          name: getTranslation("education.toolSelection.close"),
        }),
      ).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("closes on Escape key", async () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("all professor cards are keyboard accessible", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });

  describe("Step Flow", () => {
    it("shows professors directly without subject step", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      // Check for title with professor selection
      const titleElement = document.getElementById("dialog-title");
      expect(titleElement).toBeInTheDocument();
      // Should show professors immediately
      expect(screen.getByText("Euclide")).toBeInTheDocument();
      expect(screen.getByText("Feynman")).toBeInTheDocument();
    });

    it("shows all professors immediately on open", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Should show all maestri immediately without subject selection
      expect(screen.getByText("Euclide")).toBeInTheDocument();
      expect(screen.getByText("Feynman")).toBeInTheDocument();
    });

    it("calls onConfirm when professor is selected", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Click a professor directly
      await user.click(screen.getByText("Euclide"));

      // Should call onConfirm with chat mode
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ id: "euclide" }),
          "chat",
        );
      });
    });

    it("shows all professors directly without subject step", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Should show professors immediately
      expect(screen.getByText("Euclide")).toBeInTheDocument();
      expect(screen.getByText("Feynman")).toBeInTheDocument();
    });

    it("does not show back button since there is no subject step", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Back button should not be present
      expect(
        screen.queryByText(getTranslation("education.toolSelection.back")),
      ).not.toBeInTheDocument();
    });
  });

  describe("Direct Confirmation (No Mode Selection)", () => {
    it("calls onConfirm immediately when professor selected", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Professors are shown immediately, select one
      await user.click(screen.getByText("Euclide"));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ id: "euclide" }),
          "chat",
        );
      });
    });

    it("always uses chat mode (no voice/chat selection)", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Select professor directly
      await user.click(screen.getByText("Feynman"));

      await waitFor(() => {
        // Should be called with 'chat' mode directly
        expect(mockOnConfirm).toHaveBeenCalledWith(expect.any(Object), "chat");
      });
    });
  });

  describe("Close Behavior", () => {
    it("calls onClose when clicking close button", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      await user.click(
        screen.getByRole("button", {
          name: getTranslation("education.toolSelection.close"),
        }),
      );

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking backdrop", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Click the backdrop (the outer div)
      const backdrop = screen.getByRole("dialog").parentElement;
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("shows professors again when reopened after closing", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Verify professors are shown
      expect(screen.getByText("Euclide")).toBeInTheDocument();

      // Close via close button
      await user.click(
        screen.getByRole("button", {
          name: getTranslation("education.toolSelection.close"),
        }),
      );

      // Simulate parent responding to onClose by setting isOpen=false then true
      rerender(
        <ToolMaestroSelectionDialog
          isOpen={false}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      rerender(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Should show professors again
      expect(screen.getByText("Euclide")).toBeInTheDocument();
      expect(screen.getByText("Feynman")).toBeInTheDocument();
    });
  });
});
