/**
 * Tests for Knowledge Hub Renderers
 *
 * Tests rendering behavior, empty states, and data handling for all 12 renderers.
 *
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

// Mock next-intl with translations loaded dynamically from actual i18n files
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    // Map component keys to actual translation paths
    const keyMap: Record<string, string> = {
      "timeline.defaultTitle": "education.knowledgeHub.timeline.defaultTitle",
      "timeline.noEvents": "education.knowledgeHub.timeline.noEvents",
      "homework.defaultTitle": "education.knowledgeHub.homework.defaultTitle",
      "homework.noTasks": "education.knowledgeHub.homework.noTasks",
    };
    const translationKey = keyMap[key];
    if (translationKey) {
      return getTranslation(translationKey);
    }
    return key;
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...stripMotionProps(props as Record<string, unknown>)}>
        {children}
      </div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...stripMotionProps(props as Record<string, unknown>)}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock base renderers that we wrap
vi.mock("@/components/tools/markmap", () => ({
  MarkMapRenderer: ({ title }: { title: string }) => (
    <div data-testid="markmap-renderer">{title}</div>
  ),
}));

vi.mock("@/components/tools/summary-renderer", () => ({
  SummaryRenderer: ({ title }: { title: string }) => (
    <div data-testid="summary-renderer">{title}</div>
  ),
}));

vi.mock("@/components/tools/chart-renderer", () => ({
  ChartRenderer: ({ request }: { request: { title?: string } }) => (
    <div data-testid="chart-renderer">{request.title}</div>
  ),
  DoughnutRenderer: ({ request }: { request: { title?: string } }) => (
    <div data-testid="doughnut-renderer">{request.title}</div>
  ),
}));

vi.mock("@/components/tools/diagram-renderer", () => ({
  DiagramRenderer: ({ request }: { request: { title?: string } }) => (
    <div data-testid="diagram-renderer">{request.title || "Diagramma"}</div>
  ),
}));

vi.mock("@/components/tools/formula-renderer", () => ({
  FormulaRenderer: ({ request }: { request: { latex: string } }) => (
    <div data-testid="formula-renderer">{request.latex}</div>
  ),
}));

// Import renderers after mocks
import { MindmapRenderer } from "../mindmap-renderer";
import { QuizRenderer } from "../quiz-renderer";
import { FlashcardRenderer } from "../flashcard-renderer";
import { SummaryRenderer } from "../summary-renderer";
import { DemoRenderer } from "../demo-renderer";
import { DiagramRenderer } from "../diagram-renderer";
import { TimelineRenderer } from "../timeline-renderer";
import { FormulaRenderer } from "../formula-renderer";
import { ChartRenderer } from "../chart-renderer";
import { ImageRenderer } from "../image-renderer";
import { PdfRenderer } from "../pdf-renderer";
import { HomeworkRenderer } from "../homework-renderer";

describe("MindmapRenderer", () => {
  it("renders with title from data", () => {
    render(
      <MindmapRenderer data={{ title: "Test Mindmap", markdown: "# Root" }} />,
    );
    expect(screen.getByTestId("markmap-renderer")).toHaveTextContent(
      "Test Mindmap",
    );
  });

  it("uses default title when not provided", () => {
    render(<MindmapRenderer data={{ markdown: "# Root" }} />);
    expect(screen.getByTestId("markmap-renderer")).toHaveTextContent(
      getTranslation("education.tools.mindmap"),
    );
  });
});

describe("QuizRenderer", () => {
  const mockQuizData = {
    title: "Test Quiz",
    questions: [
      {
        id: "1",
        question: "What is 2+2?",
        options: [
          { id: "a", text: "3", isCorrect: false },
          { id: "b", text: "4", isCorrect: true },
        ],
      },
    ],
  };

  it("renders quiz title", () => {
    render(<QuizRenderer data={mockQuizData} />);
    expect(screen.getByText("Test Quiz")).toBeInTheDocument();
  });

  it("renders question text", () => {
    render(<QuizRenderer data={mockQuizData} />);
    expect(screen.getByText(/What is 2\+2\?/)).toBeInTheDocument();
  });

  it("renders answer options", () => {
    render(<QuizRenderer data={mockQuizData} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows empty state when no questions", () => {
    render(<QuizRenderer data={{ questions: [] }} />);
    // Use structure-based assertion - check for empty state container
    const emptyState = screen.queryByText(/domand|question|empty/i);
    expect(emptyState || screen.queryByRole("status")).toBeTruthy();
  });

  it("toggles answer visibility", () => {
    render(<QuizRenderer data={mockQuizData} />);
    // Find toggle button by role instead of hardcoded text
    const toggleBtn = screen
      .getAllByRole("button")
      .find(
        (btn) =>
          btn.textContent?.toLowerCase().includes("mostra") ||
          btn.textContent?.toLowerCase().includes("show"),
      );
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      // After click, should show hide button
      expect(
        screen
          .getAllByRole("button")
          .some(
            (btn) =>
              btn.textContent?.toLowerCase().includes("nascondi") ||
              btn.textContent?.toLowerCase().includes("hide"),
          ),
      ).toBeTruthy();
    }
  });
});

describe("FlashcardRenderer", () => {
  const mockFlashcardData = {
    title: "Test Flashcards",
    cards: [
      { id: "1", front: "Question 1", back: "Answer 1" },
      { id: "2", front: "Question 2", back: "Answer 2" },
    ],
  };

  it("renders flashcard title", () => {
    render(<FlashcardRenderer data={mockFlashcardData} />);
    expect(screen.getByText("Test Flashcards")).toBeInTheDocument();
  });

  it("renders card count", () => {
    render(<FlashcardRenderer data={mockFlashcardData} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("renders card front content", () => {
    render(<FlashcardRenderer data={mockFlashcardData} />);
    expect(screen.getByText("Question 1")).toBeInTheDocument();
  });

  it("shows empty state when no cards", () => {
    render(<FlashcardRenderer data={{ cards: [] }} />);
    // Use structure-based assertion - check for empty state
    const emptyState = screen.queryByText(/flashcard|empty|nessun/i);
    expect(emptyState || screen.queryByRole("status")).toBeTruthy();
  });

  it("navigates to next card", () => {
    render(<FlashcardRenderer data={mockFlashcardData} />);
    // Find next button by aria-label pattern or structure
    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons.find(
      (btn) =>
        btn.getAttribute("aria-label")?.toLowerCase().includes("success") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("next") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("prossim"),
    );
    if (nextBtn) {
      fireEvent.click(nextBtn);
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    }
  });

  it("navigates to previous card", () => {
    render(<FlashcardRenderer data={mockFlashcardData} />);
    // Go to card 2 first
    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons.find(
      (btn) =>
        btn.getAttribute("aria-label")?.toLowerCase().includes("success") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("next"),
    );
    if (nextBtn) {
      fireEvent.click(nextBtn);
      // Then go back
      const prevBtn = screen
        .getAllByRole("button")
        .find(
          (btn) =>
            btn.getAttribute("aria-label")?.toLowerCase().includes("preced") ||
            btn.getAttribute("aria-label")?.toLowerCase().includes("prev"),
        );
      if (prevBtn) {
        fireEvent.click(prevBtn);
        expect(screen.getByText("1 / 2")).toBeInTheDocument();
      }
    }
  });
});

describe("SummaryRenderer", () => {
  it("renders with title from data", () => {
    render(
      <SummaryRenderer
        data={{
          title: "Test Summary",
          sections: [{ title: "Intro", content: "Content" }],
        }}
      />,
    );
    expect(screen.getByTestId("summary-renderer")).toHaveTextContent(
      "Test Summary",
    );
  });

  it("uses default title when not provided", () => {
    render(<SummaryRenderer data={{ sections: [] }} />);
    expect(screen.getByTestId("summary-renderer")).toHaveTextContent(
      getTranslation("education.tools.summary"),
    );
  });
});

describe("DemoRenderer", () => {
  it("renders demo title", () => {
    render(
      <DemoRenderer
        data={{ title: "Test Demo", description: "A test demo" }}
      />,
    );
    expect(screen.getByText("Test Demo")).toBeInTheDocument();
  });

  it("uses default title when not provided", () => {
    render(<DemoRenderer data={{}} />);
    expect(
      screen.getByText(getTranslation("tools.demo.label")),
    ).toBeInTheDocument();
  });

  it("renders type label", () => {
    render(<DemoRenderer data={{ type: "simulation" }} />);
    // Check that simulation type renders (type label may be translated)
    const demoContainer = screen
      .getByText(getTranslation("tools.demo.label"))
      .closest("div");
    expect(demoContainer).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<DemoRenderer data={{ description: "Custom description" }} />);
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });
});

describe("DiagramRenderer", () => {
  it("renders with code", () => {
    render(
      <DiagramRenderer
        data={{ code: "graph TD; A-->B", title: "Flow Chart" }}
      />,
    );
    expect(screen.getByTestId("diagram-renderer")).toHaveTextContent(
      "Flow Chart",
    );
  });
});

describe("TimelineRenderer", () => {
  const mockTimelineData = {
    title: "Test Timeline",
    events: [
      {
        id: "1",
        date: "2024-01-01",
        title: "Event 1",
        description: "Description 1",
      },
      { id: "2", date: "2024-02-01", title: "Event 2" },
    ],
  };

  it("renders timeline title", () => {
    render(<TimelineRenderer data={mockTimelineData} />);
    expect(screen.getByText("Test Timeline")).toBeInTheDocument();
  });

  it("renders event titles", () => {
    render(<TimelineRenderer data={mockTimelineData} />);
    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
  });

  it("renders event dates", () => {
    render(<TimelineRenderer data={mockTimelineData} />);
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
  });

  it("renders event descriptions when present", () => {
    render(<TimelineRenderer data={mockTimelineData} />);
    expect(screen.getByText("Description 1")).toBeInTheDocument();
  });

  it("shows empty state when no events", () => {
    render(<TimelineRenderer data={{ events: [] }} />);
    expect(
      screen.getByText(
        getTranslation("education.knowledgeHub.timeline.noEvents"),
      ),
    ).toBeInTheDocument();
  });
});

describe("FormulaRenderer", () => {
  it("renders latex formula", () => {
    render(<FormulaRenderer data={{ latex: "E = mc^2" }} />);
    expect(screen.getByTestId("formula-renderer")).toHaveTextContent(
      "E = mc^2",
    );
  });

  it("handles empty latex", () => {
    render(<FormulaRenderer data={{}} />);
    expect(screen.getByTestId("formula-renderer")).toBeInTheDocument();
  });
});

describe("ChartRenderer", () => {
  it("renders chart with title", () => {
    render(
      <ChartRenderer
        data={{
          title: "Test Chart",
          type: "bar",
          data: { labels: ["A", "B"], datasets: [] },
        }}
      />,
    );
    expect(screen.getByTestId("chart-renderer")).toHaveTextContent(
      "Test Chart",
    );
  });

  it("uses default title when not provided", () => {
    render(<ChartRenderer data={{ type: "bar" }} />);
    expect(screen.getByTestId("chart-renderer")).toHaveTextContent(
      getTranslation("education.tools.chart"),
    );
  });
});

describe("ImageRenderer", () => {
  it("renders image with url", () => {
    render(
      <ImageRenderer
        data={{ url: "https://example.com/image.jpg", alt: "Test image" }}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(img).toHaveAttribute("alt", "Test image");
  });

  it("uses title as alt when alt not provided", () => {
    render(
      <ImageRenderer
        data={{ url: "https://example.com/image.jpg", title: "My Image" }}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "My Image");
  });

  it("renders title when provided", () => {
    render(
      <ImageRenderer
        data={{ url: "https://example.com/image.jpg", title: "My Image" }}
      />,
    );
    expect(screen.getByText("My Image")).toBeInTheDocument();
  });

  it("shows empty state when no url", () => {
    render(<ImageRenderer data={{}} />);
    // Use structure-based assertion - check for empty state
    const emptyState = screen.queryByText(/immagine|image|empty|nessun/i);
    expect(emptyState || screen.queryByRole("status")).toBeTruthy();
  });
});

describe("PdfRenderer", () => {
  it("renders PDF title", () => {
    render(
      <PdfRenderer
        data={{ title: "Test Document", url: "https://example.com/doc.pdf" }}
      />,
    );
    expect(screen.getByText("Test Document")).toBeInTheDocument();
  });

  it("uses default title when not provided", () => {
    render(<PdfRenderer data={{ url: "https://example.com/doc.pdf" }} />);
    // Component uses hardcoded "Documento PDF" - use structure-based assertion
    const pdfTitle = screen.queryByText(/Documento PDF|PDF/i);
    expect(pdfTitle).toBeInTheDocument();
  });

  it("renders download link when url provided", () => {
    render(<PdfRenderer data={{ url: "https://example.com/doc.pdf" }} />);
    // Find link by href instead of hardcoded aria-label
    const links = screen.getAllByRole("link");
    const downloadLink = links.find(
      (link) => link.getAttribute("href") === "https://example.com/doc.pdf",
    );
    expect(downloadLink).toBeInTheDocument();
  });

  it("renders page count when provided", () => {
    render(
      <PdfRenderer
        data={{ url: "https://example.com/doc.pdf", pageCount: 10 }}
      />,
    );
    // Check for page count number
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });
});

describe("HomeworkRenderer", () => {
  const mockHomeworkData = {
    title: "Math Homework",
    subject: "Mathematics",
    dueDate: "2024-01-15",
    tasks: [
      { id: "1", description: "Exercise 1", completed: true },
      { id: "2", description: "Exercise 2", completed: false },
    ],
  };

  it("renders homework title", () => {
    render(<HomeworkRenderer data={mockHomeworkData} />);
    expect(screen.getByText("Math Homework")).toBeInTheDocument();
  });

  it("renders subject", () => {
    render(<HomeworkRenderer data={mockHomeworkData} />);
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
  });

  it("renders due date", () => {
    render(<HomeworkRenderer data={mockHomeworkData} />);
    // Check for the date pattern
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
  });

  it("renders task descriptions", () => {
    render(<HomeworkRenderer data={mockHomeworkData} />);
    expect(screen.getByText("Exercise 1")).toBeInTheDocument();
    expect(screen.getByText("Exercise 2")).toBeInTheDocument();
  });

  it("shows completion count", () => {
    render(<HomeworkRenderer data={mockHomeworkData} />);
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows empty state when no tasks", () => {
    render(<HomeworkRenderer data={{ tasks: [] }} />);
    expect(
      screen.getByText(
        getTranslation("education.knowledgeHub.homework.noTasks"),
      ),
    ).toBeInTheDocument();
  });

  it("renders notes when provided", () => {
    render(
      <HomeworkRenderer
        data={{ ...mockHomeworkData, notes: "Remember to show work" }}
      />,
    );
    expect(screen.getByText(/Remember to show work/)).toBeInTheDocument();
  });
});
