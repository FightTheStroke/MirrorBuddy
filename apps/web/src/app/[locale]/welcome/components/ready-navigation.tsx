'use client';

import { useId, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useSettingsStore } from '@/lib/stores';
import { csrfFetch, requireIdentityRefresh } from '@/lib/auth';
import { logger } from '@/lib/logger';

export function ReadyNavigation({ onStart }: { onStart: () => void }) {
  const t = useTranslations('welcome.ready');
  const router = useRouter();
  const emailId = useId();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [needsParentEmail, setNeedsParentEmail] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [consentPending, setConsentPending] = useState(false);
  const { data, prevStep, completeOnboarding, isReplayMode } = useOnboardingStore();
  const { updateStudentProfile } = useSettingsStore();

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart();
    setSaving(true);
    setFailed(false);
    try {
      if (!isReplayMode) {
        const response = await csrfFetch('/api/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            data: {
              ...data,
              ...(needsParentEmail && { parentEmail: parentEmail.trim() }),
            },
            hasCompletedOnboarding: true,
          }),
        });
        const result: unknown = await response.json();
        if (
          response.status === 400 &&
          result &&
          typeof result === 'object' &&
          'requiresParentEmail' in result &&
          result.requiresParentEmail === true
        ) {
          setNeedsParentEmail(true);
          setConsentPending(false);
          return;
        }
        if (
          !response.ok ||
          !result ||
          typeof result !== 'object' ||
          !('success' in result) ||
          result.success !== true
        ) {
          throw new Error(`Onboarding save not acknowledged (${response.status})`);
        }
        if ('coppa' in result) {
          const coppa = result.coppa;
          if (
            !coppa ||
            typeof coppa !== 'object' ||
            !('consentRequired' in coppa) ||
            typeof coppa.consentRequired !== 'boolean'
          ) {
            throw new Error('Invalid parental consent response');
          }
          if (
            coppa.consentRequired &&
            (!('consentGranted' in coppa) || coppa.consentGranted !== true)
          ) {
            if (
              !('consentPending' in coppa) ||
              coppa.consentPending !== true ||
              ('emailSent' in coppa && coppa.emailSent === false)
            ) {
              throw new Error('Parental consent request not acknowledged');
            }
            setNeedsParentEmail(false);
            setParentEmail('');
            setConsentPending(true);
            return;
          }
        }
        await requireIdentityRefresh('authenticated');
        updateStudentProfile({
          name: data.name,
          age: data.age,
          schoolLevel: data.schoolLevel || 'superiore',
          learningDifferences: (data.learningDifferences || []) as Array<
            | 'dyslexia'
            | 'dyscalculia'
            | 'dysgraphia'
            | 'adhd'
            | 'autism'
            | 'cerebralPalsy'
            | 'visualImpairment'
            | 'auditoryProcessing'
          >,
        });
      }
      completeOnboarding();
      router.push('/');
    } catch (error) {
      logger.error('Onboarding completion failed', { error: String(error) });
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleStart} className="space-y-4">
      {failed && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {t('completionFailed')}
        </p>
      )}
      {needsParentEmail && (
        <div className="space-y-2">
          <label htmlFor={emailId} className="block font-medium text-gray-900 dark:text-gray-100">
            {t('parentEmailLabel')}
          </label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            disabled={saving}
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            aria-describedby={`${emailId}-hint`}
          />
          <p id={`${emailId}-hint`} className="text-sm text-gray-700 dark:text-gray-300">
            {t('parentEmailHint')}
          </p>
        </div>
      )}
      {consentPending && (
        <p role="status" className="text-gray-700 dark:text-gray-300">
          {t('parentConsentPending')}
        </p>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 pt-4"
      >
        <Button
          type="button"
          onClick={prevStep}
          disabled={saving}
          variant="outline"
          size="lg"
          className="flex-none"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          {t('backButton')}
        </Button>
        <Button
          type="submit"
          disabled={saving}
          size="lg"
          className="flex-1 min-w-0 h-auto whitespace-normal bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 text-white py-6 text-lg font-semibold shadow-lg"
        >
          <Rocket className="mr-2 w-5 h-5 shrink-0" />
          <span className="min-w-0 break-words">
            {t(consentPending ? 'checkParentConsent' : 'startButton')}
          </span>
        </Button>
      </motion.div>
    </form>
  );
}
