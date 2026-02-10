'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { EmailStatsCards } from '@/components/admin/email-stats-cards';
import { EmailOpenChart } from '@/components/admin/email-open-chart';
import { ArrowLeft, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import type { GlobalStats, CampaignStats, TimelineDataPoint } from '@/lib/email/stats-service';
import type { ResendLimits } from '@/lib/observability/resend-limits';

interface StatsPageClientProps {
  quotaLimits: ResendLimits;
}

interface EmailStatsResponse {
  global: GlobalStats;
  recent: CampaignStats[];
}

interface CampaignDetailResponse {
  stats: CampaignStats;
  timeline: TimelineDataPoint[];
}

export function StatsPageClient({ quotaLimits }: StatsPageClientProps) {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EmailStatsResponse | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/email-stats');

        if (!res.ok) {
          throw new Error('Failed to fetch email stats');
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchCampaignDetail() {
      if (!selectedCampaign) {
        setCampaignDetail(null);
        return;
      }

      try {
        setDetailLoading(true);
        const res = await fetch(`/api/admin/email-stats/${selectedCampaign}`);

        if (!res.ok) {
          throw new Error('Failed to fetch campaign detail');
        }

        const data = await res.json();
        setCampaignDetail(data);
      } catch (err) {
        logger.error('Error fetching campaign detail:', { err });
        setCampaignDetail(null);
      } finally {
        setDetailLoading(false);
      }
    }

    fetchCampaignDetail();
  }, [selectedCampaign]);

  const getQuotaStatusColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600 dark:text-red-400';
    if (percent >= 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">{t('communications.stats.loading')}</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">
          {error || t('communications.stats.error')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/communications/campaigns"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('communications.stats.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('communications.stats.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Global Stats Cards */}
      <EmailStatsCards stats={stats.global} />

      {/* Quota Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
            {t('communications.stats.quotaUsage')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Quota */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className="text-sm font-medium">{t('communications.stats.dailyQuota')}</span>
              </div>
              <span
                className={`text-sm font-bold ${getQuotaStatusColor(quotaLimits.emailsToday.percent)}`}
              >
                {quotaLimits.emailsToday.used}/{quotaLimits.emailsToday.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-600 dark:bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(quotaLimits.emailsToday.percent, 100)}%`,
                }}
                role="progressbar"
                aria-valuenow={quotaLimits.emailsToday.used}
                aria-valuemin={0}
                aria-valuemax={quotaLimits.emailsToday.limit}
                aria-label={t('dailyQuota', {
                  used: quotaLimits.emailsToday.used,
                  limit: quotaLimits.emailsToday.limit,
                })}
              />
            </div>
          </div>

          {/* Monthly Quota */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {t('communications.stats.monthlyQuota')}
                </span>
              </div>
              <span
                className={`text-sm font-bold ${getQuotaStatusColor(quotaLimits.emailsMonth.percent)}`}
              >
                {quotaLimits.emailsMonth.used}/{quotaLimits.emailsMonth.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-600 dark:bg-green-500 transition-all"
                style={{
                  width: `${Math.min(quotaLimits.emailsMonth.percent, 100)}%`,
                }}
                role="progressbar"
                aria-valuenow={quotaLimits.emailsMonth.used}
                aria-valuemin={0}
                aria-valuemax={quotaLimits.emailsMonth.limit}
                aria-label={t('monthlyQuota', {
                  used: quotaLimits.emailsMonth.used,
                  limit: quotaLimits.emailsMonth.limit,
                })}
              />
            </div>
          </div>

          {quotaLimits.error && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t('communications.stats.quotaApiError')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('communications.stats.recentCampaigns')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('communications.campaigns.name')}</TableHead>
                <TableHead className="text-right">{t('communications.stats.sent')}</TableHead>
                <TableHead className="text-right">{t('communications.stats.opened')}</TableHead>
                <TableHead className="text-right">{t('communications.stats.openRate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <TableEmpty>{t('communications.stats.noCampaigns')}</TableEmpty>
                  </TableCell>
                </TableRow>
              ) : (
                stats.recent.map((campaign) => (
                  <TableRow
                    key={campaign.campaignId}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedCampaign(campaign.campaignId)}
                  >
                    <TableCell className="font-medium">
                      {campaign.campaignName || campaign.campaignId}
                    </TableCell>
                    <TableCell className="text-right">{campaign.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{campaign.opened.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">
                      {campaign.openRate.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Campaign Detail View */}
      {selectedCampaign && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{campaignDetail?.stats.campaignName || selectedCampaign}</CardTitle>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                aria-label={t('common.close')}
              >
                {t('common.close')}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                {t('communications.stats.loadingDetail')}
              </div>
            ) : campaignDetail ? (
              <EmailOpenChart timeline={campaignDetail.timeline} />
            ) : (
              <div className="py-8 text-center text-red-600 dark:text-red-400">
                {t('communications.stats.errorDetail')}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
