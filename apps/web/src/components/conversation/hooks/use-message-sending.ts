import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useTelemetryStore } from "@/lib/telemetry/telemetry-store";
import type { ActiveCharacter } from "@/lib/stores/conversation-flow-store";

interface UseMessageSendingProps {
  activeCharacter: ActiveCharacter | null;
  addMessage: (message: {
    role: "user" | "assistant";
    content: string;
  }) => void;
  sendMessage: (message: string) => Promise<void>;
}

export function useMessageSending({
  activeCharacter,
  addMessage,
  sendMessage,
}: UseMessageSendingProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent } = useTelemetryStore();

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !activeCharacter) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    addMessage({ role: "user", content: userMessage });

    try {
      await sendMessage(userMessage);

      // Track telemetry
      trackEvent(
        "conversation",
        "chat_sent",
        activeCharacter.id,
        userMessage.length,
        {
          characterType: activeCharacter.type,
          messageLength: userMessage.length,
        },
      );
    } catch (error) {
      logger.error("Chat error", undefined, error);
      addMessage({
        role: "assistant",
        content: "Mi dispiace, ho avuto un problema. Puoi riprovare?",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue,
    isLoading,
    activeCharacter,
    addMessage,
    sendMessage,
    trackEvent,
  ]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    handleSend,
    handleKeyPress,
  };
}
