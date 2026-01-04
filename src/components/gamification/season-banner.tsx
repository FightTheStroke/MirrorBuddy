/**
 * Season Banner Component
 * Shows current season name, icon, and days remaining
 */

'use client';

import { useProgressStore } from '@/lib/stores/progress-store';
import { getDaysRemainingInSeason } from '@/lib/gamification/seasons';
import { useEffect, useState } from 'react';

interface SeasonBannerProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export function SeasonBanner({ variant = 'full', className = '' }: SeasonBannerProps) {
  const currentSeason = useProgressStore((state) => state.currentSeason);
  const seasonLevel = useProgressStore((state) => state.seasonLevel);
  const [daysRemaining, setDaysRemaining] = useState(getDaysRemainingInSeason());

  // Update days remaining every hour
  useEffect(() => {
    const interval = setInterval(() => {
      setDaysRemaining(getDaysRemainingInSeason());
    }, 60 * 60 * 1000); // Update every hour

    return () => clearInterval(interval);
  }, []);

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full ${className}`}
      >
        <span className="text-xl" aria-hidden="true">
          {currentSeason.icon}
        </span>
        <span className="text-sm font-medium">{currentSeason.name}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20 ${className}`}
      role="banner"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-2xl sm:text-3xl" aria-hidden="true">
          {currentSeason.icon}
        </span>
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Stagione {currentSeason.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'} rimanenti
          </p>
        </div>
      </div>
      <div className="text-left sm:text-right w-full sm:w-auto flex sm:block items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Livello Stagionale
        </p>
        <p className="text-xl sm:text-2xl font-bold">{seasonLevel}</p>
      </div>
    </div>
  );
}
