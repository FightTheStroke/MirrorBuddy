'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { AlertTriangle, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { csrfFetch } from '@/lib/auth';
import clientLogger from '@/lib/logger';

interface CrisisEvent {
  id: string;
  severity: string;
  severityLabel: string;
  severityColor: string;
  timestamp: string;
  description: string;
  genericReason?: string;
  viewed: boolean;
  viewedAt: string | null;
  helplineNumbers: Array<{
    name: string;
    number: string;
    description: string;
  }>;
  recommendedActions: string[];
}

interface CrisisAlertSectionProps {
  userId: string;
}

export function CrisisAlertSection({ userId }: CrisisAlertSectionProps) {
  const t = useTranslations('settings.parentDashboard');
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const response = await fetch('/api/parent-dashboard/safety-events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events);
      setUnreadCount(data.unreadCount);
      setError(false);
    } catch (err) {
      clientLogger.error('Error fetching safety events', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function markAsViewed(eventId: string) {
    try {
      const response = await csrfFetch('/api/parent-dashboard/safety-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!response.ok) throw new Error('Failed to mark as viewed');
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, viewed: true, viewedAt: new Date().toISOString() } : e,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      clientLogger.error('Error marking event as viewed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function toggleEvent(eventId: string) {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      const event = events.find((e) => e.id === eventId);
      if (event && !event.viewed) {
        markAsViewed(eventId);
      }
    }
  }

  if (!loading && events.length === 0 && !error) {
    return null;
  }

  return (
    <Card
      className={cn(
        'border-2',
        unreadCount > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-gray-200',
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={cn('h-6 w-6', unreadCount > 0 ? 'text-red-600' : 'text-gray-500')}
            />
            <div>
              <CardTitle className="text-xl font-bold">{t('crisisAlertTitle')}</CardTitle>
              {unreadCount > 0 && (
                <p className="text-sm text-red-600 font-medium mt-1">{t('crisisAlertUrgent')}</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-600 text-white">
              {unreadCount === 1
                ? t('crisisAlertUnreadCount', { count: unreadCount })
                : t('crisisAlertUnreadCountPlural', { count: unreadCount })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-gray-600 dark:text-gray-400">{t('loading')}</p>}

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{t('crisisAlertLoadingError')}</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('crisisAlertNoEvents')}</p>
        )}

        {!loading &&
          !error &&
          events.map((event) => {
            const isExpanded = expandedEventId === event.id;
            const isUnread = !event.viewed;

            return (
              <div
                key={event.id}
                className={cn(
                  'border rounded-lg p-4 transition-colors',
                  isUnread
                    ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                    : 'border-gray-200 bg-white dark:bg-slate-800',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex px-2 py-1 text-xs font-semibold rounded',
                          event.severityColor === 'red' && 'bg-red-100 text-red-800',
                          event.severityColor === 'orange' && 'bg-orange-100 text-orange-800',
                          event.severityColor === 'yellow' && 'bg-yellow-100 text-yellow-800',
                        )}
                      >
                        {event.severityLabel}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEvent(event.id)}
                    aria-label={
                      isExpanded ? t('crisisAlertMarkViewed') : t('crisisAlertViewDetails')
                    }
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t('crisisAlertHelplineTitle')}
                      </h4>
                      <div className="space-y-2">
                        {event.helplineNumbers.map((helpline, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg"
                          >
                            <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {helpline.name}
                              </p>
                              <p className="text-lg font-bold text-blue-600">{helpline.number}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {helpline.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        {t('crisisAlertRecommendedActionsTitle')}
                      </h4>
                      <ul className="space-y-2">
                        {event.recommendedActions.map((action, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
