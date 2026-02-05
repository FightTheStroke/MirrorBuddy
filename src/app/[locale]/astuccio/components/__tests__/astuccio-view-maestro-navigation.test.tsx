/**
 * Unit tests for AstuccioView maestro navigation
 * Tests: T3-03 - Navigate to professor page with tool query param
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AstuccioView } from "../astuccio-view";
import type { Maestro } from "@/types";

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

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    locale: "it",
  }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    section: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <section {...stripMotionProps(props)}>{children}</section>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...stripMotionProps(props)}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock dialog component with controllable callbacks
// Needs to be reassigned in mock implementation
let __mockDialogOnConfirm:
  | ((maestro: Maestro, mode: "voice" | "chat") => void)
  | null = null;

vi.mock("@/components/education/tool-maestro-selection-dialog", () => ({
  ToolMaestroSelectionDialog: ({
    isOpen,
    onConfirm,
    toolType,
  }: {
    isOpen: boolean;
    onConfirm: (maestro: Maestro, mode: "voice" | "chat") => void;
    toolType: string;
  }) => {
    __mockDialogOnConfirm = onConfirm;
    return isOpen ? (
      <div data-testid="maestro-dialog">
        <div data-testid="tool-type">{toolType}</div>
        <button
          data-testid="confirm-maestro"
          onClick={() => {
            const mockMaestro: Maestro = {
              id: "aristotele",
              name: "Aristotele",
              displayName: "Prof. Aristotele",
              subject: "philosophy",
              specialty: "Ancient Philosophy",
              voice: "sage",
              voiceInstructions: "Speak wisely",
              teachingStyle: "Socratic method",
              avatar: "/avatars/aristotele.webp",
              color: "#8B7355",
              systemPrompt: "You are Aristotle",
              greeting: "Welcome, student",
            };
            onConfirm(mockMaestro, "chat");
          }}
        >
          Confirm
        </button>
      </div>
    ) : null;
  },
}));

// Mock other components
vi.mock("../astuccio-info-section", () => ({
  AstuccioInfoSection: () => <div data-testid="info-section" />,
}));

vi.mock("@/components/study-kit/StudyKitView", () => ({
  StudyKitView: () => <div data-testid="study-kit-view" />,
}));

vi.mock("@/components/typing/TypingView", () => ({
  TypingView: () => <div data-testid="typing-view" />,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <div data-testid="page-header">{title}</div>
  ),
}));

vi.mock("@/components/tools/webcam-capture", () => ({
  WebcamCapture: () => <div data-testid="webcam-capture" />,
}));

describe("AstuccioView - Maestro Navigation (T3-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __mockDialogOnConfirm = null;
  });

  it("should navigate to professor page with tool query param when maestro is confirmed", () => {
    render(<AstuccioView />);

    // Find and click a tool that requires maestro (e.g., "Mappa Mentale" - mindmap)
    const buttons = screen.getAllByRole("button");
    const mindmapButton = buttons.find((btn) =>
      btn.textContent?.toLowerCase().includes("mappa mentale"),
    );

    expect(mindmapButton).toBeDefined();

    if (mindmapButton) {
      fireEvent.click(mindmapButton);

      // Maestro dialog should open
      const maestroDialog = screen.getByTestId("maestro-dialog");
      expect(maestroDialog).toBeInTheDocument();

      // Confirm maestro selection
      const confirmButton = screen.getByTestId("confirm-maestro");
      fireEvent.click(confirmButton);

      // Should navigate with correct URL format: /{locale}/maestri/{maestroId}?tool={toolType}
      expect(mockPush).toHaveBeenCalledWith(
        "/it/maestri/aristotele?tool=mindmap",
      );
    }
  });

  it("should include correct tool type in URL for different tools", async () => {
    const user = userEvent.setup();
    render(<AstuccioView />);

    // Find flashcard tool instead (quiz might not require maestro)
    const buttons = screen.getAllByRole("button");
    const flashcardButton = buttons.find((btn) =>
      btn.textContent?.toLowerCase().includes("flashcard"),
    );

    if (flashcardButton) {
      await user.click(flashcardButton);

      // Dialog renders synchronously, so use getByTestId
      const confirmButton = screen.getByTestId("confirm-maestro");
      await user.click(confirmButton);

      // Should navigate with flashcard tool type
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/it/maestri/aristotele?tool=flashcard",
        );
      });
    }
  });

  it("should use current locale in navigation URL", async () => {
    const user = userEvent.setup();
    render(<AstuccioView />);

    const buttons = screen.getAllByRole("button");
    const mindmapButton = buttons.find((btn) =>
      btn.textContent?.toLowerCase().includes("mappa mentale"),
    );

    if (mindmapButton) {
      await user.click(mindmapButton);
      const confirmButton = screen.getByTestId("confirm-maestro");
      await user.click(confirmButton);

      // Should use 'it' locale from useParams mock
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining("/it/maestri/"),
        );
      });
    }
  });

  it("should NOT call onToolRequest callback when navigating", async () => {
    const user = userEvent.setup();
    const mockOnToolRequest = vi.fn();
    render(<AstuccioView onToolRequest={mockOnToolRequest} />);

    const buttons = screen.getAllByRole("button");
    const mindmapButton = buttons.find((btn) =>
      btn.textContent?.toLowerCase().includes("mappa mentale"),
    );

    if (mindmapButton) {
      await user.click(mindmapButton);
      const confirmButton = screen.getByTestId("confirm-maestro");
      await user.click(confirmButton);

      // Old callback should NOT be called anymore
      await waitFor(() => {
        expect(mockOnToolRequest).not.toHaveBeenCalled();
        // Navigation should happen instead
        expect(mockPush).toHaveBeenCalled();
      });
    }
  });
});
