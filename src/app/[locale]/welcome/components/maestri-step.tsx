"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { maestri } from "@/data";
import { cn } from "@/lib/utils";
import {
  useOnboardingTTS,
  ONBOARDING_SCRIPTS,
} from "@/lib/hooks/use-onboarding-tts";

// Featured maestri to highlight (first shown in carousel)
const FEATURED_IDS = [
  "euclide",
  "leonardo",
  "curie",
  "shakespeare",
  "feynman",
  "darwin",
];

interface MaestriStepProps {
  useWebSpeechFallback?: boolean;
  onAzureUnavailable?: () => void;
}

/**
 * Step 4: Carousel of Maestri
 *
 * Shows the 16 historical figure tutors available in the platform.
 * Highlights a few featured ones and allows scrolling through all.
 */
export function MaestriStep(_props: MaestriStepProps) {
  const t = useTranslations("welcome.principles");
  const { data, nextStep, prevStep, isVoiceMuted, setVoiceMuted } =
    useOnboardingStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Auto-speak Melissa's maestri message
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.maestri,
    delay: 500,
  });

  const toggleMute = () => {
    if (isPlaying) stop();
    setVoiceMuted(!isVoiceMuted);
  };

  const handleNext = () => {
    stop();
    nextStep();
  };

  const handlePrev = () => {
    stop();
    prevStep();
  };

  // Sort maestri: featured first, then alphabetically
  const sortedMaestri = [...maestri].sort((a, b) => {
    const aFeatured = FEATURED_IDS.includes(a.id);
    const bFeatured = FEATURED_IDS.includes(b.id);
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;
    if (aFeatured && bFeatured) {
      return FEATURED_IDS.indexOf(a.id) - FEATURED_IDS.indexOf(b.id);
    }
    return a.name.localeCompare(b.name);
  });

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", updateScrollButtons);
      updateScrollButtons();
      return () => ref.removeEventListener("scroll", updateScrollButtons);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow">
            <Image
              src="/avatars/melissa.jpg"
              alt="Melissa"
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              I tuoi Professori, {data.name}!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {maestri.length} grandi geni pronti ad aiutarti
            </p>
          </div>
          {/* Voice toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors",
            )}
            aria-label={isVoiceMuted ? "Attiva voce" : "Disattiva voce"}
            title={isVoiceMuted ? "Attiva voce" : "Disattiva voce"}
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

        {/* Carousel */}
        <div className="relative">
          {/* Scroll buttons */}
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10",
              "w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-lg",
              "flex items-center justify-center transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            aria-label="Scorri a sinistra"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10",
              "w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-lg",
              "flex items-center justify-center transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            aria-label="Scorri a destra"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2"
            style={{ scrollSnapType: "x mandatory" }}
            tabIndex={0}
            role="region"
            aria-label="Carosello professori - usa le frecce per navigare"
          >
            {sortedMaestri.map((maestro, index) => (
              <motion.div
                key={maestro.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className="flex-shrink-0 w-36"
                style={{ scrollSnapAlign: "start" }}
              >
                <div
                  className="p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-pink-300 dark:hover:border-pink-700 transition-all"
                  style={{
                    borderColor: FEATURED_IDS.includes(maestro.id)
                      ? maestro.color
                      : undefined,
                  }}
                >
                  {/* Avatar */}
                  <div className="relative w-20 h-20 mx-auto mb-2">
                    <div
                      className="w-full h-full rounded-full overflow-hidden border-2"
                      style={{ borderColor: maestro.color }}
                    >
                      <Image
                        src={maestro.avatar}
                        alt={maestro.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    {FEATURED_IDS.includes(maestro.id) && (
                      <div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: maestro.color }}
                      >
                        <GraduationCap className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {maestro.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {maestro.specialty || maestro.subject}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Melissa's intro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50"
        >
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <strong>{t("howItWorks")}</strong> {t("howItWorksDesc")}
          </p>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3 pt-2"
        >
          <Button
            onClick={handlePrev}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Indietro
          </Button>
          <Button
            onClick={handleNext}
            size="lg"
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
          >
            Avanti
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
