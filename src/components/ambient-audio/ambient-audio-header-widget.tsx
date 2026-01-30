"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAmbientAudio } from "@/lib/hooks/use-ambient-audio";
import { useVoiceSessionStore } from "@/lib/stores";
import type { AudioPreset } from "@/types";
import { cn } from "@/lib/utils";

export function AmbientAudioHeaderWidget() {
  const t = useTranslations("settings.ambientAudio");

  const QUICK_PRESETS: { id: AudioPreset; label: string; icon: string }[] = [
    { id: "focus", label: "Focus", icon: "🎯" },
    { id: "deep_work", label: "Deep Work", icon: "🧠" },
    { id: "creative", label: t("presets.creative"), icon: "✨" },
    { id: "rainy_day", label: t("presets.rainyDay"), icon: "🌧️" },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wasPlayingRef = useRef(false);

  // Get voice session state from store
  const voiceSessionActive = useVoiceSessionStore((state) => state.isConnected);

  const {
    playbackState,
    masterVolume,
    currentPreset,
    play,
    pause,
    stop,
    applyPreset,
    setMasterVolume,
  } = useAmbientAudio();

  const isPlaying = playbackState === "playing";
  const isPaused = playbackState === "paused";

  // Auto-pause when voice session starts, resume when it ends (ADR-0018)
  useEffect(() => {
    if (voiceSessionActive && isPlaying) {
      wasPlayingRef.current = true;
      pause();
    } else if (!voiceSessionActive && wasPlayingRef.current) {
      wasPlayingRef.current = false;
      play();
    }
  }, [voiceSessionActive, isPlaying, pause, play]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetClick = (preset: AudioPreset) => {
    applyPreset(preset);
    play();
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // If voice session is active, show disabled state
  if (voiceSessionActive) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
        <Headphones className="w-4 h-4" />
        <span className="text-xs">{t("paused")}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 gap-1.5 rounded-full transition-colors",
          isPlaying
            ? "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20"
            : "text-slate-500 hover:text-purple-500 hover:bg-purple-500/10",
        )}
        title="Audio Ambientale"
      >
        <Headphones className="w-4 h-4" />
        {isPlaying && (
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" />
            <div className="w-1 h-2 bg-purple-500 rounded-full animate-pulse delay-75" />
            <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse delay-150" />
          </div>
        )}
        <ChevronDown
          className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")}
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 z-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("title")}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePlay}
                disabled={!currentPreset && playbackState === "idle"}
                className="h-7 w-7"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-amber-500" />
                ) : (
                  <Play className="w-4 h-4 text-green-500" />
                )}
              </Button>
              {(isPlaying || isPaused) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stop}
                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                >
                  <VolumeX className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  currentPreset === preset.id
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
                )}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-3 mb-3">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <Slider
              value={[masterVolume * 100]}
              onValueChange={([value]) => setMasterVolume(value / 100)}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xs text-slate-500 w-8 text-right">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

          {/* Settings link */}
          <button
            onClick={() => {
              setIsOpen(false);
              window.dispatchEvent(
                new CustomEvent("open-settings", { detail: "ambient-audio" }),
              );
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{t("advancedSettings")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
