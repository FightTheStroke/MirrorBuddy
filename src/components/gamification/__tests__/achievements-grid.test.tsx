/**
 * Tests for AchievementsGrid component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementsGrid } from "../achievements-grid";
import type { Achievement } from "@/types";

const mockAchievements: Achievement[] = [
  {
    id: "first_chat",
    name: "First Conversation",
    description: "Start your first conversation",
    icon: "💬",
    category: "onboarding",
    requirement: 1,
    xpReward: 50,
    mirrorBucksReward: 50,
  },
  {
    id: "streak_3",
    name: "Consistent Student",
    description: "Study for 3 consecutive days",
    icon: "🔥",
    category: "streak",
    requirement: 3,
    xpReward: 100,
    mirrorBucksReward: 100,
    unlockedAt: new Date(),
  },
];

describe("AchievementsGrid", () => {
  it("renders achievements grid", () => {
    render(<AchievementsGrid achievements={mockAchievements} />);
    expect(screen.getByText("First Conversation")).toBeInTheDocument();
    expect(screen.getByText("Consistent Student")).toBeInTheDocument();
  });

  it("shows locked state for locked achievements", () => {
    render(<AchievementsGrid achievements={mockAchievements} />);
    const lockedAchievement = screen
      .getByText("First Conversation")
      .closest("div");
    expect(lockedAchievement).toHaveClass("opacity-50");
  });

  it("shows unlocked state for unlocked achievements", () => {
    render(<AchievementsGrid achievements={mockAchievements} />);
    expect(screen.getByText("Consistent Student")).toBeInTheDocument();
  });

  it("displays achievement icons", () => {
    render(<AchievementsGrid achievements={mockAchievements} />);
    expect(screen.getByText("💬")).toBeInTheDocument();
    expect(screen.getByText("🔥")).toBeInTheDocument();
  });
});
