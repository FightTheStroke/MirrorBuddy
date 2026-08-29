'use client';

/**
 * Pro waitlist form.
 *
 * Pro does not exist yet. Rather than send a child to a subscription screen
 * that cannot be bought, we take an email and promise one message: the day
 * Pro opens. It reuses the waitlist service, so the double opt-in, the GDPR
 * consent record and the unsubscribe link are the ones already audited.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_CLASS =
  'mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-700 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100';

export function errorKeyForStatus(status: number): string {
  if (status === 409) return 'errorDuplicate';
  if (status === 429) return 'errorRateLimit';
  if (status === 400) return 'errorValidation';
  return 'errorServer';
}

export function ProWaitlistForm({ locale }: { locale: string }) {
  const t = useTranslations('waitlist');
  const tPro = useTranslations('pro');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) return setErrorKey('errorEmailRequired');
    if (!EMAIL_PATTERN.test(trimmed)) return setErrorKey('errorEmailInvalid');
    if (!gdprConsent) return setErrorKey('errorGdprRequired');

    setErrorKey(null);
    setStatus('submitting');

    try {
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: trimmed.toLowerCase(),
          name: name.trim() || undefined,
          locale,
          gdprConsent: true,
          source: 'pro',
        }),
      });

      if (response.ok) {
        setStatus('success');
        return;
      }

      setErrorKey(errorKeyForStatus(response.status));
      setStatus('error');
    } catch {
      setErrorKey('errorServer');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-300 bg-green-50 p-6 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100"
      >
        <h2 className="text-lg font-semibold">{t('successTitle')}</h2>
        <p className="mt-2 text-sm">{t('successMessage')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {tPro('formTitle')}
      </h2>

      <div>
        <label
          htmlFor="pro-waitlist-email"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          {t('emailLabel')}
        </label>
        <input
          id="pro-waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          aria-describedby={errorKey ? 'pro-waitlist-error' : undefined}
          aria-invalid={errorKey ? true : undefined}
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor="pro-waitlist-name"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          {t('nameLabel')} <span className="font-normal">({t('optional')})</span>
        </label>
        <input
          id="pro-waitlist-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('namePlaceholder')}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="pro-waitlist-gdpr"
          name="gdprConsent"
          type="checkbox"
          checked={gdprConsent}
          onChange={(event) => setGdprConsent(event.target.checked)}
          className="mt-1 h-5 w-5 rounded border-slate-400 text-indigo-700 focus:ring-2 focus:ring-indigo-700"
        />
        <label htmlFor="pro-waitlist-gdpr" className="text-sm text-slate-800 dark:text-slate-200">
          {t('gdprConsent')}
        </label>
      </div>

      {errorKey && (
        <p
          id="pro-waitlist-error"
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"
        >
          {t(errorKey)}
        </p>
      )}

      <Button type="submit" disabled={status === 'submitting'} className="w-full">
        {status === 'submitting' ? t('submitting') : t('submitButton')}
      </Button>
    </form>
  );
}
