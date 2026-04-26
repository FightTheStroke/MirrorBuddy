'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type MaintenanceWindow = {
  id: string;
  message: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  cancelled: boolean;
};

type MaintenanceResponse = {
  success: boolean;
  data: MaintenanceWindow[];
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function MaintenanceWidget() {
  const t = useTranslations('maintenance');
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingWindowId, setUpdatingWindowId] = useState<string | null>(null);

  const loadWindows = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/admin/maintenance');
      if (!response.ok) {
        throw new Error('Failed to load maintenance windows');
      }
      const body = (await response.json()) as MaintenanceResponse;
      setWindows((body.data ?? []).filter((windowItem) => !windowItem.cancelled));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load maintenance windows',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWindows();
  }, [loadWindows]);

  const { activeWindows, upcomingWindows } = useMemo(() => {
    const active: MaintenanceWindow[] = [];
    const upcoming: MaintenanceWindow[] = [];

    for (const windowItem of windows) {
      if (windowItem.isActive) {
        active.push(windowItem);
      } else {
        upcoming.push(windowItem);
      }
    }

    return { activeWindows: active, upcomingWindows: upcoming };
  }, [windows]);

  const cancelWindow = useCallback(
    async (id: string) => {
      setError(null);
      setUpdatingWindowId(id);
      try {
        const response = await csrfFetch(`/api/admin/maintenance/${id}`, {
          method: 'DELETE',
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to cancel maintenance window');
        }
        await loadWindows();
      } catch (cancelError) {
        setError(
          cancelError instanceof Error
            ? cancelError.message
            : 'Unable to cancel maintenance window',
        );
      } finally {
        setUpdatingWindowId(null);
      }
    },
    [loadWindows],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.scheduledWindows')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? <p className="text-sm text-muted-foreground">...</p> : null}
        {error ? (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!loading && activeWindows.length === 0 && upcomingWindows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.noWindows')}</p>
        ) : null}

        {activeWindows.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-red-700">{t('admin.active')}</h3>
            {activeWindows.map((windowItem) => (
              <div
                key={windowItem.id}
                className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-2"
              >
                <p className="font-medium">{windowItem.message}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(windowItem.startTime)} - {formatTime(windowItem.endTime)}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelWindow(windowItem.id)}
                  disabled={updatingWindowId === windowItem.id}
                >
                  {t('admin.cancel')}
                </Button>
              </div>
            ))}
          </section>
        ) : null}

        {upcomingWindows.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t('admin.schedule')}</h3>
            {upcomingWindows.map((windowItem) => (
              <div key={windowItem.id} className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{windowItem.message}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(windowItem.startTime)} - {formatTime(windowItem.endTime)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cancelWindow(windowItem.id)}
                  disabled={updatingWindowId === windowItem.id}
                >
                  {t('admin.cancel')}
                </Button>
              </div>
            ))}
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
