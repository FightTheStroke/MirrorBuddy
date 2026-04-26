'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { csrfFetch } from '@/lib/auth';

type ReviewStatus = 'approved' | 'rejected' | 'flagged';

interface CommunityContribution {
  id: string;
  title: string;
  type: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface ReviewQueueResponse {
  items?: CommunityContribution[];
}

const REVIEW_ENDPOINT = '/api/admin/community/review';

function formatSubmittedDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString();
}

function contentPreview(content: string): string {
  if (content.length <= 120) {
    return content;
  }
  return `${content.slice(0, 117)}...`;
}

export default function CommunityReviewPage() {
  const t = useTranslations('community.reviewQueue');
  const [items, setItems] = useState<CommunityContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch(REVIEW_ENDPOINT);
      if (!response.ok) {
        throw new Error('Failed to load review queue');
      }
      const data = (await response.json()) as ReviewQueueResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const submitReview = useCallback(
    async (id: string, status: ReviewStatus) => {
      setUpdatingId(id);
      try {
        const response = await csrfFetch(REVIEW_ENDPOINT, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        });
        if (!response.ok) {
          throw new Error('Failed to update contribution');
        }
        await loadQueue();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        setUpdatingId(null);
      }
    },
    [loadQueue],
  );

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('moderateDescription')}</p>
      </div>

      {loading && <div className="text-sm text-muted-foreground">{t('loadingPending')}</div>}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !hasItems && (
        <div className="rounded border p-6 text-center text-sm text-muted-foreground">
          {t('noPending')}
        </div>
      )}

      {!loading && hasItems && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">{t('title')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('type')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('author')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('submitted')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('preview')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">{item.type}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.userId}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatSubmittedDate(item.createdAt)}
                  </td>
                  <td className="max-w-[360px] px-3 py-2 text-muted-foreground">
                    {contentPreview(item.content)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        onClick={() => void submitReview(item.id, 'approved')}
                        disabled={updatingId === item.id}
                      >
                        {t('approve')}
                      </button>
                      <button
                        type="button"
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        onClick={() => void submitReview(item.id, 'rejected')}
                        disabled={updatingId === item.id}
                      >
                        {t('reject')}
                      </button>
                      <button
                        type="button"
                        className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                        onClick={() => void submitReview(item.id, 'flagged')}
                        disabled={updatingId === item.id}
                      >
                        {t('flag')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
