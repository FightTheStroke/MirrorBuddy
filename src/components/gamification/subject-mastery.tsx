'use client';

import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subjectNames, subjectColors } from '@/data';
import { cn } from '@/lib/utils';
import type { SubjectMastery, MasteryTier } from '@/types';

interface SubjectMasteryListProps {
  masteries: SubjectMastery[];
  className?: string;
}

const tierNames: Record<MasteryTier, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
  expert: 'Esperto',
  master: 'Maestro',
};

const tierColors: Record<MasteryTier, string> = {
  beginner: 'text-slate-500',
  intermediate: 'text-blue-500',
  advanced: 'text-purple-500',
  expert: 'text-amber-500',
  master: 'text-red-500',
};

export function SubjectMasteryList({ masteries, className }: SubjectMasteryListProps) {
  // Sort by percentage descending
  const sortedMasteries = [...masteries].sort((a, b) => b.percentage - a.percentage);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          Padronanza Materie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedMasteries.map((mastery, index) => (
          <SubjectMasteryItem
            key={mastery.subject}
            mastery={mastery}
            index={index}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface SubjectMasteryItemProps {
  mastery: SubjectMastery;
  index: number;
}

function SubjectMasteryItem({ mastery, index }: SubjectMasteryItemProps) {
  const color = subjectColors[mastery.subject];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="space-y-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium">{subjectNames[mastery.subject]}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Trend indicator */}
          <TrendIndicator trend={mastery.lastStudied ? 'improving' : 'stable'} />
          {/* Tier badge */}
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800',
            tierColors[mastery.tier]
          )}>
            {tierNames[mastery.tier]}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${mastery.percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>{mastery.topicsCompleted}/{mastery.totalTopics} argomenti</span>
        <span className="font-medium" style={{ color }}>
          {mastery.percentage}%
        </span>
      </div>
    </motion.div>
  );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-slate-400" />;
  }
}

// Compact version for dashboard
interface CompactMasteryProps {
  masteries: SubjectMastery[];
  className?: string;
}

export function CompactMastery({ masteries, className }: CompactMasteryProps) {
  // Show top 3 subjects
  const topSubjects = [...masteries]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return (
    <div className={cn('flex gap-3', className)}>
      {topSubjects.map((mastery) => (
        <div
          key={mastery.subject}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: subjectColors[mastery.subject] }}
          />
          <span className="text-xs font-medium">{mastery.percentage}%</span>
        </div>
      ))}
    </div>
  );
}
