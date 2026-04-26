'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface FormErrors {
  email?: string;
  gdprConsent?: string;
  general?: string;
}

function getErrorKey(status: number): string {
  if (status === 409) return 'errorDuplicate';
  if (status === 429) return 'errorRateLimit';
  if (status === 400) return 'errorValidation';
  return 'errorServer';
}

export function WaitlistForm() {
  const t = useTranslations('waitlist');
  const locale = useLocale();

  const [formState, setFormState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formState === 'error' && errorRef.current) {
      errorRef.current.focus();
    }
  }, [formState]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim()) {
      newErrors.email = t('errorEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('errorEmailInvalid');
    }
    if (!gdprConsent) {
      newErrors.gdprConsent = t('errorGdprRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormState('submitting');
    setErrors({});

    try {
      // eslint-disable-next-line local-rules/require-csrf-fetch -- public waitlist endpoint, no auth, uses rate limiting
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          locale,
          gdprConsentVersion: '1.0',
          marketingConsent,
        }),
      });

      if (!response.ok) {
        const errorKey = getErrorKey(response.status);
        setErrors({ general: t(errorKey) });
        setFormState('error');
        return;
      }

      setFormState('success');
    } catch {
      setErrors({ general: t('errorServer') });
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <div className="text-center space-y-4 py-8" role="status" aria-live="polite">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('successTitle')}</h2>
        <p className="text-slate-600 dark:text-slate-300">{t('successMessage')}</p>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label={t('submitButton')}>
      <div
        ref={errorRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabIndex={hasErrors ? -1 : undefined}
        className={hasErrors ? undefined : 'sr-only'}
      >
        {errors.general && (
          <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="waitlist-email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {t('emailLabel')}
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        </label>
        <Input
          type="email"
          id="waitlist-email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          disabled={formState === 'submitting'}
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          autoComplete="email"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Name (optional) */}
      <div>
        <label
          htmlFor="waitlist-name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {t('nameLabel')}
          <span className="text-slate-400 text-xs ml-1">({t('optional')})</span>
        </label>
        <Input
          type="text"
          id="waitlist-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          disabled={formState === 'submitting'}
          autoComplete="given-name"
        />
      </div>

      {/* GDPR Consent (required) */}
      <div>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="waitlist-gdpr"
            name="gdprConsent"
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            disabled={formState === 'submitting'}
            required
            aria-required="true"
            aria-invalid={!!errors.gdprConsent}
            aria-describedby={errors.gdprConsent ? 'gdpr-error' : undefined}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          />
          <label
            htmlFor="waitlist-gdpr"
            className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer leading-relaxed"
          >
            {t('gdprConsent')}{' '}
            <a
              href="/privacy"
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('privacyLink')}
            </a>
          </label>
        </div>
        {errors.gdprConsent && (
          <p id="gdpr-error" className="text-xs text-red-600 dark:text-red-400 mt-1 ml-7">
            {errors.gdprConsent}
          </p>
        )}
      </div>

      {/* Marketing opt-in (optional) */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="waitlist-marketing"
          name="marketingConsent"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          disabled={formState === 'submitting'}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        />
        <label
          htmlFor="waitlist-marketing"
          className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer leading-relaxed"
        >
          {t('marketingConsent')}
        </label>
      </div>

      <Button
        type="submit"
        disabled={formState === 'submitting'}
        className="w-full"
        size="lg"
        aria-busy={formState === 'submitting'}
      >
        {formState === 'submitting' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t('submitting')}
          </>
        ) : (
          t('submitButton')
        )}
      </Button>
    </form>
  );
}
