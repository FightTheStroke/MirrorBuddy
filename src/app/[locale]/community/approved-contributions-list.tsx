'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch, isAuthenticated } from '@/lib/auth';

type CommunityContribution = {
  id: string;
  title: string;
  content: string;
  type: string;
  voteCount: number;
  createdAt: string;
  hasVoted?: boolean;
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
  const tVotes = useTranslations('community.votes');
  const [items, setItems] = useState<CommunityContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<string | null>(null);
  const [pendingVotes, setPendingVotes] = useState<Record<string, boolean>>({});
  const voteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
          setItems(
            Array.isArray(data.items)
              ? data.items.map((item) => ({ ...item, hasVoted: Boolean(item.hasVoted) }))
              : [],
          );
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

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(voteTimeoutsRef.current)) {
        clearTimeout(timeoutId);
      }
      voteTimeoutsRef.current = {};
    };
  }, []);

  const handleVote = (contributionId: string) => {
    if (!isAuthenticated()) {
      setVoteFeedback(tVotes('loginToVote'));
      return;
    }

    if (pendingVotes[contributionId]) {
      return;
    }

    setVoteFeedback(null);

    const currentItem = items.find((item) => item.id === contributionId);
    if (!currentItem) {
      return;
    }

    const previousItem = { ...currentItem };
    setItems((previousItems) =>
      previousItems.map((item) => {
        if (item.id !== contributionId) {
          return item;
        }

        const nextHasVoted = !Boolean(item.hasVoted);
        return {
          ...item,
          hasVoted: nextHasVoted,
          voteCount: Math.max(0, item.voteCount + (nextHasVoted ? 1 : -1)),
        };
      }),
    );

    setPendingVotes((previous) => ({ ...previous, [contributionId]: true }));

    voteTimeoutsRef.current[contributionId] = setTimeout(async () => {
      try {
        const response = await csrfFetch('/api/community/vote', {
          method: 'POST',
          body: JSON.stringify({ contributionId }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            setVoteFeedback(tVotes('loginToVote'));
          } else {
            setVoteFeedback(tVotes('voteError'));
          }
          throw new Error(`Vote request failed with status ${response.status}`);
        }

        const body = (await response.json()) as { voted?: boolean; newVoteCount?: number };
        if (typeof body.voted !== 'boolean' || typeof body.newVoteCount !== 'number') {
          throw new Error('Invalid vote response body');
        }

        setItems((previousItems) =>
          previousItems.map((item) =>
            item.id === contributionId
              ? {
                  ...item,
                  hasVoted: body.voted,
                  voteCount: body.newVoteCount,
                }
              : item,
          ),
        );
      } catch {
        setVoteFeedback((current) => current ?? tVotes('voteError'));
        setItems((previousItems) =>
          previousItems.map((item) =>
            item.id === contributionId && previousItem ? previousItem : item,
          ),
        );
      } finally {
        setPendingVotes((previous) => {
          const next = { ...previous };
          delete next[contributionId];
          return next;
        });
        delete voteTimeoutsRef.current[contributionId];
      }
    }, 300);
  };

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

      {voteFeedback && (
        <div
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {voteFeedback}
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
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => handleVote(item.id)}
                  disabled={Boolean(pendingVotes[item.id])}
                  aria-label={item.hasVoted ? tVotes('removeVote') : tVotes('voteButton')}
                  title={`${item.hasVoted ? tVotes('removeVote') : tVotes('voteButton')} · ${tVotes('voteCount', { count: item.voteCount })}`}
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">👍</span>
                  <span>{tVotes('voteCount', { count: item.voteCount })}</span>
                </button>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
