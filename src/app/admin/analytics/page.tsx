'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Coins,
  Mic,
  Brain,
  ShieldAlert,
  Timer,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { StatCard } from './components/stat-card';
import { DailyChart } from './components/daily-chart';
import type {
  TokenUsageData,
  VoiceMetricsData,
  FsrsStatsData,
  RateLimitsData,
  SafetyEventsData,
} from './types';


type DashboardData = {
  tokenUsage: TokenUsageData | null;
  voiceMetrics: VoiceMetricsData | null;
  fsrsStats: FsrsStatsData | null;
  rateLimits: RateLimitsData | null;
  safetyEvents: SafetyEventsData | null;
};


export default function AdminAnalyticsPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    tokenUsage: null,
    voiceMetrics: null,
    fsrsStats: null,
    rateLimits: null,
    safetyEvents: null,
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [tokenRes, voiceRes, fsrsRes, rateRes, safetyRes] = await Promise.all([
        fetch('/api/dashboard/token-usage?days=7'),
        fetch('/api/dashboard/voice-metrics?days=7'),
        fetch('/api/dashboard/fsrs-stats?days=7'),
        fetch('/api/dashboard/rate-limits?days=7'),
        fetch('/api/dashboard/safety-events?days=7'),
      ]);

      const [tokenData, voiceData, fsrsData, rateData, safetyData] = await Promise.all([
        tokenRes.ok ? tokenRes.json() : null,
        voiceRes.ok ? voiceRes.json() : null,
        fsrsRes.ok ? fsrsRes.json() : null,
        rateRes.ok ? rateRes.json() : null,
        safetyRes.ok ? safetyRes.json() : null,
      ]);

      setData({
        tokenUsage: tokenData,
        voiceMetrics: voiceData,
        fsrsStats: fsrsData,
        rateLimits: rateData,
        safetyEvents: safetyData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              System Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last 7 days</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total AI Tokens"
            value={formatNumber(data.tokenUsage?.summary.totalTokens ?? 0)}
            subValue={`$${data.tokenUsage?.summary.estimatedCostUsd.toFixed(2) ?? '0.00'} estimated`}
            icon={Coins}
            color="indigo"
          />
          <StatCard
            title="Voice Sessions"
            value={data.voiceMetrics?.voice.totalSessions ?? 0}
            subValue={`${data.voiceMetrics?.voice.totalMinutes.toFixed(1) ?? '0'} min total`}
            icon={Mic}
            color="green"
          />
          <StatCard
            title="Flashcard Reviews"
            value={data.fsrsStats?.summary.totalReviews ?? 0}
            subValue={`${data.fsrsStats?.summary.accuracy ?? 0}% accuracy`}
            icon={Brain}
            color="blue"
          />
          <StatCard
            title="Rate Limit Events"
            value={data.rateLimits?.summary.totalEvents ?? 0}
            subValue={`${data.rateLimits?.summary.uniqueIps ?? 0} unique IPs`}
            icon={Timer}
            color="amber"
          />
        </div>

        {/* Safety Events Alert */}
        {(data.safetyEvents?.summary.unresolvedCount ?? 0) > 0 && (
          <Card className="mb-8 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-800/50">
                  <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100">
                    {data.safetyEvents?.summary.unresolvedCount} Unresolved Safety Events
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {data.safetyEvents?.summary.criticalCount ?? 0} critical events require attention
                  </p>
                </div>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-indigo-500" />
                Token Usage
              </CardTitle>
              <CardDescription>AI API token consumption breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.tokenUsage?.byAction && Object.entries(data.tokenUsage.byAction).map(([action, stats]) => (
                <div key={action} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{action}</p>
                    <p className="text-xs text-slate-500">{stats.count} calls</p>
                  </div>
                  <p className="font-mono text-sm">{formatNumber(stats.totalTokens)} tokens</p>
                </div>
              ))}
              {data.tokenUsage?.dailyUsage && (
                <DailyChart data={data.tokenUsage.dailyUsage} label="Daily Token Usage" />
              )}
            </CardContent>
          </Card>

          {/* Voice Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-green-500" />
                Voice Metrics
              </CardTitle>
              <CardDescription>Voice and TTS usage statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Voice Sessions</p>
                  <p className="text-xl font-bold">{data.voiceMetrics?.voice.totalSessions ?? 0}</p>
                  <p className="text-xs text-slate-400">{data.voiceMetrics?.voice.avgSessionMinutes.toFixed(1) ?? '0'} min avg</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">TTS Generations</p>
                  <p className="text-xl font-bold">{data.voiceMetrics?.tts.totalGenerations ?? 0}</p>
                  <p className="text-xs text-slate-400">{formatNumber(data.voiceMetrics?.tts.totalCharacters ?? 0)} chars</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Realtime Sessions</p>
                  <p className="text-xl font-bold">{data.voiceMetrics?.realtime.totalSessions ?? 0}</p>
                  <p className="text-xs text-slate-400">{data.voiceMetrics?.realtime.totalMinutes.toFixed(1) ?? '0'} min</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Total Voice Minutes</p>
                  <p className="text-xl font-bold">{data.voiceMetrics?.voice.totalMinutes.toFixed(0) ?? 0}</p>
                </div>
              </div>
              {data.voiceMetrics?.dailySessions && (
                <DailyChart data={data.voiceMetrics.dailySessions} label="Daily Sessions" color="green" />
              )}
            </CardContent>
          </Card>

          {/* FSRS Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Flashcard (FSRS) Stats
              </CardTitle>
              <CardDescription>Spaced repetition learning metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{data.fsrsStats?.summary.totalCards ?? 0}</p>
                  <p className="text-xs text-slate-500">Total Cards</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{data.fsrsStats?.summary.accuracy ?? 0}%</p>
                  <p className="text-xs text-slate-500">Accuracy</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{data.fsrsStats?.summary.cardsDueToday ?? 0}</p>
                  <p className="text-xs text-slate-500">Due Today</p>
                </div>
              </div>
              {data.fsrsStats?.stateDistribution && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Card States</p>
                  {Object.entries(data.fsrsStats.stateDistribution).map(([state, count]) => (
                    <div key={state} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-600 dark:text-slate-400">{state}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Safety Events
              </CardTitle>
              <CardDescription>Content moderation and safety monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold">{data.safetyEvents?.summary.totalEvents ?? 0}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{data.safetyEvents?.summary.unresolvedCount ?? 0}</p>
                  <p className="text-xs text-slate-500">Unresolved</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{data.safetyEvents?.summary.criticalCount ?? 0}</p>
                  <p className="text-xs text-slate-500">Critical</p>
                </div>
              </div>
              {data.safetyEvents?.bySeverity && Object.keys(data.safetyEvents.bySeverity).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">By Severity</p>
                  {Object.entries(data.safetyEvents.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between text-sm">
                      <span className={`capitalize ${
                        severity === 'critical' ? 'text-red-600' :
                        severity === 'alert' ? 'text-amber-600' :
                        severity === 'warning' ? 'text-yellow-600' :
                        'text-slate-600'
                      }`}>{severity}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.safetyEvents?.recentEvents && data.safetyEvents.recentEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Recent Events</p>
                  {data.safetyEvents.recentEvents.slice(0, 5).map(event => (
                    <div key={event.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{event.type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        event.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {event.resolved ? 'Resolved' : 'Open'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
