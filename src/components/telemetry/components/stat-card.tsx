'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
            {icon}
          </div>
          {trend && (
            <TrendIcon
              className={cn(
                'w-4 h-4',
                trend === 'up' && 'text-emerald-500',
                trend === 'down' && 'text-red-500',
                trend === 'stable' && 'text-slate-400'
              )}
            />
          )}
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-slate-500">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
