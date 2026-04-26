'use client';

/**
 * StripeSubscriptionsTab — Subscriptions table with filters and pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StripeSubscription } from '@/lib/admin/stripe-admin-types';
import { StripeSubscriptionActions } from './stripe-subscription-actions';

const STATUS_OPTIONS = ['all', 'active', 'canceled', 'past_due', 'trialing', 'incomplete'];

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  trialing: 'default',
  canceled: 'secondary',
  past_due: 'outline',
  incomplete: 'secondary',
};

export function StripeSubscriptionsTab() {
  const t = useTranslations('admin');
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(
    async (startingAfter?: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (emailSearch) params.set('email', emailSearch);
      if (startingAfter) params.set('starting_after', startingAfter);
      params.set('limit', '25');

      try {
        const res = await fetch(`/api/admin/stripe/subscriptions?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (startingAfter) {
            setSubscriptions((prev) => [...prev, ...data.subscriptions]);
          } else {
            setSubscriptions(data.subscriptions);
          }
          setHasMore(data.hasMore);
        }
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, emailSearch],
  );

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  const loadMore = () => {
    const last = subscriptions[subscriptions.length - 1];
    if (last) fetchSubscriptions(last.id);
  };

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('it-IT');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stripe.subscriptions') ?? 'Subscriptions'}</CardTitle>
        <div className="flex gap-4 mt-4">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('stripe.filterByStatus') ?? 'Filter by status'}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="email"
            placeholder={t('stripe.searchEmail') ?? 'Search by email...'}
            className="rounded-md border px-3 py-2 text-sm flex-1"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            aria-label={t('stripe.searchEmail') ?? 'Search by email'}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('stripe.email') ?? 'Email'}</TableHead>
              <TableHead>{t('stripe.status') ?? 'Status'}</TableHead>
              <TableHead>{t('stripe.period') ?? 'Period'}</TableHead>
              <TableHead>{t('stripe.actions') ?? 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>{sub.customerEmail ?? sub.customerId}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[sub.status] ?? 'secondary'}>{sub.status}</Badge>
                </TableCell>
                <TableCell>
                  {formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}
                </TableCell>
                <TableCell>
                  <StripeSubscriptionActions subscription={sub} onUpdated={fetchSubscriptions} />
                </TableCell>
              </TableRow>
            ))}
            {!loading && subscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t('stripe.noSubscriptions') ?? 'No subscriptions found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
