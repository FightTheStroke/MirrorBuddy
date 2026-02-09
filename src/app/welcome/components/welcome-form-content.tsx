"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Sparkles, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  useOnboardingTTS,
  ONBOARDING_SCRIPTS,
} from "@/lib/hooks/use-onboarding-tts";

interface WelcomeFormContentProps {
  name: string;
  error: string;
  isVoiceMuted: boolean;
  isReplayMode: boolean;
  onNameChange: (value: string) => void;
  onContinue: () => void;
  onToggleMute: () => void;
}

export function WelcomeFormContent({
  name,
  error,
  isVoiceMuted,
  isReplayMode,
  onNameChange,
  onContinue,
  onToggleMute,
}: WelcomeFormContentProps) {
  const t = useTranslations("welcome.welcomeForm");
  const { isPlaying } = useOnboardingTTS({
    autoSpeak: !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.welcome,
    delay: 800,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Melissa header with gradient */}
        <div className="relative bg-gradient-to-r from-pink-500 to-pink-600 p-8 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-6"
          >
            {/* Melissa avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg">
                <Image
                  src="/avatars/melissa.webp"
                  alt={t("melissaCoach")}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5"
              >
                <Sparkles className="w-4 h-4 text-yellow-800" />
              </motion.div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{t("helloMelissa")}</h1>
              <p className="text-pink-100 text-sm">{t("yourSupportTeacher")}</p>
            </div>

            {/* Voice toggle button (Web Speech) */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onToggleMute}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label={isVoiceMuted ? t("enableVoice") : t("disableVoice")}
              title={isVoiceMuted ? t("enableVoice") : t("disableVoice")}
            >
              {isVoiceMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2
                  className={`w-5 h-5 text-white ${isPlaying ? "animate-pulse" : ""}`}
                />
              )}
            </motion.button>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("welcomeIntro")}
            </p>
            <p className="text-gray-600 dark:text-gray-400">{t("dontWorry")}</p>
          </motion.div>

          {/* Manual input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <label
              htmlFor="student-name"
              className="block text-lg font-medium text-gray-800 dark:text-gray-200"
            >
              {t("whatIsYourName")}
            </label>
            <Input
              ref={inputRef}
              id="student-name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onNameChange(e.target.value);
              }}
              placeholder={t("enterYourNamePlaceholder")}
              className="text-lg py-6 px-4 border-2 focus:border-pink-500 focus:ring-pink-500"
              aria-describedby={error ? "name-error" : undefined}
            />
            {error && (
              <p id="name-error" className="text-red-500 text-sm" role="alert">
                {error}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <Button
              onClick={onContinue}
              size="lg"
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-6 text-lg font-semibold shadow-lg"
            >
              {t("niceToMeetYou")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>

          {isReplayMode && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t("replayModeMessage")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
