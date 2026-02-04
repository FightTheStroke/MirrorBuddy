/**
 * MIRRORBUDDY - Message Sending Telemetry Tests
 *
 * Verify that chat messages are tracked in telemetry.
 *
 * Plan 052 W1 T1-05: Add telemetry tracking for chat send
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMessageSending } from "../use-message-sending";

// Mock telemetry store
const mockTrackEvent = vi.fn();
vi.mock("@/lib/telemetry/telemetry-store", () => ({
  useTelemetryStore: vi.fn(() => ({
    trackEvent: mockTrackEvent,
  })),
}));

// Mock logger (complete mock required by ESLint rule)
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("useMessageSending - Telemetry Tracking", () => {
  const mockActiveCharacter = {
    id: "socrates",
    name: "Socrates",
    type: "coach" as const,
    character: {} as never,
    greeting: "Welcome",
    systemPrompt: "System prompt",
    color: "#000000",
    voice: "alloy",
    voiceInstructions: "Speak clearly",
  };

  const mockAddMessage = vi.fn();
  const mockSendMessage = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks chat_sent event when message is sent successfully", async () => {
    const { result } = renderHook(() =>
      useMessageSending({
        activeCharacter: mockActiveCharacter,
        addMessage: mockAddMessage,
        sendMessage: mockSendMessage,
      }),
    );

    // Set input value
    act(() => {
      result.current.setInputValue("Ciao Socrate!");
    });

    // Send message
    await act(async () => {
      await result.current.handleSend();
    });

    // Wait for async operations
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "chat_sent",
        "socrates",
        expect.any(Number),
        expect.objectContaining({
          characterType: "coach",
          messageLength: 13,
        }),
      );
    });
  });

  it("tracks character name and type in metadata", async () => {
    const buddyCharacter = {
      id: "marco-polo",
      name: "Marco Polo",
      type: "buddy" as const,
      character: {} as never,
      greeting: "Welcome",
      systemPrompt: "System prompt",
      color: "#000000",
      voice: "alloy",
      voiceInstructions: "Speak clearly",
    };

    const { result } = renderHook(() =>
      useMessageSending({
        activeCharacter: buddyCharacter,
        addMessage: mockAddMessage,
        sendMessage: mockSendMessage,
      }),
    );

    act(() => {
      result.current.setInputValue("Hello!");
    });

    await act(async () => {
      await result.current.handleSend();
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "chat_sent",
        "marco-polo",
        expect.any(Number),
        expect.objectContaining({
          characterType: "buddy",
          messageLength: 6,
        }),
      );
    });
  });

  it("does not track if message is empty", async () => {
    const { result } = renderHook(() =>
      useMessageSending({
        activeCharacter: mockActiveCharacter,
        addMessage: mockAddMessage,
        sendMessage: mockSendMessage,
      }),
    );

    // Try to send empty message
    await act(async () => {
      await result.current.handleSend();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("does not track if activeCharacter is null", async () => {
    const { result } = renderHook(() =>
      useMessageSending({
        activeCharacter: null,
        addMessage: mockAddMessage,
        sendMessage: mockSendMessage,
      }),
    );

    act(() => {
      result.current.setInputValue("Test message");
    });

    await act(async () => {
      await result.current.handleSend();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
