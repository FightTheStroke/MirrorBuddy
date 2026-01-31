/**
 * Unit tests for ToolMaestroSelectionDialog component
 * Tests: rendering, accessibility, keyboard navigation, step flow
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolMaestroSelectionDialog } from "../tool-maestro-selection-dialog";

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

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: { tool?: string }) => {
    const translations: Record<string, string> = {
      "toolSelection.title": "Seleziona Argomento e Maestro",
      "toolSelection.chooseSubject": params?.tool
        ? `Scegli Materia per ${params.tool}`
        : "Scegli Materia",
      "toolSelection.chooseMaestro": "Scegli Maestro",
      "toolSelection.chooseProfessor": params?.tool
        ? `Scegli Professore per ${params.tool}`
        : "Scegli Professore",
      "toolSelection.back": "Indietro",
      "toolSelection.confirm": "Conferma",
      "toolSelection.close": "Chiudi",
      "subjects.mathematics": "Matematica",
      "subjects.physics": "Fisica",
      "subjects.history": "Storia",
      "tools.mindmap": "Mappa Mentale",
      "tools.flashcard": "Flashcard",
      "tools.quiz": "Quiz",
    };
    return translations[key] || key;
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

    it("renders subject selection buttons", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText("Matematica")).toBeInTheDocument();
      expect(screen.getByText("Fisica")).toBeInTheDocument();
      expect(screen.getByText("Storia")).toBeInTheDocument();
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
      expect(screen.getByText(/Scegli Materia/)).toHaveAttribute(
        "id",
        "dialog-title",
      );
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
        screen.getByRole("button", { name: "Chiudi" }),
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

    it("all subject buttons are keyboard accessible", () => {
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
    it("starts at subject step", () => {
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText(/Scegli Materia/)).toBeInTheDocument();
    });

    it("calls onConfirm immediately when subject has single maestro", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Click Mathematics (which has Euclide)
      await user.click(screen.getByText("Matematica"));

      // Should skip maestro selection and call onConfirm directly with chat mode
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ id: "euclide" }),
          "chat",
        );
      });
    });

    it("advances to maestro step when subject has no specific maestro", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Click History (which has no maestro in our mock)
      await user.click(screen.getByText("Storia"));

      // Should show all maestri
      await waitFor(() => {
        expect(screen.getByText(/Scegli Professore/)).toBeInTheDocument();
        expect(screen.getByText("Euclide")).toBeInTheDocument();
        expect(screen.getByText("Feynman")).toBeInTheDocument();
      });
    });

    it("shows back button on maestro step", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      await user.click(screen.getByText("Storia"));

      await waitFor(() => {
        expect(screen.getByText("Indietro")).toBeInTheDocument();
      });
    });

    it("goes back to subject step when clicking Indietro", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      await user.click(screen.getByText("Storia"));
      await user.click(screen.getByText("Indietro"));

      await waitFor(() => {
        expect(screen.getByText(/Scegli Materia/)).toBeInTheDocument();
      });
    });
  });

  describe("Direct Confirmation (No Mode Selection)", () => {
    it("calls onConfirm immediately when maestro selected", async () => {
      const user = userEvent.setup();
      render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Select a subject with no maestro to get to maestro step
      await user.click(screen.getByText("Storia"));

      // Select a maestro
      await waitFor(() => {
        expect(screen.getByText("Euclide")).toBeInTheDocument();
      });

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

      // Select subject with single maestro
      await user.click(screen.getByText("Matematica"));

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

      await user.click(screen.getByRole("button", { name: "Chiudi" }));

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

    it("resets state when closed via close button", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="mindmap"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />,
      );

      // Go to maestro step
      await user.click(screen.getByText("Storia"));
      expect(screen.getByText(/Scegli Professore/)).toBeInTheDocument();

      // Close via close button (which calls handleClose that resets state)
      await user.click(screen.getByRole("button", { name: "Chiudi" }));

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

      // Should be back at subject step since handleClose reset state
      expect(screen.getByText(/Scegli Materia/)).toBeInTheDocument();
    });
  });
});
