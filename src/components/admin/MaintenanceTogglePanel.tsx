'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export function MaintenanceTogglePanel() {
  const t = useTranslations('maintenance');
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWindows = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/admin/maintenance');
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance status');
      }
      const body = (await response.json()) as MaintenanceResponse;
      setWindows(Array.isArray(body.data) ? body.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWindows();
  }, [loadWindows]);

  const activeWindow = useMemo(
    () => windows.find((windowItem) => windowItem.isActive && !windowItem.cancelled) ?? null,
    [windows],
  );
  const isActive = Boolean(activeWindow);

  const confirmText = isActive ? t('admin.confirmDeactivate') : t('admin.confirmActivate');

  const toggleLabel = isActive ? t('admin.deactivate') : t('admin.activate');

  const handleConfirmToggle = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = isActive
        ? { activate: false, windowId: activeWindow?.id }
        : {
            activate: true,
            message: 'System maintenance started by admin',
            severity: 'medium',
            estimatedMinutes: 60,
          };
      const response = await csrfFetch('/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to toggle maintenance');
      }

      setIsOpen(false);
      await loadWindows();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to toggle maintenance');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeWindow?.id, isActive, loadWindows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('admin.currentStatus')}</p>
            <p className={isActive ? 'text-red-600 font-semibold' : 'font-semibold'}>
              {isLoading ? '...' : isActive ? t('admin.active') : t('admin.inactive')}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={isLoading || isSubmitting}
            variant={isActive ? 'destructive' : 'default'}
          >
            {toggleLabel}
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{toggleLabel}</DialogTitle>
              <DialogDescription>{confirmText}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {t('admin.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isSubmitting}
                variant={isActive ? 'destructive' : 'default'}
              >
                {t('admin.confirmCancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
