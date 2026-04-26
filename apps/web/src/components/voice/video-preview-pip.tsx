"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Video, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPreviewPipProps {
  videoStream: MediaStream;
  elapsedSeconds: number;
  framesSent: number;
  maxSeconds: number;
  onStop: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoPreviewPip({
  videoStream,
  elapsedSeconds,
  framesSent,
  maxSeconds,
  onStop,
}: VideoPreviewPipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("chat.session.controls");
  const remaining = Math.max(0, maxSeconds - elapsedSeconds);
  const isLow = remaining <= 10;

  useEffect(() => {
    const el = videoRef.current;
    if (el && videoStream) {
      el.srcObject = videoStream;
    }
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
  }, [videoStream]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className={cn(
        "absolute bottom-24 right-4 z-10",
        "rounded-xl overflow-hidden shadow-2xl",
        "border-2",
        isLow ? "border-red-500/70" : "border-white/20",
      )}
    >
      <div className="relative w-[160px] h-[120px] bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white">
          <Video className="w-3 h-3 text-red-400" />
          <span className={cn(isLow && "text-red-400 animate-pulse")}>
            {formatTimer(remaining)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onStop}
          aria-label={t("videoStopAriaLabel")}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white hover:bg-red-500/80 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white/70">
          {framesSent} {t("videoFramesLabel")}
        </div>
      </div>
    </motion.div>
  );
}
