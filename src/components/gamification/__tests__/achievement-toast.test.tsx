/**
 * Tests for AchievementToast component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementToast } from "../achievement-toast";

describe("AchievementToast", () => {
  const mockAchievement = {
    id: "first_chat",
    name: "First Conversation",
    description: "Start your first conversation",
    icon: "💬",
  };

  it("renders achievement toast", () => {
    render(<AchievementToast achievement={mockAchievement} />);
    expect(screen.getByText("First Conversation")).toBeInTheDocument();
    expect(
      screen.getByText("Start your first conversation"),
    ).toBeInTheDocument();
  });

  it("displays achievement icon", () => {
    render(<AchievementToast achievement={mockAchievement} />);
    expect(screen.getByText("💬")).toBeInTheDocument();
  });

  it("renders with visible state", () => {
    const { container } = render(
      <AchievementToast achievement={mockAchievement} visible={true} />,
    );
    const toast = container.querySelector('[role="status"]');
    expect(toast).toBeInTheDocument();
  });

  it("renders with hidden state", () => {
    const { container } = render(
      <AchievementToast achievement={mockAchievement} visible={false} />,
    );
    const toast = container.querySelector('[role="status"]');
    expect(toast).toHaveClass("hidden");
  });
});
