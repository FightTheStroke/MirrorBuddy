"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  SkipForward,
  User,
  GraduationCap,
  Heart,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SCHOOL_LEVELS, LEARNING_DIFFERENCES } from "./info-step-data";

interface InfoStepFormProps {
  userName: string;
  age?: number;
  schoolLevel?: "elementare" | "media" | "superiore";
  selectedDifferences: string[];
  isVoiceMuted: boolean;
  isPlaying: boolean;
  isReplayMode: boolean;
  onAgeChange: (age: number) => void;
  onSchoolLevelChange: (level: "elementare" | "media" | "superiore") => void;
  onDifferenceToggle: (id: string) => void;
  onMuteToggle: () => void;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}

/**
 * Form mode for InfoStep - fallback form when Azure voice unavailable
 * Collects age, school level, and learning differences
 */
export function InfoStepForm({
  userName,
  age,
  schoolLevel,
  selectedDifferences,
  isVoiceMuted,
  isPlaying,
  isReplayMode,
  onAgeChange,
  onSchoolLevelChange,
  onDifferenceToggle,
  onMuteToggle,
  onBack,
  onSkip,
  onContinue,
}: InfoStepFormProps) {
  const t = useTranslations("welcome.welcome-form");

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-200 shadow">
            <Image
              src="/avatars/melissa.jpg"
              alt="Melissa"
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {t("tell-me-about-you", { name: userName })}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t("help-personalize")}
            </p>
          </div>
          {/* Voice toggle (Web Speech) */}
          <button
            onClick={onMuteToggle}
            className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
            aria-label={isVoiceMuted ? "Attiva voce" : "Disattiva voce"}
          >
            {isVoiceMuted ? (
              <VolumeX className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            ) : (
              <Volume2
                className={cn(
                  "w-5 h-5 text-pink-600 dark:text-pink-400",
                  isPlaying && "animate-pulse",
                )}
              />
            )}
          </button>
        </div>

        {/* Age input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <User className="w-4 h-4" />
            Quanti anni hai?
          </label>
          <div className="flex gap-2 flex-wrap">
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((a) => (
              <button
                key={a}
                onClick={() => onAgeChange(a)}
                className={cn(
                  "w-10 h-10 rounded-lg font-medium transition-all",
                  age === a
                    ? "bg-pink-500 text-white shadow-lg scale-110"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        {/* School level */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <GraduationCap className="w-4 h-4" />
            Che scuola fai?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {SCHOOL_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => onSchoolLevelChange(level.id)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-center",
                  schoolLevel === level.id
                    ? "border-pink-500 bg-pink-50 dark:bg-pink-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-pink-300",
                )}
              >
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {level.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {level.years}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Learning differences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Heart className="w-4 h-4" />
            {t("learning-differences-label")}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("learning-differences-hint")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LEARNING_DIFFERENCES.map((diff) => (
              <button
                key={diff.id}
                onClick={() => onDifferenceToggle(diff.id)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2",
                  selectedDifferences.includes(diff.id)
                    ? "border-pink-500 bg-pink-50 dark:bg-pink-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-pink-300",
                )}
              >
                <span className="text-xl">{diff.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {diff.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 pt-4"
        >
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Indietro
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="lg"
            className="text-gray-500"
          >
            <SkipForward className="mr-2 w-4 h-4" />
            Salta
          </Button>
          <Button
            onClick={onContinue}
            size="lg"
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
          >
            Avanti
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>

        {isReplayMode && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {t("replay-mode-message")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
