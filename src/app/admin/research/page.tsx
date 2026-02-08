'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';
import BenchmarkHeatmap from './benchmark-heatmap';

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  maestroId: string;
  status: string;
  scores: {
    scaffolding: number | null;
    hinting: number | null;
    adaptation: number | null;
    misconceptionHandling: number | null;
  };
  turnsCompleted: number;
  createdAt: string;
  completedAt: string | null;
}

interface ExperimentList {
  items: Experiment[];
  total: number;
}

export default function ResearchLabPage() {
  const t = useTranslations('admin');
  const [data, setData] = useState<ExperimentList | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/research/experiments');
      if (!res.ok) throw new Error('Failed to fetch experiments');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiments();
    const interval = setInterval(fetchExperiments, 30000);
    return () => clearInterval(interval);
  }, [fetchExperiments]);

  const handleRunExperiment = async (id: string) => {
    setRunning(id);
    try {
      await csrfFetch(`/api/admin/research/experiments/${id}/run`, {
        method: 'POST',
      });
      await fetchExperiments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(null);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.draft}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-muted-foreground">{t('research.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('research.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('research.description')}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Benchmark Heatmap */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('research.benchmarkScores')}</h2>
        <BenchmarkHeatmap experiments={data?.items ?? []} />
      </section>

      {/* Experiments Table */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {t('research.experiments', { count: data?.total ?? 0 })}
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">{t('research.name')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('research.maestro')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('research.hypothesis')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('research.status')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('research.turns')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('research.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {t('research.noExperiments')}
                  </td>
                </tr>
              ) : (
                data?.items.map((exp) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{exp.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{exp.maestroId}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                      {exp.hypothesis}
                    </td>
                    <td className="px-3 py-2 text-center">{statusBadge(exp.status)}</td>
                    <td className="px-3 py-2 text-center">{exp.turnsCompleted}</td>
                    <td className="px-3 py-2 text-center">
                      {exp.status === 'draft' && (
                        <button
                          onClick={() => handleRunExperiment(exp.id)}
                          disabled={running === exp.id}
                          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {running === exp.id ? t('research.running') : t('research.run')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
