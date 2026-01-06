import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { subjectNames, subjectColors, subjectIcons } from '@/data';
import type { Subject } from '@/types';

interface MasteryTabProps {
  masteries: Record<string, { tier?: string; progress?: number; percentage?: number; topicsCompleted?: number }>;
}

export function MasteryTab({ masteries }: MasteryTabProps) {
  const tiers = ['beginner', 'intermediate', 'advanced', 'expert', 'master'];
  const tierLabels: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzato',
    expert: 'Esperto',
    master: 'Professore',
  };

  const subjects: Subject[] = ['mathematics', 'physics', 'chemistry', 'biology', 'history', 'geography', 'italian', 'english', 'art', 'music'];

  return (
    <div className="space-y-6">
      {subjects.map(subject => {
        const data = masteries?.[subject] || { tier: 'beginner', progress: 0, topicsCompleted: 0 };
        const tier = data.tier || 'beginner';
        const tierIndex = tiers.indexOf(tier);

        return (
          <Card key={subject}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${subjectColors[subject]}20` }}
                >
                  {subjectIcons[subject]}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {subjectNames[subject]}
                    </h4>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${subjectColors[subject]}20`,
                        color: subjectColors[subject],
                      }}
                    >
                      {tierLabels[tier]}
                    </span>
                  </div>

                  <div className="flex gap-1 mb-2">
                    {tiers.map((t, i) => (
                      <div
                        key={t}
                        className={cn(
                          'flex-1 h-2 rounded-full',
                          i <= tierIndex
                            ? 'bg-gradient-to-r'
                            : 'bg-slate-200 dark:bg-slate-700'
                        )}
                        style={i <= tierIndex ? {
                          backgroundImage: `linear-gradient(to right, ${subjectColors[subject]}, ${subjectColors[subject]})`
                        } : {}}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{data.topicsCompleted || 0} argomenti completati</span>
                    <span>{data.progress || data.percentage || 0}% al prossimo livello</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

