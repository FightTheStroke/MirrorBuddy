/**
 * Unit tests for MiniVoicePlayer component
 * TDD Phase: RED - Failing tests for F-20 requirements
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MiniVoicePlayer } from "../mini-voice-player";

describe("MiniVoicePlayer", () => {
  const mockProps = {
    characterName: "Galileo",
    characterAvatar: "/maestri/galileo.png",
    isListening: false,
    isSpeaking: false,
    onExpand: vi.fn(),
    onEndCall: vi.fn(),
  };

  describe("Structure and Visibility", () => {
    it("renders as a floating container", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player).toBeInTheDocument();
      expect(player.className).toMatch(/fixed/);
      expect(player.className).toMatch(/bottom-16/); // Above BottomNav
    });

    it("is hidden on desktop (sm:hidden)", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/sm:hidden/);
    });

    it("has z-index 40 to be above content but below modals", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/z-40/);
    });

    it("has height of 64px (h-16 = 60-80px range)", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/h-16/);
    });

    it("has rounded corners and shadow", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/rounded-2xl/);
      expect(player.className).toMatch(/shadow-lg/);
    });
  });

  describe("Character Display", () => {
    it("renders character name", () => {
      render(<MiniVoicePlayer {...mockProps} />);

      expect(screen.getByText("Galileo")).toBeInTheDocument();
    });

    it("renders character avatar when provided", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const avatar = container.querySelector("img");
      expect(avatar).toBeInTheDocument();
      // Next.js Image transforms src to use optimizer
      expect(avatar?.getAttribute("src")).toContain("galileo.png");
    });

    it("renders without avatar gracefully", () => {
      const propsWithoutAvatar = { ...mockProps, characterAvatar: undefined };
      const { container } = render(<MiniVoicePlayer {...propsWithoutAvatar} />);

      // Should still render the avatar container
      const avatarContainer = container.querySelector(".w-10.h-10");
      expect(avatarContainer).toBeInTheDocument();
    });

    it("avatar has proper sizing (40px = 10 in Tailwind)", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const avatarContainer = container.querySelector(".w-10.h-10");
      expect(avatarContainer).toBeInTheDocument();
      expect(avatarContainer?.className).toMatch(/rounded-full/);
    });
  });

  describe("Voice Status Display", () => {
    it("shows 'Speaking...' when isSpeaking is true", () => {
      const props = { ...mockProps, isSpeaking: true };
      render(<MiniVoicePlayer {...props} />);

      expect(screen.getByText("Speaking...")).toBeInTheDocument();
    });

    it("shows 'Listening...' when isListening is true", () => {
      const props = { ...mockProps, isListening: true };
      render(<MiniVoicePlayer {...props} />);

      expect(screen.getByText("Listening...")).toBeInTheDocument();
    });

    it("shows 'Voice active' when neither speaking nor listening", () => {
      render(<MiniVoicePlayer {...mockProps} />);

      expect(screen.getByText("Voice active")).toBeInTheDocument();
    });

    it("shows status indicator with pulse animation when speaking", () => {
      const props = { ...mockProps, isSpeaking: true };
      const { container } = render(<MiniVoicePlayer {...props} />);

      const indicator = container.querySelector(".bg-green-500");
      expect(indicator).toBeInTheDocument();
      expect(indicator?.className).toMatch(/animate-pulse/);
    });

    it("shows status indicator with pulse animation when listening", () => {
      const props = { ...mockProps, isListening: true };
      const { container } = render(<MiniVoicePlayer {...props} />);

      const indicator = container.querySelector(".bg-blue-500");
      expect(indicator).toBeInTheDocument();
      expect(indicator?.className).toMatch(/animate-pulse/);
    });

    it("shows gray inactive indicator when idle", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const indicator = container.querySelector(".bg-gray-400");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Controls", () => {
    it("renders expand button", () => {
      render(<MiniVoicePlayer {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(2); // Expand + End call
    });

    it("calls onExpand when expand button is clicked", () => {
      render(<MiniVoicePlayer {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const expandButton = buttons[0]; // First button
      fireEvent.click(expandButton);

      expect(mockProps.onExpand).toHaveBeenCalledTimes(1);
    });

    it("calls onEndCall when end call button is clicked", () => {
      render(<MiniVoicePlayer {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      const endCallButton = buttons[1]; // Second button
      fireEvent.click(endCallButton);

      expect(mockProps.onEndCall).toHaveBeenCalledTimes(1);
    });

    it("has minimum 44px touch targets for buttons", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-w-\[44px\]/);
        expect(button.className).toMatch(/min-h-\[44px\]/);
      });
    });

    it("end call button has destructive styling", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const buttons = container.querySelectorAll("button");
      const endCallButton = buttons[1];
      expect(endCallButton.className).toMatch(/text-destructive/);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for buttons", () => {
      render(<MiniVoicePlayer {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAccessibleName(); // Expand
      expect(buttons[1]).toHaveAccessibleName(); // End call
    });

    it("avatar has empty alt text for decoration", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const avatar = container.querySelector("img");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("alt", "");
    });
  });

  describe("Custom Styling", () => {
    it("accepts custom className prop", () => {
      const { container } = render(
        <MiniVoicePlayer {...mockProps} className="custom-class" />,
      );

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/custom-class/);
    });
  });

  describe("Responsive Behavior", () => {
    it("has left and right spacing for mobile (4 = 1rem)", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/left-4/);
      expect(player.className).toMatch(/right-4/);
    });

    it("has backdrop blur for glassmorphism", () => {
      const { container } = render(<MiniVoicePlayer {...mockProps} />);

      const player = container.firstChild as HTMLElement;
      expect(player.className).toMatch(/backdrop-blur-sm/);
    });
  });
});
