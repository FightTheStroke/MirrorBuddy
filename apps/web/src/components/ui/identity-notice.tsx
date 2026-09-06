'use client';

import { useTranslations } from 'next-intl';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { refreshClientIdentity } from '@/lib/auth/client-auth';
import { Button } from './button';
import { LogoutActions } from './logout-actions';

export function IdentityNotice() {
  const identity = useClientIdentity();
  const t = useTranslations('common.session');
  if (identity.status !== 'unavailable') return null;
  return (
    <div
      role="alert"
      data-testid="identity-unavailable-alert"
      className="space-y-3 border border-amber-700 bg-amber-50 p-3 text-amber-950 dark:bg-slate-900 dark:text-amber-100"
    >
      <p>{t('unavailable')}</p>
      <Button
        variant="outline"
        onClick={() => {
          void refreshClientIdentity();
        }}
      >
        {t('retry')}
      </Button>
      <LogoutActions testId="identity-logout-button" />
    </div>
  );
}
