/**
 * MIRRORBUDDY - Trial Status Indicator Tests
 *
 * Tests for the UI component showing remaining trial limits.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrialStatusIndicator } from "../trial-status-indicator";

describe("TrialStatusIndicator", () => {
  describe("chat indicator", () => {
    it("renders chat remaining count", () => {
      render(<TrialStatusIndicator chatsUsed={3} maxChats={10} />);

      expect(screen.getByText("7")).toBeInTheDocument(); // 10 - 3
    });

    it("shows zero when chats exhausted", () => {
      render(<TrialStatusIndicator chatsUsed={10} maxChats={10} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("clamps negative remaining to zero", () => {
      render(<TrialStatusIndicator chatsUsed={15} maxChats={10} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("voice indicator", () => {
    it("shows voice when enabled", () => {
      render(
        <TrialStatusIndicator
          chatsUsed={0}
          showVoice={true}
          voiceSecondsUsed={120}
          maxVoiceSeconds={300}
        />,
      );

      // Should show minutes remaining: (300 - 120) / 60 = 3 minutes
      expect(screen.getByText("3m")).toBeInTheDocument();
    });

    it("hides voice by default", () => {
      render(<TrialStatusIndicator chatsUsed={0} voiceSecondsUsed={120} />);

      expect(screen.queryByText("3m")).not.toBeInTheDocument();
    });

    it("shows 0m when voice exhausted", () => {
      render(
        <TrialStatusIndicator
          chatsUsed={0}
          showVoice={true}
          voiceSecondsUsed={300}
          maxVoiceSeconds={300}
        />,
      );

      expect(screen.getByText("0m")).toBeInTheDocument();
    });
  });

  describe("tool indicator", () => {
    it("shows tools when enabled", () => {
      render(
        <TrialStatusIndicator
          chatsUsed={0}
          showTools={true}
          toolsUsed={3}
          maxTools={10}
        />,
      );

      expect(screen.getByText("7")).toBeInTheDocument(); // 10 - 3
    });

    it("hides tools by default", () => {
      const { container } = render(
        <TrialStatusIndicator chatsUsed={5} toolsUsed={3} />,
      );

      // Only chat indicator should be present
      const indicators = container.querySelectorAll(
        '[class*="flex items-center gap-1.5"]',
      );
      expect(indicators).toHaveLength(1);
    });

    it("shows 0 when tools exhausted", () => {
      render(
        <TrialStatusIndicator
          chatsUsed={0}
          showTools={true}
          toolsUsed={10}
          maxTools={10}
        />,
      );

      // Two "0" values: chat (10 remaining) and tools (0 remaining)
      // Chat: 10 - 0 = 10, Tools: 10 - 10 = 0
      expect(screen.getByText("10")).toBeInTheDocument(); // Chats remaining
      expect(screen.getByText("0")).toBeInTheDocument(); // Tools remaining
    });
  });

  describe("color states", () => {
    it("uses green color when resources plentiful", () => {
      const { container } = render(
        <TrialStatusIndicator chatsUsed={2} maxChats={10} />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("bg-green");
    });

    it("uses amber when chat remaining <= 3", () => {
      const { container } = render(
        <TrialStatusIndicator chatsUsed={7} maxChats={10} />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("bg-amber");
    });

    it("uses red when chat exhausted", () => {
      const { container } = render(
        <TrialStatusIndicator chatsUsed={10} maxChats={10} />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("bg-red");
    });

    it("uses amber when voice remaining <= 60 seconds", () => {
      const { container } = render(
        <TrialStatusIndicator
          chatsUsed={0}
          showVoice={true}
          voiceSecondsUsed={250}
          maxVoiceSeconds={300}
        />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("bg-amber");
    });

    it("uses red when voice exhausted", () => {
      const { container } = render(
        <TrialStatusIndicator
          chatsUsed={0}
          showVoice={true}
          voiceSecondsUsed={300}
          maxVoiceSeconds={300}
        />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("bg-red");
    });

    it("uses amber when tools remaining <= 3", () => {
      const { container } = render(
        <TrialStatusIndicator
          chatsUsed={0}
          showTools={true}
          toolsUsed={8}
          maxTools={10}
        />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("bg-amber");
    });
  });

  describe("multiple indicators", () => {
    it("renders all three indicators when enabled", () => {
      render(
        <TrialStatusIndicator
          chatsUsed={5}
          showVoice={true}
          voiceSecondsUsed={180}
          showTools={true}
          toolsUsed={4}
        />,
      );

      // Chat: 5, Voice: 2m, Tools: 6
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("2m")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <TrialStatusIndicator chatsUsed={0} className="custom-class" />,
      );

      const element = container.querySelector('[data-testid="trial-status"]');
      expect(element?.className).toContain("custom-class");
    });
  });

  describe("defaults", () => {
    it("uses default maxChats of 10", () => {
      render(<TrialStatusIndicator chatsUsed={3} />);

      expect(screen.getByText("7")).toBeInTheDocument(); // 10 - 3
    });

    it("uses default maxVoiceSeconds of 300", () => {
      render(
        <TrialStatusIndicator
          chatsUsed={0}
          showVoice={true}
          voiceSecondsUsed={60}
        />,
      );

      // (300 - 60) / 60 = 4 minutes
      expect(screen.getByText("4m")).toBeInTheDocument();
    });

    it("uses default maxTools of 10", () => {
      render(
        <TrialStatusIndicator chatsUsed={0} showTools={true} toolsUsed={2} />,
      );

      expect(screen.getByText("8")).toBeInTheDocument(); // 10 - 2
    });
  });
});
