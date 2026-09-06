'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Sparkles, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  hasUnifiedConsent,
  getUnifiedConsent,
  retryConsentSync,
  saveTermsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { ConsentCompletionFeedback, ConsentFeedback } from '@/components/consent/consent-feedback';
import { ConsentReanswer } from '@/components/consent/consent-reanswer';
import { useConsentUI } from '@/components/consent/use-consent-ui';
import { TRIAL_CONSENT_COOKIE } from '@/lib/auth';
import { TOS_VERSION } from '@/lib/tos/constants';
import { ConsentSyncError, hasAcceptedTerms } from '@/lib/consent/unified-consent';

interface TrialEmailFormProps {
  onComplete: () => void | Promise<void>;
}

export function TrialEmailForm({ onComplete }: TrialEmailFormProps) {
  const t = useTranslations('welcome.quickStart');
  const [email, setEmail] = useState('');
  const {
    snapshot,
    busy,
    failure,
    run,
    invalidPurposes,
    completing,
    completionFailure,
    runCompletion,
  } = useConsentUI();
  const isSubmitting = busy || completing;
  const reanswer = invalidPurposes.includes('terms');
  const [emailError, setEmailError] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);

  const acceptTrialConsent = async (fresh = false) => {
    if (!fresh && snapshot.pending.includes('terms')) {
      await retryConsentSync('terms');
    } else if (fresh || !hasUnifiedConsent()) {
      const intent = saveTermsConsent(true);
      await syncUnifiedConsentToServer(intent);
    }
  };

  const completeTrial = async () => {
    const consent = getUnifiedConsent();
    if (!consent || !hasAcceptedTerms(consent)) {
      throw new Error('Current recorded terms are unavailable for trial completion');
    }
    sessionStorage.setItem('mirrorbuddy-trial-email', email);
    const consentData = {
      accepted: true,
      version: TOS_VERSION,
      acceptedAt: consent.tos.acceptedAt,
    };
    document.cookie = `${TRIAL_CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify(consentData),
    )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    await onComplete();
  };

  const startTrial = async (fresh = false) => {
    if (
      await run(
        async () => {
          await acceptTrialConsent(fresh);
          const consent = getUnifiedConsent();
          if (!consent || !hasAcceptedTerms(consent)) {
            throw new ConsentSyncError('invalid-intent');
          }
        },
        'terms',
        fresh,
      )
    ) {
      await runCompletion(completeTrial);
    }
  };
  const validateEmail = () => {
    if (!email || !email.includes('@') || email.length < 5) {
      setEmailError(t('trial.emailInvalid'));
      return false;
    }
    return true;
  };
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (reanswer || !tosAccepted) {
      setEmailError(t('trial.tosLabel'));
      return;
    }

    if (validateEmail()) await startTrial();
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
      {!reanswer && (
        <div className="flex items-start gap-2.5 select-none group">
          <button
            type="button"
            id="tos-checkbox"
            role="checkbox"
            aria-checked={tosAccepted}
            aria-label={t('trial.tosLabel')}
            onClick={() => setTosAccepted(!tosAccepted)}
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
        </div>
      )}

      {reanswer ? (
        <ConsentReanswer
          purpose="terms"
          busy={isSubmitting}
          onSave={(accepted) => {
            setEmailError('');
            if (accepted !== true) {
              setEmailError(t('trial.tosLabel'));
              return;
            }
            if (validateEmail()) void startTrial(true);
          }}
        />
      ) : (
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || !tosAccepted}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md py-5 text-base"
        >
          <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" />
          {t('trial.startTrial')}
        </Button>
      )}
      <ConsentFeedback
        snapshot={snapshot}
        failure={failure}
        busy={busy}
        purpose="terms"
        requiresNewDecision={reanswer}
        retry={() => {
          void startTrial();
        }}
      />
      <ConsentCompletionFeedback
        kind="trial"
        busy={completing}
        failed={completionFailure !== null}
        retry={() => {
          void runCompletion(completeTrial);
        }}
      />
    </motion.form>
  );
}
