'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

type ABBucket = {
  label: string;
  sampleSize: number;
  avgTutorBenchScore: number;
};

type ABExperimentResult = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  buckets: ABBucket[];
};

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}

export default function ABTestingDashboardPage() {
  const t = useTranslations('admin');
  const [abResults, setAbResults] = useState<ABExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/research/ab-results');
        if (!response.ok) {
          throw new Error('Failed to load A/B results');
        }
        const data = (await response.json()) as ABExperimentResult[];
        setAbResults(data);
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
    return <div className="p-6 text-sm text-muted-foreground">{t('abTesting.loading')}</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('abTesting.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('abTesting.description')}</p>
        </div>
        <Link
          href="/admin/research/ab-testing/manage"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('abTesting.manageTitle')}
        </Link>
      </div>

      <section className="space-y-4">
        {abResults.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {t('abTesting.noExperiments')}
          </div>
        ) : (
          abResults.map((experiment) => (
            <article
              key={experiment.id}
              className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{experiment.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t('abTesting.experimentId', { id: experiment.id })}
                  </p>
                </div>
                {statusBadge(experiment.status)}
              </div>

              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium">{t('abTesting.bucket')}</th>
                      <th className="px-3 py-2 text-center font-medium">
                        {t('abTesting.sampleSize')}
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        {t('abTesting.avgTutorBench')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {experiment.buckets.map((bucket) => (
                      <tr
                        key={`${experiment.id}-${bucket.label}`}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-2">{bucket.label}</td>
                        <td className="px-3 py-2 text-center">{bucket.sampleSize}</td>
                        <td className="px-3 py-2 text-center">
                          {bucket.avgTutorBenchScore.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="h-56"
                aria-label={t('abTesting.chartAriaLabel', { name: experiment.name })}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={experiment.buckets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avgTutorBenchScore" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
