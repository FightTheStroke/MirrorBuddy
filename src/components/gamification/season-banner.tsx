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
      className={`flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20 ${className}`}
      role="banner"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {currentSeason.icon}
        </span>
        <div>
          <h3 className="text-lg font-semibold">Stagione {currentSeason.name}</h3>
          <p className="text-sm text-muted-foreground">
            {daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'} rimanenti
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Livello Stagionale
        </p>
        <p className="text-2xl font-bold">{seasonLevel}</p>
      </div>
    </div>
  );
}
