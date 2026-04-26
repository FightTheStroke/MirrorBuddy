'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle, AlertCircle, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { csrfFetch } from '@/lib/auth';
import { clientLogger as logger } from '@/lib/logger/client';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function InviteRequestPage() {
  const router = useRouter();
  const t = useTranslations('auth.invite');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [motivation, setMotivation] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    try {
      // Get trial session ID if available
      const visitorId =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('mirrorbuddy-visitor-id='))
          ?.split('=')[1] || undefined;

      const response = await csrfFetch('/api/invites/request', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          motivation,
          visitorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState('error');
        setErrorMessage(data.error || t('errorDefault'));
        return;
      }

      setFormState('success');
    } catch (error) {
      logger.error('Invite request failed', { error: String(error) });
      const message =
        error instanceof Error && /csrf/i.test(error.message)
          ? t('errorSession')
          : t('errorConnection');
      setFormState('error');
      setErrorMessage(message);
    }
  };

  if (formState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('successTitle')}</h1>
          <p className="text-slate-600 dark:text-slate-300">{t('successMessage')}</p>
          <Button onClick={() => router.push('/welcome')} className="w-full">
            {t('backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backButton')}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('pageTitle')}</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">{t('pageDescription')}</p>
        </div>

        {formState === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t('nameLabel')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              disabled={formState === 'submitting'}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t('emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={formState === 'submitting'}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="motivation"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t('motivationLabel')}
            </label>
            <textarea
              id="motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              required
              minLength={20}
              rows={4}
              disabled={formState === 'submitting'}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
              placeholder={t('motivationPlaceholder')}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('minimumCharacters')}
            </p>
          </div>

          <Button type="submit" disabled={formState === 'submitting'} className="w-full">
            {formState === 'submitting' ? (
              t('submitButtonSubmitting')
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('submitButtonText')}
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {t('confirmationText')}
        </p>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-3">
            {t('haveAccount')}
          </p>
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              {t('loginButton')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
