'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';

type BucketConfig = {
  id: string;
  bucketLabel: string;
  percentage: number;
  modelProvider: string;
  modelName: string;
};

type ABExperiment = {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  startDate: string;
  endDate: string | null;
  bucketConfigs: BucketConfig[];
};

type CreateFormState = {
  name: string;
  startDate: string;
};

const INITIAL_FORM: CreateFormState = { name: '', startDate: '' };

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function ABTestingManagePage() {
  const t = useTranslations('admin');
  const [experiments, setExperiments] = useState<ABExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadExperiments = async () => {
    try {
      const res = await fetch('/api/admin/research/ab-experiments');
      if (!res.ok) throw new Error('Failed to load experiments');
      const data = (await res.json()) as ABExperiment[];
      setExperiments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExperiments();
  }, []);

  const handleTransition = async (id: string, status: 'active' | 'completed') => {
    try {
      const res = await csrfFetch(`/api/admin/research/ab-experiments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? t('abTesting.invalidTransition'));
        return;
      }
      const updated = (await res.json()) as ABExperiment;
      setExperiments((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setActionFeedback(
        status === 'active' ? t('abTesting.activateSuccess') : t('abTesting.completeSuccess'),
      );
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setError(t('abTesting.invalidTransition'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await csrfFetch(`/api/admin/research/ab-experiments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to delete');
        return;
      }
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      setDeleteTarget(null);
      setActionFeedback(t('abTesting.deleteSuccess'));
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setError('Failed to delete experiment');
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.startDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await csrfFetch('/api/admin/research/ab-experiments', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          startDate: form.startDate,
          buckets: [
            {
              bucketLabel: 'control',
              percentage: 50,
              modelProvider: 'azure',
              modelName: 'gpt-4o',
              extraConfig: {},
            },
            {
              bucketLabel: 'variant',
              percentage: 50,
              modelProvider: 'azure',
              modelName: 'gpt-4o-mini',
              extraConfig: {},
            },
          ],
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to create');
        return;
      }
      const created = (await res.json()) as ABExperiment;
      setExperiments((prev) => [created, ...prev]);
      setForm(INITIAL_FORM);
      setShowForm(false);
    } catch {
      setError('Failed to create experiment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('abTesting.manageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('abTesting.manageDescription')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('abTesting.createExperiment')}
        </button>
      </div>

      {actionFeedback && (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {actionFeedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">{t('abTesting.createExperiment')}</h2>
          <label className="block space-y-1 text-sm">
            <span>{t('abTesting.experimentName')}</span>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded border px-3 py-2"
              disabled={submitting}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('abTesting.startDate')}</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full rounded border px-3 py-2"
              disabled={submitting}
              required
            />
          </label>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={submitting}
          >
            {t('abTesting.saveChanges')}
          </button>
        </form>
      )}

      {loading && <div className="p-4 text-sm text-muted-foreground">{t('abTesting.loading')}</div>}

      {!loading && experiments.length === 0 && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {t('abTesting.noExperiments')}
        </div>
      )}

      <div className="space-y-3">
        {experiments.map((exp) => (
          <article key={exp.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{exp.name}</h2>
                <p className="text-xs text-muted-foreground">{exp.startDate.slice(0, 10)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[exp.status] ?? STATUS_BADGE.draft}`}
              >
                {t(
                  `abTesting.status${exp.status.charAt(0).toUpperCase()}${exp.status.slice(1)}` as 'abTesting.statusDraft',
                )}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {exp.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => void handleTransition(exp.id, 'active')}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  {t('abTesting.activate')}
                </button>
              )}
              {exp.status === 'active' && (
                <button
                  type="button"
                  onClick={() => void handleTransition(exp.id, 'completed')}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  {t('abTesting.complete')}
                </button>
              )}
              {exp.status !== 'active' && (
                <>
                  {deleteTarget === exp.id ? (
                    <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">
                      <span>{t('abTesting.confirmDelete')}</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(exp.id)}
                        className="font-medium underline"
                        aria-label={t('abTesting.deleteExperiment')}
                      >
                        {t('abTesting.deleteExperiment')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        className="font-medium"
                      >
                        {t('abTesting.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(exp.id)}
                      className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      aria-label={t('abTesting.deleteExperiment')}
                    >
                      {t('abTesting.deleteExperiment')}
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
