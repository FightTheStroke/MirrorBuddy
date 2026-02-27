'use client';

import { useEffect, useState } from 'react';

type CommunityContribution = {
  id: string;
  title: string;
  content: string;
  type: string;
  voteCount: number;
  createdAt: string;
};

type CommunityListResponse = {
  items?: CommunityContribution[];
};

interface ApprovedContributionsListProps {
  endpoint: string;
  title: string;
  loadingLabel: string;
  emptyLabel: string;
}

export function ApprovedContributionsList({
  endpoint,
  title,
  loadingLabel,
  emptyLabel,
}: ApprovedContributionsListProps) {
  const [items, setItems] = useState<CommunityContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContributions() {
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load approved contributions');
        }

        const data = (await response.json()) as CommunityListResponse;
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load approved contributions');
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
  }, [endpoint]);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>

      {loading && <p className="text-sm text-muted-foreground">{loadingLabel}</p>}

      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded border p-4 text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold">{item.title}</h3>
                <span className="text-xs uppercase text-muted-foreground">{item.type}</span>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{item.content}</p>
              <div className="text-xs text-muted-foreground">
                👍 {item.voteCount} • {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
