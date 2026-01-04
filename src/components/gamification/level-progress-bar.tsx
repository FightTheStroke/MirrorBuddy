/**
 * Level Progress Bar Component
 * Shows progress towards next level with MirrorBucks indicator
 */

'use client';

import { useProgressStore } from '@/lib/stores/progress-store';
import {
  getMirrorBucksToNextLevel,
  getLevelProgress,
  MIRRORBUCKS_PER_LEVEL,
} from '@/lib/constants/mirrorbucks';

interface LevelProgressBarProps {
  showDetails?: boolean;
  className?: string;
}

export function LevelProgressBar({
  showDetails = true,
  className = '',
}: LevelProgressBarProps) {
  const seasonLevel = useProgressStore((state) => state.seasonLevel);
  const seasonMirrorBucks = useProgressStore((state) => state.seasonMirrorBucks);

  const progress = getLevelProgress(seasonLevel, seasonMirrorBucks);
  const remaining = getMirrorBucksToNextLevel(seasonLevel, seasonMirrorBucks);
  const isMaxLevel = seasonLevel >= 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            Livello {seasonLevel}
            {isMaxLevel && ' (Max)'}
          </span>
          {!isMaxLevel && (
            <span className="text-muted-foreground">{remaining} MB per Livello {seasonLevel + 1}</span>
          )}
        </div>
      )}

      <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to next level: ${Math.round(progress)}%`}
        >
          {progress > 10 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {showDetails && !isMaxLevel && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{MIRRORBUCKS_PER_LEVEL[seasonLevel - 1]} MB</span>
          <span>{Math.round(progress)}%</span>
          <span>{MIRRORBUCKS_PER_LEVEL[seasonLevel]} MB</span>
        </div>
      )}
    </div>
  );
}
