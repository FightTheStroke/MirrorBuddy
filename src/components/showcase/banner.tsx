'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShowcaseBannerProps {
  className?: string;
  dismissable?: boolean;
}

export function ShowcaseBanner({ className, dismissable = false }: ShowcaseBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'sticky top-0 z-50 bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-500/90 backdrop-blur-sm border-b border-amber-600',
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-950">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium text-sm">
              Modalita Showcase - Configura un LLM per le funzionalita complete
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/landing"
              className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configura ora
            </Link>

            {dismissable && (
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 hover:bg-amber-600/50 rounded transition-colors text-amber-950"
                aria-label="Chiudi banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact variant for inline use
export function ShowcaseBannerCompact({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30',
        className
      )}
    >
      <div className="flex items-center gap-2 text-amber-300">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm">
          Questa funzione richiede un LLM configurato
        </span>
      </div>
      <Link
        href="/landing"
        className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
      >
        Configura
      </Link>
    </div>
  );
}

// Badge variant for small indicators
export function ShowcaseBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-semibold rounded-full uppercase tracking-wide',
        className
      )}
    >
      <Sparkles className="w-3 h-3" />
      Showcase
    </span>
  );
}
