/**
 * Analytics Charts Components
 * Reusable chart components for the analytics dashboard
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Stat Card Component
export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color?: string; // Deprecated, kept for backwards compatibility
}

export function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Study Session interface
interface StudySession {
  startedAt: Date | string;
  durationMinutes?: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'season';

// Study Trend Chart
export function StudyTrendChart({ sessionHistory, period }: { sessionHistory: StudySession[]; period: TimePeriod }) {
  const data = useMemo(() => {
    const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const result: { date: string; minutes: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayMinutes = sessionHistory
        .filter((s) => new Date(s.startedAt).toISOString().split('T')[0] === dateStr)
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      result.push({ date: dateStr, minutes: dayMinutes });
    }
    return result;
  }, [sessionHistory, period]);

  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);

  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            className="w-full bg-blue-500 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${(d.minutes / maxMinutes) * 100}%` }}
            transition={{ duration: 0.3, delay: i * 0.02 }}
            style={{ minHeight: d.minutes > 0 ? '4px' : '0px' }}
            title={`${d.date}: ${d.minutes}m`}
          />
        </div>
      ))}
    </div>
  );
}

// Cost Trend Chart
export function CostTrendChart({ dailyCosts }: { dailyCosts: Array<{ date: string; cost: number }> }) {
  const maxCost = Math.max(...dailyCosts.map((d) => d.cost), 0.01);

  return (
    <div className="h-32 flex items-end gap-1">
      {dailyCosts.slice(-14).map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            className="w-full bg-amber-500 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${(d.cost / maxCost) * 100}%` }}
            transition={{ duration: 0.3, delay: i * 0.02 }}
            style={{ minHeight: d.cost > 0 ? '4px' : '0px' }}
            title={`${d.date}: $${d.cost.toFixed(2)}`}
          />
        </div>
      ))}
    </div>
  );
}

// Token Usage Bar
export function TokenUsageBar({ action, data, maxTokens }: { action: string; data: { totalTokens: number }; maxTokens: number }) {
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{data.totalTokens.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-green-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(data.totalTokens / maxTokens) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
