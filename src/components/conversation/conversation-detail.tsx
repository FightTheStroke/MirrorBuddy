"use client";

/**
 * @file conversation-detail.tsx
 * @brief Detailed view of a past conversation with all messages
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Volume2,
  Loader2,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maestri } from "@/data/maestri";
import type { MaestroFull } from "@/data/maestri/types";
import { logger } from "@/lib/logger";

interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isVoice?: boolean;
}

interface ConversationData {
  id: string;
  title?: string;
  summary?: string;
  maestroId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: ConversationMessage[];
}

interface ConversationDetailProps {
  conversationId: string;
  onBack: () => void;
}

export function ConversationDetail({
  conversationId,
  onBack,
}: ConversationDetailProps) {
  const t = useTranslations("chat.conversation.detail");
  const [conversation, setConversation] = useState<ConversationData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maestro, setMaestro] = useState<MaestroFull | null>(null);

  useEffect(() => {
    async function fetchConversation() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/conversations/${conversationId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(t("error.notFound"));
          }
          throw new Error(t("error.loadingFailed"));
        }

        const data = await response.json();
        setConversation(data);

        // Find maestro info
        const maestroInfo = maestri.find((m) => m.id === data.maestroId);
        setMaestro(maestroInfo || null);
      } catch (err) {
        logger.error("Failed to fetch conversation", { error: String(err) });
        setError(err instanceof Error ? err.message : t("error.unknown"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchConversation();
  }, [conversationId, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent-themed" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {error || t("error.notFound")}
        </p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-accent-themed text-white hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
      </div>
    );
  }

  const conversationDate = new Date(conversation.createdAt);
  const formattedDate = conversationDate.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = conversationDate.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={t("backAriaLabel")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 flex-1">
          {maestro ? (
            <>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: maestro.color }}
              >
                {maestro.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {conversation.title ||
                    t("defaultTitle", { name: maestro.displayName })}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate} {t("timeAt", { time: formattedTime })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {maestro.displayName}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {conversation.title || "Professore"}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {formattedDate} {t("timeAt", { time: formattedTime })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary (if exists) */}
      {conversation.summary && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>{t("summaryLabel")}</strong> {conversation.summary}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            {t("emptyMessages")}
          </div>
        ) : (
          conversation.messages
            .filter((msg) => msg.role !== "system")
            .map((message) => {
              const messageDate = new Date(message.createdAt);
              const messageTime = messageDate.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" && maestro && (
                    <div className="flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: maestro.color }}
                      >
                        {maestro.displayName.charAt(0)}
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-accent-themed text-white rounded-br-md"
                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md shadow-sm",
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {message.isVoice && (
                        <Volume2 className="w-3 h-3 opacity-60" />
                      )}
                      <p className="text-xs opacity-60">{messageTime}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
        )}
      </div>
    </div>
  );
}
