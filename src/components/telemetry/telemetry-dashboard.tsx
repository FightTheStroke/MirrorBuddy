'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MessageCircle,
  BookOpen,
  Users,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTelemetryStore } from '@/lib/telemetry/telemetry-store';
import { StatCard } from './components/stat-card';
import { MiniBarChart } from './components/mini-bar-chart';
import { FeatureUsageBar } from './components/feature-usage-bar';

interface TelemetryDashboardProps {
  className?: string;
}

export function TelemetryDashboard({ className }: TelemetryDashboardProps) {
  const t = useTranslations('telemetry');
  const { localStats, usageStats, lastFetchedAt, fetchUsageStats, config, updateConfig } = useTelemetryStore();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch stats on mount and when refreshing
  useEffect(() => {
    if (!lastFetchedAt || Date.now() - lastFetchedAt.getTime() > 60000) {
      fetchUsageStats();
    }
  }, [lastFetchedAt, fetchUsageStats]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchUsageStats();
    setIsLoading(false);
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            {t('statsTitle')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('statsDesc')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          {t('refresh')}
        </Button>
      </div>

      {/* Today's Stats */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-3">{t('today')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title={t('sessions')}
            value={usageStats?.todaySessions ?? localStats.todaySessions}
            icon={<Users className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            title={t('studyTime')}
            value={formatMinutes(usageStats?.todayStudyMinutes ?? localStats.todayStudyMinutes)}
            icon={<Clock className="w-5 h-5 text-emerald-500" />}
          />
          <StatCard
            title={t('questions')}
            value={usageStats?.todayQuestions ?? localStats.todayQuestions}
            icon={<MessageCircle className="w-5 h-5 text-purple-500" />}
          />
          <StatCard
            title={t('pageViews')}
            value={localStats.todayPageViews}
            icon={<BookOpen className="w-5 h-5 text-orange-500" />}
          />
        </div>
      </div>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('weeklyActivity')}</span>
            {usageStats?.studyTimeTrend && (
              <span
                className={cn(
                  'text-sm font-normal flex items-center gap-1',
                  usageStats.studyTimeTrend === 'increasing' && 'text-emerald-500',
                  usageStats.studyTimeTrend === 'decreasing' && 'text-red-500',
                  usageStats.studyTimeTrend === 'stable' && 'text-slate-400'
                )}
              >
                {usageStats.studyTimeTrend === 'increasing' && <TrendingUp className="w-4 h-4" />}
                {usageStats.studyTimeTrend === 'decreasing' && <TrendingDown className="w-4 h-4" />}
                {usageStats.studyTimeTrend === 'stable' && <Minus className="w-4 h-4" />}
                {usageStats.studyTimeTrend === 'increasing' && t('trend.increasing')}
                {usageStats.studyTimeTrend === 'decreasing' && t('trend.decreasing')}
                {usageStats.studyTimeTrend === 'stable' && t('trend.stable')}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {t('weeklyStats')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MiniBarChart data={usageStats?.dailyActivityChart || []} height={100} />

          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {usageStats?.weeklySessionsCount ?? 0}
              </div>
              <div className="text-xs text-slate-500">{t('sessions')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {formatMinutes(usageStats?.weeklyActiveMinutes ?? 0)}
              </div>
              <div className="text-xs text-slate-500">{t('totalTime')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {usageStats?.weeklyMaestrosUsed?.length ?? 0}
              </div>
              <div className="text-xs text-slate-500">{t('maestriUsed')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Usage & Engagement */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Feature Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('featureUsage')}</CardTitle>
            <CardDescription>
              {t('featureUsageDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeatureUsageBar data={usageStats?.featureUsageChart || []} />
          </CardContent>
        </Card>

        {/* Engagement Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('engagementScore')}</CardTitle>
            <CardDescription>
              {t('engagementDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={cn(
                      (usageStats?.engagementScore ?? 0) >= 70
                        ? 'text-emerald-500'
                        : (usageStats?.engagementScore ?? 0) >= 40
                          ? 'text-amber-500'
                          : 'text-red-500'
                    )}
                    stroke="currentColor"
                    initial={{ strokeDasharray: '0 251.2' }}
                    animate={{
                      strokeDasharray: `${((usageStats?.engagementScore ?? 0) / 100) * 251.2} 251.2`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {usageStats?.engagementScore ?? 0}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-slate-500 mt-2">
              {(usageStats?.engagementScore ?? 0) >= 70
                ? t('engagementHigh')
                : (usageStats?.engagementScore ?? 0) >= 40
                  ? t('engagementMedium')
                  : t('engagementLow')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {t('telemetrySettings')}
          </CardTitle>
          <CardDescription>
            {t('telemetryDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{t('dataCollection')}</div>
              <div className="text-sm text-slate-500">
                {t('dataCollectionDesc')}
              </div>
            </div>
            <Button
              variant={config.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateConfig({ enabled: !config.enabled })}
            >
              {config.enabled ? t('active') : t('inactive')}
            </Button>
          </div>

          {/* Last updated */}
          {lastFetchedAt && (
            <div className="text-xs text-slate-400 mt-4 text-right">
              {t('lastUpdated')} {new Date(lastFetchedAt).toLocaleTimeString('it-IT')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TelemetryDashboard;
