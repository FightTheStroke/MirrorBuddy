import { Zap, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AchievementsTabProps {
  unlocked: string[];
  allAchievements: Array<{ id: string; name: string; desc: string; icon: string; xp: number }>;
}

export function AchievementsTab({ unlocked, allAchievements }: AchievementsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allAchievements.map(achievement => {
        const isUnlocked = unlocked.includes(achievement.id);
        return (
          <Card
            key={achievement.id}
            className={cn(
              'transition-all',
              isUnlocked
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
                : 'opacity-60'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'text-4xl',
                    !isUnlocked && 'grayscale'
                  )}
                >
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {achievement.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {achievement.desc}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600">
                      +{achievement.xp} XP
                    </span>
                  </div>
                </div>
                {isUnlocked && (
                  <Award className="w-6 h-6 text-amber-500" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

