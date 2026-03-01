'use client';

import { useTranslations } from 'next-intl';
import { Activity, ShieldAlert, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface StatusBarProps {
  healthStatus: HealthStatus | null;
  safetyUnresolved: number | null;
  dailyCostEur: number | null;
  costThreshold?: number;
}

const STATUS_COLORS: Record<string, string> = {
  green:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
};

function getHealthColor(status: HealthStatus): string {
  if (status === 'healthy') return 'green';
  if (status === 'degraded' || status === 'unknown') return 'amber';
  return 'red';
}

function getSafetyColor(count: number): string {
  if (count === 0) return 'green';
  if (count <= 3) return 'amber';
  return 'red';
}

function getCostColor(cost: number, threshold: number): string {
  if (cost <= threshold * 0.6) return 'green';
  if (cost <= threshold) return 'amber';
  return 'red';
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function StatusBar({
  healthStatus,
  safetyUnresolved,
  dailyCostEur,
  costThreshold = 5.0,
}: StatusBarProps) {
  const t = useTranslations('admin.dashboard');
  const isLoading = healthStatus === null || safetyUnresolved === null || dailyCostEur === null;

  if (isLoading) {
    return (
      <div className="flex gap-3" role="status" aria-label={t('statusBar.loading')}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-full" />
        ))}
      </div>
    );
  }

  const pills = [
    {
      label: t('statusBar.system'),
      value: healthStatus,
      color: getHealthColor(healthStatus),
      icon: Activity,
      section: 'health-section',
    },
    {
      label: t('statusBar.safety'),
      value: safetyUnresolved,
      color: getSafetyColor(safetyUnresolved),
      icon: ShieldAlert,
      section: 'safety-section',
    },
    {
      label: t('statusBar.costs'),
      value: `€${dailyCostEur.toFixed(2)}`,
      color: getCostColor(dailyCostEur, costThreshold),
      icon: DollarSign,
      section: 'cost-section',
    },
  ];

  return (
    <div className="flex flex-wrap gap-3" role="status">
      {pills.map((pill) => {
        const Icon = pill.icon;
        return (
          <button
            key={pill.section}
            onClick={() => scrollTo(pill.section)}
            aria-label={`${pill.label}: ${pill.value}`}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
              'transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              STATUS_COLORS[pill.color],
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pill.label}</span>
            <span className="font-semibold">{pill.value}</span>
          </button>
        );
      })}
    </div>
  );
}
