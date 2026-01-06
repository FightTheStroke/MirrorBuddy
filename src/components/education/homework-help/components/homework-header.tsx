/**
 * @file homework-header.tsx
 * @brief Homework header component
 */

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { Homework } from '@/types';

interface HomeworkHeaderProps {
  homework: Homework;
}

export function HomeworkHeader({ homework }: HomeworkHeaderProps) {
  const completedSteps = homework.steps.filter((s) => s.completed).length;
  const progress = (completedSteps / homework.steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="mb-1">{homework.title}</CardTitle>
            <p className="text-sm text-slate-500">{homework.problemType}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-accent-themed">
              {completedSteps}/{homework.steps.length}
            </span>
            <p className="text-xs text-slate-500">passaggi completati</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent-themed"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </CardHeader>
    </Card>
  );
}

