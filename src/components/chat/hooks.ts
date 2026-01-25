import { useState, useRef, useEffect } from "react";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { useConversationStore } from "@/lib/stores";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useTTS } from "@/components/accessibility";
import { logger } from "@/lib/logger";
import type { ChatMessage, Maestro } from "@/types";

export function useChatSession(maestro: Maestro) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { settings } = useAccessibilityStore();
  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();
  const { createConversation, addMessage: addMessageToStore } =
    useConversationStore();
  const { studentProfile } = useSettingsStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: settings.reducedMotion ? "auto" : "smooth",
    });
  }, [messages, settings.reducedMotion]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Create conversation and add greeting message on mount
  useEffect(() => {
    async function initConversation() {
      const convId = await createConversation(maestro.id);
      conversationIdRef.current = convId;

      let greetingText = maestro.greeting;
      try {
        const studentName = studentProfile?.name || "Studente";
        const response = await fetch(
          `/api/conversations/greeting?characterId=${maestro.id}&studentName=${encodeURIComponent(studentName)}&maestroName=${encodeURIComponent(maestro.displayName)}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.hasContext && data.greeting) {
            greetingText = data.greeting;
            logger.info("Contextual greeting loaded", {
              maestroId: maestro.id,
              topics: data.topics,
            });
          }
        }
      } catch (error) {
        logger.debug("Failed to load contextual greeting, using default", {
          error: String(error),
        });
      }

      const greetingMessage: ChatMessage = {
        id: "greeting",
        role: "assistant",
        content: greetingText,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);

      await addMessageToStore(convId, {
        role: "assistant",
        content: greetingText,
      });

      if (settings.ttsAutoRead) {
        speak(greetingText);
      }
    }

    initConversation();
  }, [
    maestro.id,
    maestro.displayName,
    maestro.greeting,
    settings.ttsAutoRead,
    studentProfile?.name,
    speak,
    createConversation,
    addMessageToStore,
  ]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    messagesEndRef,
    inputRef,
    conversationIdRef,
    copiedId,
    setCopiedId,
    settings,
    speak,
    stopTTS,
    ttsEnabled,
    addMessageToStore,
  };
}
