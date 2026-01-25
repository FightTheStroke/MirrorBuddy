"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mic, MessageSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { subjectIcons, subjectNames } from "@/data";
import { QuoteRotator } from "./quote-rotator";
import type { Maestro } from "@/types";

interface MaestroCardFullProps {
  maestro: Maestro;
  onSelectVoice?: (maestro: Maestro) => void;
  onSelectChat?: (maestro: Maestro) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * Full-size maestro card with avatar, details, and mode selection.
 * Used for expanded view or selection modal.
 */
export function MaestroCardFull({
  maestro,
  onSelectVoice,
  onSelectChat,
  onClose,
  className,
}: MaestroCardFullProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative w-full max-w-md mx-auto p-6 rounded-2xl",
        "bg-white dark:bg-slate-800/95",
        "border border-slate-200 dark:border-slate-700/50",
        "shadow-xl",
        className,
      )}
    >
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {/* Avatar + colored ring */}
      <div className="flex flex-col items-center mb-4">
        <div
          className="relative w-24 h-24 rounded-full overflow-hidden ring-4 mb-3"
          style={{ ["--tw-ring-color" as string]: maestro.color }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.displayName}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
          {/* Sparkle indicator */}
          <div
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: maestro.color }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Name + Subject */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {maestro.displayName}
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>{subjectIcons[maestro.subject]}</span>
          <span>{subjectNames[maestro.subject]}</span>
        </div>
      </div>

      {/* Specialty */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-300 mb-3">
        {maestro.specialty}
      </p>

      {/* Quote */}
      <div
        className="px-4 py-3 rounded-xl mb-4"
        style={{ backgroundColor: `${maestro.color}15`, color: maestro.color }}
      >
        <QuoteRotator
          maestroId={maestro.id}
          className="text-sm italic text-center"
        />
      </div>

      {/* Teaching style preview */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 line-clamp-2">
        {maestro.teachingStyle}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        {onSelectVoice && (
          <button
            onClick={() => onSelectVoice(maestro)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 active:scale-98"
            style={{ backgroundColor: maestro.color }}
          >
            <Mic className="w-5 h-5" />
            <span>Parla</span>
          </button>
        )}
        {onSelectChat && (
          <button
            onClick={() => onSelectChat(maestro)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all border-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            style={{
              borderColor: maestro.color,
              color: maestro.color,
            }}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Scrivi</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
