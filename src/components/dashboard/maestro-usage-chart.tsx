/**
 * Maestro Usage Chart Component
 * Horizontal bar chart showing top 5 most used maestros
 * Shows: name, % sessions, total time
 */

'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StudySession } from '@/lib/stores/progress-store';
import { maestri } from '@/data/maestri';

interface MaestroUsageChartProps {
  sessions: StudySession[];
  className?: string;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export function MaestroUsageChart({ sessions, className }: MaestroUsageChartProps) {
  const maestroStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalMinutes: number; name: string }>();

    sessions.forEach((session) => {
      const maestro = maestri.find((m) => m.id === session.maestroId);
      const name = maestro?.name || session.maestroId;

      if (!stats.has(session.maestroId)) {
        stats.set(session.maestroId, { count: 0, totalMinutes: 0, name });
      }

      const stat = stats.get(session.maestroId)!;
      stat.count += 1;
      stat.totalMinutes += session.durationMinutes || 0;
    });

    const totalSessions = sessions.length;

    const chartData = Array.from(stats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        sessions: data.count,
        percentage: totalSessions > 0 ? Math.round((data.count / totalSessions) * 100) : 0,
        minutes: data.totalMinutes,
        hours: Math.round((data.totalMinutes / 60) * 10) / 10,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    return chartData;
  }, [sessions]);

  const totalSessions = sessions.length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle>Maestri Più Usati</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Top 5 su {totalSessions} sessioni totali
        </p>
      </CardHeader>

      <CardContent>
        {maestroStats.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={maestroStats}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                aria-label="Grafico utilizzo maestri"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (name === 'sessions') return [`${value || 0} sessioni`, 'Sessioni'];
                    return [value || 0, name || ''];
                  }}
                />
                <Bar dataKey="sessions" radius={[0, 8, 8, 0]}>
                  {maestroStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Stats list */}
            <div className="mt-4 space-y-2">
              {maestroStats.map((stat, index) => (
                <div
                  key={stat.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-sm">{stat.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{stat.percentage}% sessioni</span>
                    <span>{stat.hours}h totali</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Accessible table for screen readers */}
            <table className="sr-only" aria-label="Statistiche utilizzo maestri">
              <thead>
                <tr>
                  <th>Maestro</th>
                  <th>Sessioni</th>
                  <th>Percentuale</th>
                  <th>Ore totali</th>
                </tr>
              </thead>
              <tbody>
                {maestroStats.map((stat) => (
                  <tr key={stat.id}>
                    <td>{stat.name}</td>
                    <td>{stat.sessions}</td>
                    <td>{stat.percentage}%</td>
                    <td>{stat.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            Nessuna sessione registrata
          </div>
        )}
      </CardContent>
    </Card>
  );
}
