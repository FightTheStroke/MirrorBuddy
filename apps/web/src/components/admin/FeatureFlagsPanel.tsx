/**
 * Feature Flags Admin Panel
 *
 * V1Plan FASE 2.0.6: Admin UI for feature flag management
 * Uses API endpoint instead of direct imports to avoid server/client boundary issues
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useFeaturePolicyPanel } from './use-feature-policy-panel';
import { FeatureFlagRow, StatusBadge } from './feature-policy-status';

interface FeatureFlagsPanelProps {
  onFlagUpdate?: (featureId: string, enabled: boolean) => void;
}

export function FeatureFlagsPanel({ onFlagUpdate }: FeatureFlagsPanelProps) {
  const t = useTranslations('admin');
  const { flags, globalKillSwitch, level, isLoading, updating, error, instancePolicy, mutate } =
    useFeaturePolicyPanel(onFlagUpdate);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse motion-reduce:animate-none space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Status Card */}
      <Card className={globalKillSwitch ? 'border-red-500' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{t('systemStatus')}</span>
            <StatusBadge
              status={globalKillSwitch ? 'critical' : level === 'none' ? 'healthy' : level}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {globalKillSwitch
                  ? t('policyWrite.globalStopped')
                  : level !== 'none'
                    ? t('policyWrite.degraded', { level: t(`policyWrite.${level}`) })
                    : t('policyWrite.operational')}
              </p>
            </div>
            <Button
              variant={globalKillSwitch ? 'default' : 'destructive'}
              size="sm"
              onClick={() => void mutate('global', !globalKillSwitch)}
              disabled={updating !== null}
            >
              {updating === 'global'
                ? '...'
                : globalKillSwitch
                  ? t('policyWrite.reactivateAll')
                  : t('policyWrite.globalStop')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4">
            <p role="alert" className="text-red-700 text-sm">
              {t(`policyWrite.${error}`)}
            </p>
          </CardContent>
        </Card>
      )}
      {instancePolicy && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('policyWrite.instanceNotice')}
        </p>
      )}

      {/* Feature Flags List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('featureFlags')}
            {flags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {flags.map((flag) => (
              <FeatureFlagRow
                key={flag.id}
                flag={flag}
                onToggle={() => void mutate(flag.id, !flag.killSwitch)}
                isUpdating={updating !== null}
                globalDisabled={globalKillSwitch}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FeatureFlagsPanel;
