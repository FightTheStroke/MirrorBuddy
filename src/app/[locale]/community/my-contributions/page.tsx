'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type ContributionStatus = 'pending' | 'approved' | 'rejected';

interface MyContribution {
  id: string;
  title: string;
  type: string;
  status: ContributionStatus;
  voteCount: number;
  createdAt: string;
  moderationNote?: string;
}

interface ContributionsResponse {
  items?: unknown;
}

const STATUS_STYLES: Record<ContributionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

function isContributionStatus(value: unknown): value is ContributionStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}

function normalizeContribution(value: unknown): MyContribution | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const contribution = value as Record<string, unknown>;
  if (
    typeof contribution.id !== 'string' ||
    typeof contribution.title !== 'string' ||
    typeof contribution.type !== 'string' ||
    !isContributionStatus(contribution.status) ||
    typeof contribution.voteCount !== 'number' ||
    typeof contribution.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: contribution.id,
    title: contribution.title,
    type: contribution.type,
    status: contribution.status,
    voteCount: contribution.voteCount,
    createdAt: contribution.createdAt,
    moderationNote:
      typeof contribution.moderationNote === 'string' ? contribution.moderationNote : undefined,
  };
}

function formatSubmittedDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString();
}

export default function MyContributionsPage() {
  const t = useTranslations('community.myContributions');
  const [items, setItems] = useState<MyContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContributions() {
      try {
        const response = await fetch('/api/community/my-contributions', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load my contributions');
        }

        const data = (await response.json()) as ContributionsResponse;
        const normalizedItems = Array.isArray(data.items)
          ? data.items
              .map(normalizeContribution)
              .filter((item): item is MyContribution => item !== null)
          : [];

        if (!cancelled) {
          setItems(normalizedItems);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadContributions();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      </header>

      {!loading && !hasItems && (
        <p className="rounded border p-4 text-sm text-muted-foreground">{t('noContributions')}</p>
      )}

      {!loading && hasItems && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">{item.title}</h2>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                >
                  {item.status === 'pending'
                    ? t('statusPending')
                    : item.status === 'approved'
                      ? t('statusApproved')
                      : t('statusRejected')}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{`👍 ${item.voteCount}`}</span>
                <span>
                  {t('submittedOn')}: {formatSubmittedDate(item.createdAt)}
                </span>
              </div>

              {item.status === 'rejected' && item.moderationNote && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-sm font-medium underline-offset-2 hover:underline"
                    onClick={() =>
                      setExpandedId((current) => (current === item.id ? null : item.id))
                    }
                  >
                    {t('viewDetails')}
                  </button>

                  {expandedId === item.id && (
                    <p className="mt-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {t('rejectionReason')}: {item.moderationNote}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
