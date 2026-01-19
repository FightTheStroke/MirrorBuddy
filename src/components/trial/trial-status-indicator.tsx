"use client";

import { MessageCircle, Mic, Wrench } from "lucide-react";

interface TrialStatusIndicatorProps {
  // Chat stats
  chatsUsed: number;
  maxChats?: number;
  // Voice stats (seconds)
  voiceSecondsUsed?: number;
  maxVoiceSeconds?: number;
  // Tool stats
  toolsUsed?: number;
  maxTools?: number;
  // Display options
  showVoice?: boolean;
  showTools?: boolean;
  className?: string;
}

/**
 * Trial Status Indicator
 *
 * Shows remaining resources in trial mode.
 * Can show chat, voice, and tool limits.
 */
export function TrialStatusIndicator({
  chatsUsed,
  maxChats = 10,
  voiceSecondsUsed = 0,
  maxVoiceSeconds = 300,
  toolsUsed = 0,
  maxTools = 10,
  showVoice = false,
  showTools = false,
  className = "",
}: TrialStatusIndicatorProps) {
  const chatsRemaining = Math.max(0, maxChats - chatsUsed);
  const chatProgress = (chatsUsed / maxChats) * 100;

  const voiceRemaining = Math.max(0, maxVoiceSeconds - voiceSecondsUsed);
  const voiceMinutes = Math.floor(voiceRemaining / 60);
  const voiceProgress = (voiceSecondsUsed / maxVoiceSeconds) * 100;

  const toolsRemaining = Math.max(0, maxTools - toolsUsed);
  const toolProgress = (toolsUsed / maxTools) * 100;

  // Color based on remaining (any resource low = warning)
  const isLow =
    chatsRemaining <= 3 ||
    (showVoice && voiceRemaining <= 60) ||
    (showTools && toolsRemaining <= 3);
  const isCritical =
    chatsRemaining === 0 ||
    (showVoice && voiceRemaining === 0) ||
    (showTools && toolsRemaining === 0);

  let colorClass = "text-green-600 dark:text-green-400";
  let bgClass = "bg-green-100 dark:bg-green-900/30";

  if (isLow) {
    colorClass = "text-amber-600 dark:text-amber-400";
    bgClass = "bg-amber-100 dark:bg-amber-900/30";
  }
  if (isCritical) {
    colorClass = "text-red-600 dark:text-red-400";
    bgClass = "bg-red-100 dark:bg-red-900/30";
  }

  return (
    <div
      data-testid="trial-status"
      className={`flex items-center gap-3 px-3 py-1.5 rounded-full ${bgClass} ${className}`}
    >
      {/* Chat indicator */}
      <div className="flex items-center gap-1.5">
        <MessageCircle className={`w-3.5 h-3.5 ${colorClass}`} />
        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              chatsRemaining === 0
                ? "bg-red-500"
                : chatsRemaining <= 3
                  ? "bg-amber-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${chatProgress}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${colorClass}`}>
          {chatsRemaining}
        </span>
      </div>

      {/* Voice indicator */}
      {showVoice && (
        <div className="flex items-center gap-1.5">
          <Mic className={`w-3.5 h-3.5 ${colorClass}`} />
          <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                voiceRemaining === 0
                  ? "bg-red-500"
                  : voiceRemaining <= 60
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${voiceProgress}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${colorClass}`}>
            {voiceMinutes}m
          </span>
        </div>
      )}

      {/* Tool indicator */}
      {showTools && (
        <div className="flex items-center gap-1.5">
          <Wrench className={`w-3.5 h-3.5 ${colorClass}`} />
          <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                toolsRemaining === 0
                  ? "bg-red-500"
                  : toolsRemaining <= 3
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${toolProgress}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${colorClass}`}>
            {toolsRemaining}
          </span>
        </div>
      )}
    </div>
  );
}

export default TrialStatusIndicator;
