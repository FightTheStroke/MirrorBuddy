"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMaestroById } from "@/data";
import { useConversationFlowStore } from "@/lib/stores/conversation-flow-store";

interface ActiveMaestroAvatarProps {
  onReturnToMaestro?: () => void;
  className?: string;
}

/**
 * ActiveMaestroAvatar - Shows current active maestro in sidebar
 * Displays during active conversation with green indicator
 * Click to return to conversation with that maestro
 */
export function ActiveMaestroAvatar({
  onReturnToMaestro,
  className,
}: ActiveMaestroAvatarProps) {
  const { activeCharacter } = useConversationFlowStore();

  // Only show if current character is a maestro
  if (!activeCharacter || activeCharacter.type !== "maestro") {
    return null;
  }

  const maestro = getMaestroById(activeCharacter.id);
  if (!maestro) {
    return null;
  }

  const handleClick = () => {
    if (onReturnToMaestro) {
      onReturnToMaestro();
    }
    // Note: This component shows the active maestro during conversation
    // No need to switch since we're already in that conversation
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className={cn("relative", className)}
    >
      <button
        onClick={handleClick}
        className={cn(
          "group relative flex items-center gap-3 w-full p-3 rounded-xl",
          "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
          "hover:bg-slate-50 dark:hover:bg-slate-700/50",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "focus:ring-offset-white dark:focus:ring-offset-slate-900",
        )}
        style={{
          ["--ring-color" as string]: maestro.color,
        }}
        aria-label={`Torna alla conversazione con ${maestro.displayName}`}
      >
        {/* Avatar with green indicator */}
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full overflow-hidden border-2"
            style={{ borderColor: maestro.color }}
          >
            <Image
              src={maestro.avatar}
              alt={maestro.displayName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Green active indicator */}
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full">
            <span className="sr-only">Conversazione attiva</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {maestro.displayName}
            </p>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${maestro.color}20`,
                color: maestro.color,
              }}
            >
              Attivo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {maestro.specialty}
          </p>
        </div>

        {/* Return icon */}
        <MessageCircle
          className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
          aria-hidden="true"
        />
      </button>

      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${maestro.color}20, transparent 70%)`,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
