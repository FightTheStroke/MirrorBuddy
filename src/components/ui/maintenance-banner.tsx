'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type MaintenanceApiResponse =
  | { status: 'none' }
  | {
      status: 'upcoming';
      message?: string;
      severity?: string;
      startTime: string;
      endTime?: string;
    }
  | {
      status: 'active';
      message?: string;
      severity?: string;
      estimatedEndTime?: string;
    };

const DISMISS_KEY = 'maintenance-banner-dismissed';
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CLOCK_REFRESH_MS = 60 * 1000;

function formatTimeRemaining(targetIso: string): string {
  const remainingMs = new Date(targetIso).getTime() - Date.now();
  if (remainingMs <= 0) {
    return '0m';
  }

  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function MaintenanceBanner() {
  const t = useTranslations('maintenance');
  const [payload, setPayload] = useState<MaintenanceApiResponse>({ status: 'none' });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  });
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchMaintenance = async () => {
      try {
        const response = await fetch('/api/maintenance', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const nextPayload = (await response.json()) as MaintenanceApiResponse;
        if (isMounted) {
          setPayload(nextPayload);
        }
      } catch {
        // Silent fail: banner should never block the page.
      }
    };

    void fetchMaintenance();
    const pollId = window.setInterval(fetchMaintenance, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    if (payload.status !== 'upcoming') {
      return;
    }

    const clockId = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, CLOCK_REFRESH_MS);

    return () => window.clearInterval(clockId);
  }, [payload.status]);

  const shouldShow = useMemo(() => {
    void clockTick;
    if (dismissed) {
      return false;
    }

    return payload.status === 'upcoming' || payload.status === 'active';
  }, [clockTick, dismissed, payload.status]);

  if (!shouldShow) {
    return null;
  }

  const isHighSeverity = payload.severity === 'high';
  const bannerClasses = isHighSeverity ? 'bg-red-600 text-red-50' : 'bg-amber-500 text-amber-950';

  const label = payload.status === 'active' ? t('notification.title') : t('banner.scheduled');

  const message = payload.message || t('notification.body');

  const countdownText =
    payload.status === 'upcoming'
      ? t('banner.countdown', { timeRemaining: formatTimeRemaining(payload.startTime) })
      : null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div
      role="banner"
      aria-label={label}
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium ${bannerClasses}`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 text-center">
        <span>{message}</span>
        {countdownText ? <span className="font-semibold">{countdownText}</span> : null}
        <Link href="/maintenance" className="underline underline-offset-2 font-semibold">
          {t('banner.learnMore')}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded border border-current px-2 py-0.5 text-xs font-semibold"
          aria-label={t('banner.dismiss')}
        >
          {t('banner.dismiss')}
        </button>
      </div>
    </div>
  );
}
