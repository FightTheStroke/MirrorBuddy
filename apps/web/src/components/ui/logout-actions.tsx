'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { logoutClient, type LogoutScope } from '@/lib/auth/client-auth';
import { Button } from './button';

export function LogoutActions({ testId = 'logout-button' }: { testId?: string }) {
  const identity = useClientIdentity();
  const t = useTranslations('common.session');
  const locale = useLocale();
  const guard = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (identity.status === 'anonymous') return null;
  const logout = async (scope: LogoutScope) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await logoutClient(scope);
      // A full navigation discards account-bound in-memory stores, not consent choices.
      window.location.assign(`/${locale}/welcome`);
    } catch {
      setFailed(true);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      {identity.status === 'authenticated' && identity.legacyOrigin && (
        <p className="text-sm text-slate-700 dark:text-slate-200">{t('legacyFamily')}</p>
      )}
      {failed && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {t('logoutFailed')}
        </p>
      )}
      <Button
        variant="outline"
        className="w-full"
        data-testid={testId}
        disabled={busy || identity.status === 'pending'}
        onClick={() => {
          void logout('current');
        }}
      >
        {busy ? t('loggingOut') : t('logoutCurrent')}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={busy || identity.status !== 'authenticated'}
        onClick={() => {
          void logout('all');
        }}
      >
        {t('logoutAll')}
      </Button>
    </div>
  );
}
