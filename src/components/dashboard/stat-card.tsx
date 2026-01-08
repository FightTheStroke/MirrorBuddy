/**
 * Stat Card Component
 * Displays key metrics with trend indicators
 * Harmonized design: uniform styling without colored variants
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatCardSize = 'sm' | 'md' | 'lg';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  size?: StatCardSize;
  className?: string;
}

const sizeVariants: Record<StatCardSize, { padding: string; titleSize: string; valueSize: string }> = {
  sm: { padding: 'p-4', titleSize: 'text-xs', valueSize: 'text-xl' },
  md: { padding: 'p-6', titleSize: 'text-sm', valueSize: 'text-2xl' },
  lg: { padding: 'p-8', titleSize: 'text-base', valueSize: 'text-4xl' },
};

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  size = 'md',
  className,
}: StatCardProps) {
  const sizes = sizeVariants[size];

  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <ArrowUp className="w-4 h-4" />;
    if (change < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-muted-foreground';
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className={sizes.padding}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn('font-medium text-muted-foreground', sizes.titleSize)}>
              {title}
            </p>
            <motion.p
              className={cn('font-bold mt-2 text-foreground', sizes.valueSize)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.p>

            {(change !== undefined || changeLabel) && (
              <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', getTrendColor())}>
                {getTrendIcon()}
                {change !== undefined && <span>{Math.abs(change)}%</span>}
                {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
              </div>
            )}
          </div>

          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
