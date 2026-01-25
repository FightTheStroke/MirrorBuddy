"use client";

import Image from "next/image";
import { Phone, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniVoicePlayerProps {
  characterName: string;
  characterAvatar?: string;
  isListening: boolean;
  isSpeaking: boolean;
  onExpand: () => void;
  onEndCall: () => void;
  className?: string;
}

/**
 * MiniVoicePlayer - Floating mini player for voice chat on mobile
 * Shows voice status without blocking the chat view
 *
 * @component
 * @example
 * ```tsx
 * <MiniVoicePlayer
 *   characterName="Galileo"
 *   characterAvatar="/maestri/galileo.png"
 *   isListening={true}
 *   isSpeaking={false}
 *   onExpand={() => showFullVoicePanel()}
 *   onEndCall={() => endVoiceCall()}
 * />
 * ```
 */
export function MiniVoicePlayer({
  characterName,
  characterAvatar,
  isListening,
  isSpeaking,
  onExpand,
  onEndCall,
  className,
}: MiniVoicePlayerProps) {
  // Determine voice status text
  const statusText = isSpeaking
    ? "Speaking..."
    : isListening
      ? "Listening..."
      : "Voice active";

  // Determine status indicator color
  const indicatorClassName = cn(
    "w-3 h-3 rounded-full",
    isSpeaking && "bg-green-500 animate-pulse",
    isListening && "bg-blue-500 animate-pulse",
    !isSpeaking && !isListening && "bg-gray-400",
  );

  return (
    <div
      className={cn(
        "fixed bottom-16 left-4 right-4 z-40 sm:hidden",
        "h-16 rounded-2xl shadow-lg",
        "bg-primary/10 backdrop-blur-sm border",
        "flex items-center gap-3 px-4",
        className,
      )}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden relative">
        {characterAvatar && (
          <Image
            src={characterAvatar}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{characterName}</p>
        <p className="text-xs text-muted-foreground">{statusText}</p>
      </div>

      {/* Status indicator */}
      <div className={indicatorClassName} />

      {/* Expand button */}
      <button
        onClick={onExpand}
        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Expand voice panel"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* End call button */}
      <button
        onClick={onEndCall}
        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-destructive"
        aria-label="End voice call"
      >
        <Phone className="w-5 h-5" />
      </button>
    </div>
  );
}
