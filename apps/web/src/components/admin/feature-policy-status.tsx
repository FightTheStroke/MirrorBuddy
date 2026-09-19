'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { FeatureFlag } from '@/lib/feature-flags/types';

export function FeatureFlagRow({
  flag,
  onToggle,
  isUpdating,
  globalDisabled,
}: {
  flag: FeatureFlag;
  onToggle: () => void;
  isUpdating: boolean;
  globalDisabled: boolean;
}) {
  const t = useTranslations('admin');
  const isDisabled = flag.killSwitch || globalDisabled || flag.status === 'disabled';
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border ${
        isDisabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          aria-hidden="true"
          className={`w-3 h-3 shrink-0 rounded-full ${
            flag.killSwitch
              ? 'bg-red-500'
              : flag.status === 'degraded'
                ? 'bg-yellow-500'
                : flag.status === 'enabled'
                  ? 'bg-green-500'
                  : 'bg-gray-400'
          }`}
        />
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <p className="font-medium text-sm">{flag.name}</p>
          <p className="text-xs text-muted-foreground">{flag.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {flag.enabledPercentage < 100 && (
          <span className="text-xs text-muted-foreground">
            {flag.enabledPercentage}
            {t('rollout')}
          </span>
        )}
        <Button
          variant={flag.killSwitch ? 'default' : 'outline'}
          size="sm"
          onClick={onToggle}
          disabled={isUpdating || globalDisabled}
        >
          {isUpdating
            ? '...'
            : flag.killSwitch
              ? t('policyWrite.enable')
              : t('policyWrite.disable')}
        </Button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'healthy' | 'partial' | 'severe' | 'critical' }) {
  const t = useTranslations('admin');
  const colors = {
    healthy: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    severe: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {t(`policyWrite.${status}`)}
    </span>
  );
}
