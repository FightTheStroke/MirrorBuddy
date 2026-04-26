/**
 * Tests for Achievements Page
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementsPage from "../page";

// Mock ACHIEVEMENTS constant
vi.mock("@/lib/gamification/achievements", () => ({
  ACHIEVEMENTS: [
    {
      id: "first_chat",
      name: "First Conversation",
      description: "Start your first conversation",
      icon: "chat-icon",
      category: "onboarding",
      requirement: 1,
      xpReward: 50,
      mirrorBucksReward: 50,
    },
  ],
}));

// Mock MirrorBucks constants
vi.mock("@/lib/constants/mirrorbucks", () => ({
  getMirrorBucksToNextLevel: () => 500,
  MIRRORBUCKS_PER_LEVEL: [0, 100, 300, 600, 1000],
}));

// Mock progress store with selector support
vi.mock("@/lib/stores/progress-store", () => {
  const state = {
    achievements: [],
    streak: { current: 0, longest: 0 },
    seasonLevel: 1,
    seasonMirrorBucks: 0,
    totalStudyMinutes: 0,
    sessionsThisWeek: 0,
  };
  return {
    useProgressStore: (selector: (s: typeof state) => unknown) =>
      selector(state),
  };
});

// Mock child components to isolate page tests
vi.mock("@/components/gamification/achievements-grid", () => ({
  AchievementsGrid: ({ achievements }: { achievements: unknown[] }) => (
    <div data-testid="achievements-grid">
      {achievements.length} achievements
    </div>
  ),
}));

vi.mock("@/components/gamification/streak-calendar", () => ({
  StreakCalendar: () => <div data-testid="streak-calendar">Streak</div>,
}));

vi.mock("@/components/gamification/level-progress", () => ({
  LevelProgress: () => <div data-testid="level-progress">Level</div>,
}));

describe("AchievementsPage", () => {
  it("renders achievements page with title", () => {
    render(<AchievementsPage />);
    // Italian translation: "Obiettivi"
    expect(screen.getByText("Obiettivi")).toBeInTheDocument();
  });

  it("displays achievements grid", () => {
    render(<AchievementsPage />);
    expect(screen.getByTestId("achievements-grid")).toBeInTheDocument();
  });

  it("displays streak calendar", () => {
    render(<AchievementsPage />);
    expect(screen.getByTestId("streak-calendar")).toBeInTheDocument();
  });

  it("displays level progress", () => {
    render(<AchievementsPage />);
    expect(screen.getByTestId("level-progress")).toBeInTheDocument();
  });
});
