/**
 * MIRRORBUDDY - Flashcard Review Telemetry Tests
 *
 * Verify that flashcard reviews are tracked in telemetry.
 *
 * Plan 052 W1 T1-05: Add telemetry tracking for flashcard review
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewMobile } from "../flashcard-review-mobile";
import type { FlashcardDeck } from "@/types";

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
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<unknown>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<unknown>) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock TouchTarget component
vi.mock("@/components/ui/touch-target", () => ({
  TouchTarget: ({ children, ...props }: React.PropsWithChildren<unknown>) => (
    <div {...props}>{children}</div>
  ),
}));

describe("FlashcardReviewMobile - Telemetry Tracking", () => {
  const mockDeck: FlashcardDeck = {
    id: "deck-1",
    name: "Italian Verbs",
    subject: "italian",
    cards: [
      {
        id: "card-1",
        deckId: "deck-1",
        front: "essere",
        back: "to be",
        state: "new",
        stability: 0,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        nextReview: new Date(Date.now() - 1000),
      },
      {
        id: "card-2",
        deckId: "deck-1",
        front: "avere",
        back: "to have",
        state: "new",
        stability: 0,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        nextReview: new Date(Date.now() - 1000),
      },
    ],
    createdAt: new Date(),
  };

  const mockOnRating = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks flashcard_reviewed event when card is rated", async () => {
    render(
      <FlashcardReviewMobile
        deck={mockDeck}
        onRating={mockOnRating}
        onComplete={mockOnComplete}
      />,
    );

    // Flip the card
    const card = screen.getByText("essere");
    fireEvent.click(card);

    // Wait for flip animation
    await waitFor(() => {
      expect(screen.getByText("to be")).toBeInTheDocument();
    });

    // Rate the card as "good" (Italian label: "Bene")
    const goodButton = screen.getByRole("button", { name: /bene/i });
    fireEvent.click(goodButton);

    // Verify telemetry event
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "education",
        "flashcard_reviewed",
        "deck-1",
        1,
        expect.objectContaining({
          rating: "good",
          subject: "italian",
          cardIndex: 0,
          totalCards: 2,
        }),
      );
    });
  });

  it("tracks different rating types", async () => {
    const { rerender } = render(
      <FlashcardReviewMobile
        deck={mockDeck}
        onRating={mockOnRating}
        onComplete={mockOnComplete}
      />,
    );

    // Test each rating (map rating to Italian label)
    const ratingToLabel: Record<string, string> = {
      again: "ripeti",
      hard: "difficile",
      good: "bene",
      easy: "facile",
    };
    const ratings = ["again", "hard", "good", "easy"] as const;

    for (const rating of ratings) {
      vi.clearAllMocks();

      // Flip card
      const card = screen.getByText(/essere|avere/);
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByText(/to be|to have/)).toBeInTheDocument();
      });

      // Click rating button (using Italian label)
      const italianLabel = ratingToLabel[rating];
      const button = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.toLowerCase().includes(italianLabel));
      if (button) {
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            "education",
            "flashcard_reviewed",
            expect.any(String),
            expect.any(Number),
            expect.objectContaining({
              rating,
            }),
          );
        });
      }

      // Re-render for next iteration if more cards
      rerender(
        <FlashcardReviewMobile
          deck={mockDeck}
          onRating={mockOnRating}
          onComplete={mockOnComplete}
        />,
      );
    }
  });

  it("tracks card position and progress", async () => {
    render(
      <FlashcardReviewMobile
        deck={mockDeck}
        onRating={mockOnRating}
        onComplete={mockOnComplete}
      />,
    );

    // Flip and rate first card
    fireEvent.click(screen.getByText("essere"));
    await waitFor(() => screen.getByText("to be"));

    // Click "good" button (Italian label: "Bene")
    const goodButton = screen
      .getAllByRole("button")
      .find((btn) => btn.textContent?.toLowerCase().includes("bene"));
    if (goodButton) {
      fireEvent.click(goodButton);
    }

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "education",
        "flashcard_reviewed",
        "deck-1",
        1,
        expect.objectContaining({
          cardIndex: 0,
          totalCards: 2,
        }),
      );
    });
  });
});
