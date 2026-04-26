import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessageBubble } from "../message-bubble";
import type { ChatMessage, Maestro } from "@/types";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockMaestro: Maestro = {
  id: "1",
  name: "einstein",
  displayName: "Albert Einstein",
  avatar: "/avatars/einstein.webp",
  color: "#4A90E2",
  subject: "physics",
  specialty: "Theoretical Physics",
  voice: "alloy",
  voiceInstructions: "Speak with curiosity and wonder",
  teachingStyle: "Socratic method with thought experiments",
  systemPrompt: "You are Albert Einstein",
  greeting: "Hello, let us explore the wonders of physics together!",
};

const mockAssistantMessage: ChatMessage = {
  id: "msg-1",
  role: "assistant",
  content: "This is an AI-generated response",
  timestamp: new Date(),
};

const mockUserMessage: ChatMessage = {
  id: "msg-2",
  role: "user",
  content: "This is a user message",
  timestamp: new Date(),
};

describe("MessageBubble - AI Disclosure", () => {
  it("should render AI disclosure badge for assistant messages", () => {
    render(
      <MessageBubble
        message={mockAssistantMessage}
        maestro={mockMaestro}
        copiedId={null}
        onCopy={vi.fn()}
        highContrast={false}
        dyslexiaFont={false}
        lineSpacing={1.5}
      />,
    );

    // Mock returns key names - aria-label will be "ariaLabel"
    const badge = screen.queryByRole("button", { name: /ariaLabel/i });
    expect(badge).toBeInTheDocument();
  });

  it("should NOT render AI disclosure badge for user messages", () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        maestro={mockMaestro}
        copiedId={null}
        onCopy={vi.fn()}
        highContrast={false}
        dyslexiaFont={false}
        lineSpacing={1.5}
      />,
    );

    // User messages should not have the AI badge
    const badge = screen.queryByRole("button", { name: /ariaLabel/i });
    expect(badge).not.toBeInTheDocument();
  });

  it("should render compact variant of AI disclosure badge", () => {
    render(
      <MessageBubble
        message={mockAssistantMessage}
        maestro={mockMaestro}
        copiedId={null}
        onCopy={vi.fn()}
        highContrast={false}
        dyslexiaFont={false}
        lineSpacing={1.5}
      />,
    );

    // Mock returns key names, so compact label returns "label"
    const compactText = screen.queryByText("label");
    expect(compactText).toBeInTheDocument();
  });
});
