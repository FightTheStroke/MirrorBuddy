'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Sparkles, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setTrialConsent } from '@/lib/consent/trial-consent';
import { TRIAL_CONSENT_COOKIE } from '@/lib/auth';

interface TrialEmailFormProps {
  onComplete: () => void;
}

/**
 * Trial Email Form - collects email + TOS acceptance before starting trial.
 * Sets trial consent cookie and stores email in sessionStorage.
 * Registers user in funnel as TRIAL_START.
 */
export function TrialEmailForm({ onComplete }: TrialEmailFormProps) {
  const t = useTranslations('welcome.quickStart');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);

  const acceptTrialConsent = () => {
    setTrialConsent();
    const consentData = {
      accepted: true,
      version: '1.0',
      acceptedAt: new Date().toISOString(),
    };
    document.cookie = `${TRIAL_CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify(consentData),
    )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!email || !email.includes('@') || email.length < 5) {
      setEmailError(t('trial.emailInvalid'));
      return;
    }

    setIsSubmitting(true);
    try {
      sessionStorage.setItem('mirrorbuddy-trial-email', email);
      acceptTrialConsent();
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      key="email-form"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleEmailSubmit}
      className="space-y-3"
    >
      <div>
        <label htmlFor="trial-email" className="sr-only">
          {t('trial.emailLabel')}
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="trial-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            placeholder={t('trial.emailPlaceholder')}
            required
            className="w-full rounded-xl border-2 border-pink-200 bg-white py-3 pl-10 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-pink-800 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
        {emailError && (
          <p className="mt-1 text-xs text-red-500" role="alert">
            {emailError}
          </p>
        )}
      </div>

      {/* Clickable TOS checkbox - entire row is clickable */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none group">
        <button
          type="button"
          role="checkbox"
          aria-checked={tosAccepted}
          aria-label={t('trial.tosLabel')}
          onClick={(e) => {
            e.preventDefault();
            setTosAccepted(!tosAccepted);
          }}
          className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded border-2 transition-colors flex items-center justify-center ${
            tosAccepted
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-slate-300 dark:border-slate-500 dark:bg-slate-800 group-hover:border-blue-400'
          }`}
        >
          {tosAccepted && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </button>
        <span className="text-xs leading-snug text-slate-600 dark:text-slate-400">
          {t('trial.tosLabel')}{' '}
          <Link
            href="/privacy"
            className="text-blue-600 underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {t('trial.privacyLink')}
          </Link>
          {' · '}
          <Link
            href="/terms"
            className="text-blue-600 underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {t('trial.termsLink')}
          </Link>
        </span>
      </label>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || !tosAccepted}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md py-5 text-base"
      >
        <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" />
        {t('trial.startTrial')}
      </Button>
    </motion.form>
  );
}
