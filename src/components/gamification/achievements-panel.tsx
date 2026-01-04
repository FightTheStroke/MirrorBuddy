/**
 * Achievements Panel Component
 * Grid display of all achievements with locked/unlocked states
 */

'use client';

import { useMemo, memo } from 'react';
import { useProgressStore } from '@/lib/stores/progress-store';
import { ACHIEVEMENTS, getAchievementsByCategory } from '@/lib/gamification/achievements';
import type { Achievement } from '@/types';

interface AchievementsPanelProps {
  filterCategory?: Achievement['category'] | 'all';
  compact?: boolean;
  className?: string;
}

export function AchievementsPanel({
  filterCategory = 'all',
  compact = false,
  className = '',
}: AchievementsPanelProps) {
  const achievements = useProgressStore((state) => state.achievements);

  const displayedAchievements = useMemo(() => {
    const base = filterCategory === 'all'
      ? ACHIEVEMENTS
      : getAchievementsByCategory(filterCategory);

    // Merge with user's unlocked achievements
    return base.map((achievement) => {
      const unlocked = achievements.find((a) => a.id === achievement.id);
      return {
        ...achievement,
        unlockedAt: unlocked?.unlockedAt,
      };
    });
  }, [filterCategory, achievements]);

  const unlockedCount = displayedAchievements.filter((a) => a.unlockedAt).length;
  const totalCount = displayedAchievements.length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Achievements</h3>
        <span className="text-sm text-muted-foreground">
          {unlockedCount} / {totalCount} sbloccati
        </span>
      </div>

      <div
        className={`grid gap-3 ${
          compact ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        }`}
      >
        {displayedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  compact?: boolean;
}

const AchievementCard = memo(function AchievementCard({ achievement, compact = false }: AchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt;

  if (compact) {
    return (
      <div
        className={`relative aspect-square rounded-lg border-2 p-2 transition-all ${
          isUnlocked
            ? 'border-yellow-500/50 bg-yellow-500/10'
            : 'border-muted bg-muted/50 grayscale opacity-50'
        }`}
        title={`${achievement.name}: ${achievement.description}`}
        role="button"
        tabIndex={0}
        aria-label={`${achievement.name}${isUnlocked ? ' (sbloccato)' : ' (bloccato)'}`}
      >
        <div className="flex h-full items-center justify-center text-3xl">
          {achievement.icon}
        </div>
        {isUnlocked && (
          <div className="absolute -top-1 -right-1 text-xs">✓</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
        isUnlocked
          ? 'border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-500'
          : 'border-muted bg-muted/50 grayscale opacity-50'
      }`}
      role="article"
      aria-label={`${achievement.name}${isUnlocked ? ' (sbloccato)' : ' (bloccato)'}`}
    >
      <div className="text-4xl" aria-hidden="true">
        {achievement.icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{achievement.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {achievement.description}
        </p>
      </div>
      {isUnlocked ? (
        <div className="mt-auto flex items-center gap-1 text-xs text-green-500">
          <span>✓</span>
          <span>Sbloccato</span>
        </div>
      ) : (
        <div className="mt-auto text-xs text-muted-foreground">
          +{achievement.mirrorBucksReward} MB
        </div>
      )}
    </div>
  );
});
