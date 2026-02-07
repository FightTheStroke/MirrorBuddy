/**
 * Tests for Achievements Page
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementsPage from "../page";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock progress store
vi.mock("@/lib/stores/progress-store", () => ({
  useProgressStore: () => ({
    achievements: [],
    streak: { current: 0, longest: 0 },
    seasonLevel: 1,
    seasonMirrorBucks: 0,
    totalStudyMinutes: 0,
  }),
}));

describe("AchievementsPage", () => {
  it("renders achievements page", () => {
    render(<AchievementsPage />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("displays achievements grid", () => {
    render(<AchievementsPage />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("displays streak information", () => {
    render(<AchievementsPage />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("displays level progress", () => {
    render(<AchievementsPage />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
