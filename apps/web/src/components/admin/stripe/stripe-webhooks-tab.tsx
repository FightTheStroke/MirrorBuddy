'use client';

/**
 * StripeWebhooksTab — Webhook event log with status badges and retry
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
import { csrfFetch } from '@/lib/auth';
import type { StripeWebhookEvent } from '@/lib/admin/stripe-admin-types';

export function StripeWebhooksTab() {
  const t = useTranslations('admin');
  const [events, setEvents] = useState<StripeWebhookEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchEvents = useCallback(async (startingAfter?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '25' });
    if (startingAfter) params.set('starting_after', startingAfter);

    try {
      const res = await fetch(`/api/admin/stripe/webhooks?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (startingAfter) {
          setEvents((prev) => [...prev, ...data.events]);
        } else {
          setEvents(data.events);
        }
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const handleRetry = async (eventId: string) => {
    await csrfFetch(`/api/admin/stripe/webhooks/${eventId}`, { method: 'POST' });
    await fetchEvents();
  };

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString('it-IT');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stripe.webhooks') ?? 'Webhook Events'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('stripe.eventType') ?? 'Type'}</TableHead>
              <TableHead>{t('stripe.status') ?? 'Status'}</TableHead>
              <TableHead>{t('stripe.timestamp') ?? 'Timestamp'}</TableHead>
              <TableHead>{t('stripe.actions') ?? 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <>
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                >
                  <TableCell className="font-mono text-sm">{event.type}</TableCell>
                  <TableCell>
                    <Badge variant={event.pendingWebhooks > 0 ? 'outline' : 'default'}>
                      {event.pendingWebhooks > 0 ? 'Pending' : 'Delivered'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(event.created)}</TableCell>
                  <TableCell>
                    {event.pendingWebhooks > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(event.id);
                        }}
                      >
                        {t('stripe.retry') ?? 'Retry'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expanded === event.id && (
                  <TableRow key={`${event.id}-detail`}>
                    <TableCell colSpan={4}>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            {!loading && events.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t('stripe.noEvents') ?? 'No webhook events found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                const last = events[events.length - 1];
                if (last) fetchEvents(last.id);
              }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
