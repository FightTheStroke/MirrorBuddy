"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Copy, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Maestro } from "@/types";
import { AIDisclosureBadge } from "./ai-disclosure-badge";

interface MessageBubbleProps {
  message: ChatMessage;
  maestro: Maestro;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  highContrast: boolean;
  dyslexiaFont: boolean;
  lineSpacing: number;
}

export function MessageBubble({
  message,
  maestro,
  copiedId,
  onCopy,
  highContrast,
  dyslexiaFont,
  lineSpacing,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex gap-3",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      {/* Avatar for assistant */}
      {message.role === "assistant" && (
        <div
          className="w-7 h-7 xs:w-8 xs:h-8 rounded-full overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.displayName}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[70%] xs:max-w-[85%] rounded-2xl px-4 py-3 relative group",
          message.role === "user"
            ? highContrast
              ? "bg-yellow-400 text-black"
              : "bg-accent-themed text-white"
            : highContrast
              ? "bg-gray-900 text-white border border-gray-700"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white",
          dyslexiaFont && "tracking-wide",
        )}
        style={{ lineHeight: lineSpacing }}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* AI Disclosure Badge for assistant messages */}
        {message.role === "assistant" && (
          <div className="mt-2">
            <AIDisclosureBadge variant="compact" />
          </div>
        )}

        {/* Copy button */}
        <button
          onClick={() => onCopy(message.content, message.id)}
          className={cn(
            "absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-opacity",
            highContrast
              ? "bg-yellow-400 text-black"
              : "bg-white dark:bg-slate-700 shadow-md",
          )}
          title="Copia messaggio"
        >
          {copiedId === message.id ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Avatar for user */}
      {message.role === "user" && (
        <div
          className={cn(
            "w-7 h-7 xs:w-8 xs:h-8 rounded-full flex items-center justify-center flex-shrink-0",
            highContrast
              ? "bg-yellow-400 text-black"
              : "bg-accent-themed text-white",
          )}
        >
          <User className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
        </div>
      )}
    </motion.div>
  );
}
