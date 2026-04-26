/**
 * @file use-materiali-conversation.ts
 * @brief Custom hook for materiali conversation logic
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useAccessibilityStore } from "@/lib/accessibility";
import { useTTS } from "@/components/accessibility";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth";
import { fileToBase64 } from "../utils/file-utils";
import type { ConversationMessage, Attachment, Character } from "../types";

export function useMaterialiConversation(character: Character) {
  const { settings } = useAccessibilityStore();
  const { speak } = useTTS();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: settings.reducedMotion ? "auto" : "smooth",
    });
  }, [messages, settings.reducedMotion]);

  useEffect(() => {
    const greetingMessage: ConversationMessage = {
      id: "greeting",
      role: "assistant",
      content: character.greeting,
      timestamp: new Date(),
    };
    setMessages([greetingMessage]);
    setShowQuickActions(true);

    if (settings.ttsAutoRead) {
      speak(character.greeting);
    }
  }, [character.id, character.greeting, settings.ttsAutoRead, speak]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        const url = await fileToBase64(file);
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: file.type.startsWith("image/") ? "image" : "document",
          name: file.name,
          url,
          mimeType: file.type,
        };
        setAttachments((prev) => [...prev, attachment]);
      }

      event.target.value = "";
      setShowAttachPanel(false);
    },
    [],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if ((!input.trim() && attachments.length === 0) || isLoading) return;

      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
        attachments: attachments.length > 0 ? [...attachments] : undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setAttachments([]);
      setIsLoading(true);
      setShowQuickActions(false);

      try {
        const requestBody: Record<string, unknown> = {
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: character.systemPrompt,
        };

        if (userMessage.attachments?.some((a) => a.type === "image")) {
          requestBody.images = userMessage.attachments
            .filter((a) => a.type === "image")
            .map((a) => a.url);
        }

        const response = await csrfFetch("/api/chat", {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const data = await response.json();

        const assistantMessage: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
          tokens: data.usage?.total_tokens,
          toolCalls: data.toolCalls,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (settings.ttsAutoRead) {
          speak(data.content);
        }
      } catch (error) {
        logger.error("Materiali conversation error", { error: String(error) });
        const errorMessage: ConversationMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Mi scuso, si è verificato un errore. Riprova.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [
      input,
      attachments,
      isLoading,
      messages,
      character.systemPrompt,
      settings.ttsAutoRead,
      speak,
    ],
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      setInput(prompt);
      setShowQuickActions(false);
      setTimeout(() => {
        handleSubmit();
      }, 100);
    },
    [handleSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const clearConversation = useCallback(() => {
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content: character.greeting,
        timestamp: new Date(),
      },
    ]);
    setAttachments([]);
    setShowQuickActions(true);
  }, [character.greeting]);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode((prev) => !prev);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    attachments,
    showAttachPanel,
    setShowAttachPanel,
    isVoiceMode,
    showQuickActions,
    messagesEndRef,
    inputRef,
    fileInputRef,
    cameraInputRef,
    handleFileSelect,
    removeAttachment,
    handleSubmit,
    handleQuickAction,
    handleKeyDown,
    clearConversation,
    toggleVoiceMode,
  };
}
