"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { maestri, subjectNames } from "@/data";

/**
 * Professori Showcase Section V2 - Clean, no duplications
 *
 * Shows all professors in a scrollable horizontal carousel.
 * Removed "Il Cuore di MirrorBuddy" badge to avoid duplication with hero.
 */
export function MaestriShowcaseSectionV2() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
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
      className="w-full max-w-6xl mx-auto px-4 mb-16"
      aria-labelledby="maestri-heading"
    >
      {/* Section Header - Simplified */}
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
            22 Professori
          </span>
        </h2>

        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Scegli il maestro giusto per ogni materia
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
          {maestri.map((maestro, i) => (
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
              className="flex-shrink-0 w-36 bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all"
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
                    alt={`${maestro.name} - Professore di ${subjectNames[maestro.subject] || maestro.subject}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate">
                {maestro.name}
              </h3>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                {subjectNames[maestro.subject] || maestro.subject}
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
        ← Scorri per vedere tutti i professori →
      </p>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 max-w-2xl mx-auto">
        I professori AI sono creati a scopo educativo e dimostrativo. In futuro
        ogni studente potra creare i propri professori personalizzati.{" "}
        <a
          href="/terms#section-4"
          className="underline hover:text-gray-600 dark:hover:text-gray-400"
        >
          Scopri di piu
        </a>
      </p>
    </motion.section>
  );
}
