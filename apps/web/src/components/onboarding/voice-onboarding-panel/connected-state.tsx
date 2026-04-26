"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PhoneOff, Mic, MicOff, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VoiceTranscriptEntry } from "@/lib/stores/onboarding-store";

interface ChecklistItem {
  key: string;
  label: string;
  value: string | null;
  required: boolean;
}

interface ConnectedStateProps {
  isSpeaking: boolean;
  isListening: boolean;
  isMuted: boolean;
  recentTranscript: VoiceTranscriptEntry[];
  checklist: ChecklistItem[];
  onMute: () => void;
  onHangup: () => void;
  className?: string;
}

export function ConnectedState({
  isSpeaking,
  isListening,
  isMuted,
  recentTranscript,
  checklist,
  onMute,
  onHangup,
  className,
}: ConnectedStateProps) {
  const t = useTranslations("welcome.onboarding.voicePanel");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col rounded-2xl overflow-hidden shadow-2xl",
        "bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700",
        className,
      )}
    >
      {/* Header with avatar */}
      <div className="flex items-center gap-4 p-6 pb-4">
        <motion.div
          animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative"
        >
          <div
            className={cn(
              "w-20 h-20 rounded-full overflow-hidden border-4 transition-all",
              isSpeaking
                ? "border-white shadow-lg shadow-white/30"
                : "border-white/50",
            )}
          >
            <Image
              src="/avatars/melissa.webp"
              alt="Melissa"
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          </div>
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse" />
        </motion.div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">Melissa</h3>
          <p className="text-sm text-pink-100">
            {isSpeaking
              ? t("speaking")
              : isMuted
                ? t("microphoneMuted")
                : isListening
                  ? t("listening")
                  : t("connected")}
          </p>
        </div>

        {/* Audio visualizer */}
        <div className="flex items-center gap-1 h-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{
                height: isSpeaking
                  ? [4, 20 + i * 3, 4]
                  : isListening && !isMuted
                    ? [4, 8, 4]
                    : 4,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.5 + i * 0.1,
                ease: "easeInOut",
              }}
              className={cn(
                "w-1.5 rounded-full",
                isSpeaking
                  ? "bg-white"
                  : isListening && !isMuted
                    ? "bg-white/60"
                    : "bg-white/30",
              )}
            />
          ))}
        </div>
      </div>

      {/* Transcript area */}
      <div className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm min-h-[120px] max-h-[200px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {recentTranscript.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-pink-100 text-sm italic text-center py-4"
            >
              {t("speakWithMelissa")}
            </motion.p>
          ) : (
            recentTranscript.map((entry) => (
              <motion.div
                key={entry.timestamp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "mb-2 p-2 rounded-lg text-sm",
                  entry.role === "assistant"
                    ? "bg-white/20 text-white"
                    : "bg-pink-800/30 text-pink-100 ml-4",
                )}
              >
                <span className="font-medium">
                  {entry.role === "assistant" ? t("melissa") : t("you")}
                </span>
                {entry.text}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Checklist */}
      <div className="px-6 py-3 bg-white/5">
        <div className="flex flex-wrap gap-2">
          {checklist.map((item) => (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                item.value
                  ? "bg-green-500/20 text-green-100"
                  : "bg-white/10 text-white/60",
              )}
            >
              {item.value ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span>{item.label}</span>
              {item.value && (
                <span className="font-medium">: {item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-pink-800/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMute}
          aria-label={isMuted ? t("enableMicrophone") : t("disableMicrophone")}
          className={cn(
            "rounded-full w-14 h-14 transition-colors",
            isMuted
              ? "bg-red-500/20 text-red-200 hover:bg-red-500/30"
              : "bg-white/20 text-white hover:bg-white/30",
          )}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onHangup}
          className="rounded-full w-14 h-14 bg-red-500 text-white hover:bg-red-600"
          aria-label={t("endCall")}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </motion.div>
  );
}
