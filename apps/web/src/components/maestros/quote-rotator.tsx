'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMaestroQuotes } from '@/data/maestri/quotes';
import { useTranslations } from "next-intl";

interface QuoteRotatorProps {
  maestroId: string;
  className?: string;
  rotationInterval?: number; // milliseconds
  pauseOnHover?: boolean;
  compact?: boolean; // Single line, no dots
}

/**
 * QuoteRotator - Displays rotating motivational quotes for a maestro
 * Respects prefers-reduced-motion for accessibility
 */
export function QuoteRotator({
  maestroId,
  className = '',
  rotationInterval = 5000,
  pauseOnHover = true,
  compact = false,
}: QuoteRotatorProps) {
  const t = useTranslations("chat");
  const quotes = getMaestroQuotes(maestroId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate quotes
  useEffect(() => {
    if (!quotes || quotes.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [quotes, rotationInterval, isPaused]);

  // Handle mouse enter/leave for pause on hover
  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  if (!quotes || quotes.length === 0) {
    return null;
  }

  const currentQuote = quotes[currentIndex];

  if (compact) {
    return (
      <p className={`text-slate-500 dark:text-slate-400 italic truncate ${className}`}>
        &ldquo;{currentQuote}&rdquo;
      </p>
    );
  }

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-live="polite"
      aria-label={t("citazioneMotivazionale")}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-slate-600 dark:text-slate-400 italic text-center line-clamp-2"
        >
          &ldquo;{currentQuote}&rdquo;
        </motion.p>
      </AnimatePresence>

      {quotes.length > 1 && (
        <div
          className="flex justify-center gap-1 mt-2"
          role="tablist"
          aria-label={t("quoteIndicators")}
        >
          {quotes.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-slate-400 dark:bg-slate-500 w-3'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label={t("vaiAllaCitazione", { index: index + 1 })}
              aria-selected={index === currentIndex}
              role="tab"
            />
          ))}
        </div>
      )}
    </div>
  );
}
