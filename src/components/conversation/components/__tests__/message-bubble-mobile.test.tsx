/**
 * Unit tests for MessageBubble responsive mobile widths
 * TDD Phase: RED - Failing tests for F-24 requirements
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MessageBubble } from "../message-bubble";
import type {
  FlowMessage,
  ActiveCharacter,
} from "@/lib/stores/conversation-flow-store";

describe("MessageBubble Responsive Mobile Widths (F-24)", () => {
  const mockUserMessage: FlowMessage = {
    id: "msg-1",
    role: "user",
    content:
      "This is a test user message that should wrap properly on mobile devices.",
    timestamp: new Date(),
  };

  const mockAIMessage: FlowMessage = {
    id: "msg-2",
    role: "assistant",
    content:
      "This is a test AI response message that should wrap properly on mobile devices.",
    timestamp: new Date(),
  };

  const mockCharacter: ActiveCharacter = {
    id: "galileo-physics",
    name: "Galileo",
    type: "maestro",
    color: "#22d3ee",
    character: {} as never,
    greeting: "Ciao!",
    systemPrompt: "Test",
    voice: "sage",
    voiceInstructions: "Test",
  };

  describe("User Message Bubble (right-aligned)", () => {
    it("has responsive max-width for mobile (xs/sm breakpoints)", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble).toBeInTheDocument();

      // Should have responsive width classes:
      // - xs: max-w-[85%] - use 85% on small phones (375px+)
      // - default/desktop: max-w-[70%] - use 70% on larger screens
      const classList = Array.from(messageBubble.classList);
      expect(classList.some((cls) => cls.includes("max-w"))).toBe(true);
    });

    it("uses max-w-[85%] for mobile (xs: breakpoint at 375px)", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/xs:max-w-\[85%\]/);
    });

    it("uses max-w-[70%] as default for desktop", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/max-w-\[70%\]/);
    });

    it("does not cause horizontal overflow with responsive width", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble).toBeInTheDocument();
      // Should have proper overflow handling
      expect(messageBubble?.className).toMatch(/px-4/);
    });
  });

  describe("AI Message Bubble (left-aligned)", () => {
    it("has responsive max-width for mobile", () => {
      const { container } = render(
        <MessageBubble
          message={mockAIMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble).toBeInTheDocument();

      const classList = Array.from(messageBubble.classList);
      expect(classList.some((cls) => cls.includes("max-w"))).toBe(true);
    });

    it("uses max-w-[85%] for mobile (xs: breakpoint at 375px)", () => {
      const { container } = render(
        <MessageBubble
          message={mockAIMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/xs:max-w-\[85%\]/);
    });

    it("uses max-w-[70%] as default for desktop", () => {
      const { container } = render(
        <MessageBubble
          message={mockAIMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="max-w"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/max-w-\[70%\]/);
    });

    it("preserves word-wrap with responsive width", () => {
      const { container } = render(
        <MessageBubble
          message={mockAIMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const textElement = container.querySelector(
        ".whitespace-pre-wrap",
      ) as HTMLElement;
      expect(textElement).toBeInTheDocument();
      expect(textElement?.className).toMatch(/whitespace-pre-wrap/);
    });
  });

  describe("System Message (centered)", () => {
    const mockSystemMessage: FlowMessage = {
      id: "sys-1",
      role: "system",
      content: "System notification",
      timestamp: new Date(),
    };

    it("renders without max-width constraint (centered)", () => {
      const { container } = render(
        <MessageBubble message={mockSystemMessage} activeCharacter={null} />,
      );

      // System messages are centered and don't need responsive width
      const systemBubble = container.querySelector(
        ".justify-center",
      ) as HTMLElement;
      expect(systemBubble).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("message bubble has padding for mobile readability", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="px-"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/px-4/);
    });

    it("message bubble has vertical padding for spacing", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="py-"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/py-3/);
    });

    it("has rounded corners for modern appearance", () => {
      const { container } = render(
        <MessageBubble
          message={mockUserMessage}
          activeCharacter={mockCharacter}
        />,
      );

      const messageBubble = container.querySelector(
        '[class*="rounded"]',
      ) as HTMLElement;
      expect(messageBubble?.className).toMatch(/rounded-2xl/);
    });
  });
});
