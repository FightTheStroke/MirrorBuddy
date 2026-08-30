'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMaestroQuotes, quoteSource, quoteText } from '@/data/maestri/quotes';
import { useLocale, useTranslations } from 'next-intl';
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';

interface QuoteRotatorProps {
  maestroId: string;
  className?: string;
  rotationInterval?: number; // milliseconds
  pauseOnHover?: boolean;
  compact?: boolean; // Condensed layout, no dots
  /**
   * Auto-advance to the next line. Off means one stable line, which is the
   * right default anywhere the reader cannot pause it with the keyboard.
   */
  rotate?: boolean;
  /** Lines of text before truncation in the compact layout. */
  clampLines?: 1 | 2 | 3;
}

/**
 * QuoteRotator - Displays a maestro's lines, optionally rotating.
 *
 * Auto-advancing text is movement: it is disabled under
 * prefers-reduced-motion, and callers that cannot offer a keyboard-reachable
 * pause control should pass rotate={false} (WCAG 2.2.2).
 */
export function QuoteRotator({
  maestroId,
  className = '',
  rotationInterval = 5000,
  pauseOnHover = true,
  compact = false,
  rotate = true,
  clampLines = 1,
}: QuoteRotatorProps) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const quotes = getMaestroQuotes(maestroId, locale);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const autoRotate = rotate && !prefersReducedMotion;

  // Auto-rotate quotes
  useEffect(() => {
    if (!autoRotate || !quotes || quotes.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, quotes, rotationInterval, isPaused]);

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
    const clamp =
      clampLines === 1 ? 'truncate' : clampLines === 2 ? 'line-clamp-2' : 'line-clamp-3';
    return (
      <div className={className} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <p className={`text-slate-500 dark:text-slate-400 italic ${clamp}`}>{rendered}</p>
        {source !== undefined && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 not-italic truncate mt-0.5">
            {source}
          </p>
        )}
      </div>
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
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
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
