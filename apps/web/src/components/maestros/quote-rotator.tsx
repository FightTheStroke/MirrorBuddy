'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMaestroQuotes, quoteSource, quoteText } from '@/data/maestri/quotes';
import { useLocale, useTranslations } from 'next-intl';

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
  const t = useTranslations('chat');
  const locale = useLocale();
  const quotes = getMaestroQuotes(maestroId, locale);
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

  // Switching language swaps the list underneath us; clamping here keeps the
  // card showing a line instead of undefined, without a render-time setState.
  const safeIndex = currentIndex % quotes.length;
  const currentQuote = quotes[safeIndex];
  const text = quoteText(currentQuote);
  const source = quoteSource(currentQuote);

  // Quotation marks are a claim: someone said this. Only a line with a source
  // earns them. The rest are MirrorBuddy writing in the maestro's spirit and
  // are shown as such — that distinction is the point of this component's
  // shape (DATA-GOVERNANCE-SOP.md, G-7).
  const rendered = source === undefined ? text : `\u201C${text}\u201D`;

  if (compact) {
    return (
      <p className={`text-slate-500 dark:text-slate-400 italic truncate ${className}`}>
        {rendered}
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
      aria-label={source === undefined ? t('fraseDelMaestro') : t('citazioneMotivazionale')}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={safeIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-slate-600 dark:text-slate-400 italic text-center line-clamp-2"
        >
          {rendered}
        </motion.p>
      </AnimatePresence>

      {source !== undefined && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1 not-italic">
          {source}
        </p>
      )}

      {quotes.length > 1 && (
        <div
          className="flex justify-center gap-1 mt-2"
          role="tablist"
          aria-label={t('quoteIndicators')}
        >
          {quotes.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === safeIndex
                  ? 'bg-slate-400 dark:bg-slate-500 w-3'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label={t('vaiAllaCitazione', { index: index + 1 })}
              aria-selected={index === safeIndex}
              role="tab"
            />
          ))}
        </div>
      )}
    </div>
  );
}
