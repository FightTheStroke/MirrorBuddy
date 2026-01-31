"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { ToolCall } from "@/types";
import { ToolResultDisplay } from "@/components/tools";
import { useChatSession } from "./hooks";
import { ChatHeader } from "./chat-header";
import { ChatFooter } from "./chat-footer";
import { MessageBubble } from "./message-bubble";
import { MessageLoading } from "./message-loading";
import type { ChatSessionProps } from "./types";

export function ChatSession({
  maestro,
  onClose,
  onSwitchToVoice,
}: ChatSessionProps) {
  const {
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
    ttsEnabled,
    addMessageToStore,
  } = useChatSession(maestro);

  const [toolCalls, setToolCalls] = React.useState<ToolCall[]>([]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (conversationIdRef.current) {
      addMessageToStore(conversationIdRef.current, {
        role: "user",
        content: userMessage.content,
      });
    }

    try {
      const response = await csrfFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: maestro.systemPrompt,
          maestroId: maestro.id,
          enableMemory: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant" as const,
        content: data.content,
        timestamp: new Date(),
        tokens: data.usage?.total_tokens,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (conversationIdRef.current) {
        addMessageToStore(conversationIdRef.current, {
          role: "assistant",
          content: assistantMessage.content,
        });
      }

      if (data.toolCalls) {
        setToolCalls((prev) => [...prev, ...data.toolCalls]);
      }

      if (settings.ttsAutoRead) {
        speak(data.content);
      }
    } catch (error) {
      logger.error("Chat error", { error: String(error) });
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "assistant" as const,
        content: "Mi scuso, si è verificato un errore. Riprova.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      if (conversationIdRef.current) {
        addMessageToStore(conversationIdRef.current, {
          role: "assistant",
          content: errorMessage.content,
        });
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = async () => {
    const greetingMessage = {
      id: "greeting",
      role: "assistant" as const,
      content: maestro.greeting,
      timestamp: new Date(),
    };
    setMessages([greetingMessage]);
    setToolCalls([]);

    if (conversationIdRef.current) {
      await addMessageToStore(conversationIdRef.current, {
        role: "assistant",
        content: maestro.greeting,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden",
          settings.highContrast
            ? "bg-black border-2 border-yellow-400"
            : "bg-white dark:bg-slate-900",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
      >
        <ChatHeader
          maestro={maestro}
          highContrast={settings.highContrast}
          dyslexiaFont={settings.dyslexiaFont}
          ttsEnabled={ttsEnabled}
          onClose={onClose}
          onClearChat={clearChat}
          onSwitchToVoice={onSwitchToVoice}
        />

        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 space-y-4",
            settings.highContrast ? "bg-black" : "",
          )}
        >
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                maestro={maestro}
                copiedId={copiedId}
                onCopy={copyMessage}
                highContrast={settings.highContrast}
                dyslexiaFont={settings.dyslexiaFont}
                lineSpacing={settings.lineSpacing}
              />
            ))}
          </AnimatePresence>

          {toolCalls.length > 0 && (
            <div className="space-y-3">
              {toolCalls.map((toolCall) => (
                <ToolResultDisplay key={toolCall.id} toolCall={toolCall} />
              ))}
            </div>
          )}

          {isLoading && (
            <MessageLoading
              maestro={maestro}
              highContrast={settings.highContrast}
            />
          )}

          <div ref={messagesEndRef} />
        </main>

        <ChatFooter
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          isLoading={isLoading}
          inputRef={inputRef}
          highContrast={settings.highContrast}
          dyslexiaFont={settings.dyslexiaFont}
          lineSpacing={settings.lineSpacing}
          maestroColor={maestro.color}
        />
      </motion.div>
    </motion.div>
  );
}
