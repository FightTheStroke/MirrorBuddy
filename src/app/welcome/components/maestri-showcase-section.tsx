"use client";

import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { maestri, SUBJECT_NAMES } from "@/data/maestri";

const DISPLAY_COUNT = 5;

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Professori Showcase Section - Horizontal Carousel
 *
 * THE PRIMARY VALUE PROPOSITION of MirrorBuddy:
 * Learn WITH the greatest minds in history, not just ABOUT them.
 *
 * Shows 5 random professors in a scrollable horizontal carousel.
 */
export function MaestriShowcaseSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Randomize and pick 5 professors
  const displayedMaestri = useMemo(
    () => shuffleArray(maestri).slice(0, DISPLAY_COUNT),
    [],
  );

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      // Card width (w-44 = 176px) + gap (16px) = 192px per card, scroll 2 cards
      const scrollAmount = 384;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full max-w-6xl mx-auto px-4 mb-16 mt-8"
      aria-labelledby="maestri-heading"
    >
      {/* Section Header - Clean, no badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-8"
      >
        <h2
          id="maestri-heading"
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
        >
          I tuoi{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            Professori
          </span>
        </h2>

        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {maestri.length} menti straordinarie della storia diventano i tuoi
          professori personali.
        </p>
      </motion.div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -ml-2"
          aria-label="Scorri a sinistra"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-2 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          tabIndex={0}
          role="region"
          aria-label="Carosello professori - usa le frecce per navigare"
        >
          {displayedMaestri.map((maestro, i) => (
            <motion.div
              key={maestro.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.6 + i * 0.03,
                type: "spring",
                stiffness: 150,
                damping: 15,
              }}
              className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all"
            >
              {/* Avatar */}
              <div
                className="w-16 h-16 mx-auto mb-3 rounded-full p-0.5"
                style={{
                  background: `linear-gradient(135deg, ${maestro.color}, ${maestro.color}80)`,
                }}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                  <Image
                    src={maestro.avatar}
                    alt={`${maestro.displayName} - Professore di ${SUBJECT_NAMES[maestro.subject] || maestro.subject}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                {maestro.displayName}
              </h3>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {SUBJECT_NAMES[maestro.subject] || maestro.subject}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -mr-2"
          aria-label="Scorri a destra"
        >
          <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Scroll hint for mobile */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 md:hidden">
        ← Scorri per vedere i professori →
      </p>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 max-w-2xl mx-auto">
        I professori AI sono creati a scopo educativo e dimostrativo. In futuro
        ogni studente potra creare i propri professori personalizzati.{" "}
        <a
          href="/ai-transparency"
          className="underline hover:text-gray-600 dark:hover:text-gray-400"
        >
          Scopri di piu
        </a>
      </p>
    </motion.section>
  );
}
