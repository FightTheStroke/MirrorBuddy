/**
 * Churn Metrics Component
 * Shows churn rates and at-risk users
 * Plan 069 - Conversion Funnel Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChurnByStage {
  stage: string;
  totalEntered: number;
  churned: number;
  churnRate: number;
  avgDaysBeforeChurn: number;
}

interface AtRiskUser {
  visitorId: string | null;
  userId: string | null;
  lastStage: string;
  lastActivity: string;
  daysSinceActivity: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface ChurnData {
  overview: {
    totalVisitors: number;
    totalChurned: number;
    overallChurnRate: number;
    avgDaysToChurn: number;
  };
  byStage: ChurnByStage[];
  atRiskUsers: AtRiskUser[];
}

export function ChurnMetrics() {
  const t = useTranslations('admin');
  const [data, setData] = useState<ChurnData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/funnel/churn?days=30');
        if (res.ok) setData(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            {t('churnAnalysis1')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-48 bg-slate-200 dark:bg-slate-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const riskColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          {t('churnAnalysis')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold">{data.overview.totalVisitors}</p>
            <p className="text-xs text-muted-foreground">{t('totalUsers')}</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{data.overview.totalChurned}</p>
            <p className="text-xs text-muted-foreground">{t('churned')}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold">{data.overview.overallChurnRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{t('churnRate')}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold">{data.overview.avgDaysToChurn.toFixed(0)}d</p>
            <p className="text-xs text-muted-foreground">{t('avgDaysToChurn')}</p>
          </div>
        </div>

        {/* At-Risk Users */}
        {data.atRiskUsers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t('atRiskUsers')} ({data.atRiskUsers.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.atRiskUsers.slice(0, 10).map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs truncate max-w-32">
                      {user.userId || user.visitorId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{user.lastStage}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[user.riskLevel]}`}
                    >
                      {user.daysSinceActivity}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Churn by Stage */}
        <div>
          <h4 className="text-sm font-medium mb-2">{t('churnByStage')}</h4>
          <div className="space-y-1">
            {data.byStage
              .filter((s) => s.churned > 0)
              .map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between text-sm">
                  <span>{stage.stage}</span>
                  <span className="text-red-600">
                    {stage.churnRate.toFixed(1)}% ({stage.churned}/{stage.totalEntered})
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
