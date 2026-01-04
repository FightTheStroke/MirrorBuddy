/**
 * Stat Card Component
 * Displays key metrics with trend indicators
 * Supports multiple color variants and sizes
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatCardColor = 'blue' | 'green' | 'orange' | 'purple' | 'amber';
export type StatCardSize = 'sm' | 'md' | 'lg';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: StatCardColor;
  size?: StatCardSize;
  className?: string;
}

const colorVariants: Record<StatCardColor, { bg: string; text: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'text-amber-500',
  },
};

const sizeVariants: Record<StatCardSize, { padding: string; titleSize: string; valueSize: string }> = {
  sm: {
    padding: 'p-4',
    titleSize: 'text-xs',
    valueSize: 'text-xl',
  },
  md: {
    padding: 'p-6',
    titleSize: 'text-sm',
    valueSize: 'text-2xl',
  },
  lg: {
    padding: 'p-8',
    titleSize: 'text-base',
    valueSize: 'text-4xl',
  },
};

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'blue',
  size = 'md',
  className,
}: StatCardProps) {
  const colors = colorVariants[color];
  const sizes = sizeVariants[size];

  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <ArrowUp className="w-4 h-4" />;
    if (change < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-slate-500';
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-slate-500';
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className={sizes.padding}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn('font-medium text-slate-500 dark:text-slate-400', sizes.titleSize)}>
              {title}
            </p>
            <motion.p
              className={cn('font-bold mt-2', colors.text, sizes.valueSize)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.p>

            {(change !== undefined || changeLabel) && (
              <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', getTrendColor())}>
                {getTrendIcon()}
                {change !== undefined && (
                  <span>
                    {Math.abs(change)}%
                  </span>
                )}
                {changeLabel && <span className="text-slate-500 ml-1">{changeLabel}</span>}
              </div>
            )}
          </div>

          {icon && (
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg)}>
              <div className={colors.icon}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
