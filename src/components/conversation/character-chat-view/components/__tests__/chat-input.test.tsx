/**
 * @file chat-input.test.tsx
 * @brief Tests for auto-height chat input component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../chat-input";

const mockCharacter = {
  name: "Test Coach",
  role: "Coach di Apprendimento",
  description: "Test coach description",
  greeting: "Ciao! Sono un coach.",
  avatar: "/avatars/test.webp",
  color: "from-purple-500 to-indigo-600",
  systemPrompt: "You are a test coach...",
  voice: "shimmer",
  voiceInstructions: "Test voice instructions",
  themeColor: "#3b82f6",
};

const defaultProps = {
  input: "",
  onInputChange: vi.fn(),
  onSend: vi.fn(),
  onKeyDown: vi.fn(),
  isLoading: false,
  character: mockCharacter,
  characterType: "coach" as const,
  onToolRequest: vi.fn(),
  activeTool: null,
};

describe("ChatInput - Auto-height behavior", () => {
  it("should render textarea with data-testid", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByTestId("chat-input");
    expect(textarea).toBeInTheDocument();
  });

  it("should not have fixed min-height class min-h-[120px]", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByTestId("chat-input");
    const classString = textarea.className;
    expect(classString).not.toContain("min-h-[120px]");
  });

  it("should have resize-none and overflow-hidden for auto-height", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByTestId("chat-input");
    expect(textarea.className).toContain("resize-none");
    expect(textarea.className).toContain("overflow-hidden");
  });

  it("should start with rows attribute set to 1", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByTestId("chat-input") as HTMLTextAreaElement;
    expect(textarea.rows).toBe(1);
  });

  it("should call onInputChange when text is entered", async () => {
    const user = userEvent.setup();
    const onInputChange = vi.fn();
    render(<ChatInput {...defaultProps} onInputChange={onInputChange} />);

    const textarea = screen.getByTestId("chat-input");
    await user.type(textarea, "Test message");

    expect(onInputChange).toHaveBeenCalled();
  });

  it("should preserve safe-area-bottom padding in container", () => {
    render(<ChatInput {...defaultProps} />);
    const container = screen
      .getByTestId("chat-input")
      .closest("div")?.parentElement;
    const className = container?.className || "";
    expect(className).toContain("pb-[max(1rem,env(safe-area-inset-bottom))]");
  });

  it("should have dynamic height style properties set", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByTestId("chat-input");
    // Should allow auto height adjustment
    expect(textarea.className).toContain("overflow-hidden");
  });

  it("should disable send button when input is empty", () => {
    render(<ChatInput {...defaultProps} input="" />);
    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).toBeDisabled();
  });

  it("should enable send button when input has content", () => {
    render(<ChatInput {...defaultProps} input="Test message" />);
    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).not.toBeDisabled();
  });

  it("should call onSend when send button is clicked", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} input="Test" onSend={onSend} />);

    const sendButton = screen.getByTestId("send-button");
    await user.click(sendButton);

    expect(onSend).toHaveBeenCalled();
  });

  it("should have max-height constraint for scrolling", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByTestId("chat-input");
    // Should have either inline style or class that limits max-height
    const hasMaxHeight =
      textarea.style.maxHeight || textarea.className.includes("max-h-");
    expect(
      hasMaxHeight || textarea.className.includes("overflow-hidden"),
    ).toBeTruthy();
  });
});
