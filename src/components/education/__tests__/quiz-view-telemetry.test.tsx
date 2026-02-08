/**
 * MIRRORBUDDY - Quiz View Telemetry Tests
 *
 * Verify that quiz completions are tracked in telemetry.
 *
 * Plan 052 W1 T1-05: Add telemetry tracking for quiz complete
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuizView } from "../quiz-view";
import type { QuizResult } from "@/types";

// Mock telemetry store
const mockTrackEvent = vi.fn();
vi.mock("@/lib/telemetry/telemetry-store", () => ({
  useTelemetryStore: vi.fn(() => ({
    trackEvent: mockTrackEvent,
  })),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "it",
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock stores
vi.mock("@/lib/stores", () => ({
  useProgressStore: () => ({
    addXP: vi.fn(),
  }),
}));

// Mock hooks
vi.mock("@/lib/hooks/use-saved-materials", () => ({
  useQuizzes: () => ({
    quizzes: [],
    loading: false,
    deleteQuiz: vi.fn(),
  }),
}));

// Mock CSRF
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, csrfFetch: vi.fn().mockResolvedValue({ ok: true }) };
});

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock error boundary
vi.mock("@/components/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock Quiz component to control completion
vi.mock("../quiz", () => ({
  Quiz: ({
    onComplete,
    quiz,
  }: {
    onComplete: (result: QuizResult) => void;
    quiz: { id: string; questions: unknown[]; subject: string; title: string };
  }) => (
    <div data-testid="quiz-component">
      <button
        onClick={() =>
          onComplete({
            quizId: quiz.id,
            score: 80,
            totalQuestions: quiz.questions.length,
            correctAnswers: 8,
            timeSpent: 120,
            masteryAchieved: true,
            xpEarned: 80,
            completedAt: new Date(),
          })
        }
      >
        Complete Quiz
      </button>
    </div>
  ),
}));

describe("QuizView - Telemetry Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks quiz_completed event when quiz is finished", async () => {
    render(<QuizView />);

    // Start a sample quiz
    const startButton = screen.getAllByText(/quiz.startButton/i)[0];
    fireEvent.click(startButton);

    // Wait for Quiz component
    await waitFor(() => {
      expect(screen.getByTestId("quiz-component")).toBeInTheDocument();
    });

    // Complete quiz
    const completeButton = screen.getByText("Complete Quiz");
    fireEvent.click(completeButton);

    // Verify telemetry event
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "education",
        "quiz_completed",
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          score: 8,
          totalQuestions: expect.any(Number),
          accuracy: expect.any(Number),
          timeSpent: 120,
          xpEarned: 80,
        }),
      );
    });
  });

  it("calculates accuracy percentage correctly", async () => {
    render(<QuizView />);

    const startButton = screen.getAllByText(/quiz.startButton/i)[0];
    fireEvent.click(startButton);

    await waitFor(() => screen.getByTestId("quiz-component"));

    const completeButton = screen.getByText("Complete Quiz");
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "education",
        "quiz_completed",
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          accuracy: expect.any(Number),
        }),
      );
    });

    // Verify accuracy is calculated correctly
    const call = mockTrackEvent.mock.calls[0];
    const metadata = call[4] as {
      accuracy: number;
      score: number;
      totalQuestions: number;
    };
    const expectedAccuracy = Math.round(
      (metadata.score / metadata.totalQuestions) * 100,
    );
    expect(metadata.accuracy).toBe(expectedAccuracy);
  });

  it("tracks subject and quiz ID in telemetry", async () => {
    render(<QuizView />);

    const startButton = screen.getAllByText(/quiz.startButton/i)[0];
    fireEvent.click(startButton);

    await waitFor(() => screen.getByTestId("quiz-component"));

    fireEvent.click(screen.getByText("Complete Quiz"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "education",
        "quiz_completed",
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          subject: expect.any(String),
        }),
      );
    });
  });
});
