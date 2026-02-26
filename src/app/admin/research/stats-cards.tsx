'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

type MaestroStats = {
  rank: number;
  maestroId: string;
  experimentCount: number;
  scaffolding: number;
  hinting: number;
  adaptation: number;
  misconceptionHandling: number;
  overall: number;
};

function badgeColor(score: number): string {
  if (score >= 80)
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  if (score >= 40) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
}

export function ResearchStatsCards() {
  const t = useTranslations('research');
  const [stats, setStats] = useState<MaestroStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/research/stats');
        if (!response.ok) {
          throw new Error('Failed to load research stats');
        }
        const data = (await response.json()) as MaestroStats[];
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-lg border p-4 text-sm text-muted-foreground"
        aria-label={t('stats.sectionAriaLabel')}
      >
        {t('stats.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        aria-label={t('stats.sectionAriaLabel')}
      >
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label={t('stats.sectionAriaLabel')}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {stats.map((item) => {
          const chartData = [
            { name: t('stats.dimensions.scaffolding'), value: item.scaffolding },
            { name: t('stats.dimensions.hinting'), value: item.hinting },
            { name: t('stats.dimensions.adaptation'), value: item.adaptation },
            {
              name: t('stats.dimensions.misconceptionHandling'),
              value: item.misconceptionHandling,
            },
          ];

          return (
            <article
              key={item.maestroId}
              className="rounded-lg border bg-card p-4 shadow-sm"
              aria-label={t('stats.cardAriaLabel', { maestroId: item.maestroId })}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('stats.rankLabel', { rank: item.rank })}
                  </p>
                  <h3 className="text-lg font-semibold">{item.maestroId}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('stats.completedExperiments', { count: item.experimentCount })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeColor(item.overall)}`}
                >
                  {t('stats.avg')} {item.overall.toFixed(1)}
                </span>
              </div>

              <div
                className="h-44"
                aria-label={t('stats.dimensionsAriaLabel', { maestroId: item.maestroId })}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
