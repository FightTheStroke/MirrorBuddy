'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import { clientLogger as logger } from '@/lib/logger/client';

interface EmailPreferences {
  productUpdates: boolean;
  educationalNewsletter: boolean;
  announcements: boolean;
}

type LoadingState = 'loading' | 'loaded' | 'error' | 'invalid-token';
type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function UnsubscribePage() {
  const t = useTranslations('email.unsubscribe');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [preferences, setPreferences] = useState<EmailPreferences>({
    productUpdates: true,
    educationalNewsletter: true,
    announcements: true,
  });

  useEffect(() => {
    async function fetchPreferences() {
      if (!token) {
        setLoadingState('invalid-token');
        return;
      }

      try {
        const response = await fetch(`/api/email/preferences?token=${encodeURIComponent(token)}`);

        if (!response.ok) {
          if (response.status === 404) {
            setLoadingState('invalid-token');
          } else {
            setLoadingState('error');
          }
          return;
        }

        const data = await response.json();
        setPreferences(data.preferences);
        setLoadingState('loaded');
      } catch (err) {
        logger.error('Failed to fetch preferences', undefined, err as Error);
        setLoadingState('error');
      }
    }

    fetchPreferences();
  }, [token]);

  const handleToggle = (category: keyof EmailPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    if (!token) return;

    setSaveState('saving');

    try {
      const response = await fetch(`/api/email/preferences?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
        return;
      }

      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      logger.error('Failed to save preferences', undefined, err as Error);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav
        className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
        aria-label={t('pageNavigation')}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label={t('backToHome')}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t('backToHome')}
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          {/* Title */}
          <div className="mb-8 pb-8 border-b border-slate-200 dark:border-gray-700">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{t('title')}</h1>
            <p className="text-slate-600 dark:text-gray-400">{t('description')}</p>
          </div>

          {/* Loading State */}
          {loadingState === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600 dark:text-gray-400">{t('loading')}</span>
            </div>
          )}

          {/* Invalid Token */}
          {loadingState === 'invalid-token' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    {t('invalidToken')}
                  </h2>
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    {t('invalidTokenDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {loadingState === 'error' && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-6 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    {t('errorTitle')}
                  </h2>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    {t('errorMessage')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Form */}
          {loadingState === 'loaded' && (
            <>
              <div className="space-y-6 mb-8">
                {/* Product Updates */}
                <PreferenceToggle
                  id="productUpdates"
                  label={t('categories.productUpdates.label')}
                  description={t('categories.productUpdates.description')}
                  checked={preferences.productUpdates}
                  onChange={() => handleToggle('productUpdates')}
                />

                {/* Educational Newsletter */}
                <PreferenceToggle
                  id="educationalNewsletter"
                  label={t('categories.educationalNewsletter.label')}
                  description={t('categories.educationalNewsletter.description')}
                  checked={preferences.educationalNewsletter}
                  onChange={() => handleToggle('educationalNewsletter')}
                />

                {/* Announcements */}
                <PreferenceToggle
                  id="announcements"
                  label={t('categories.announcements.label')}
                  description={t('categories.announcements.description')}
                  checked={preferences.announcements}
                  onChange={() => handleToggle('announcements')}
                />
              </div>

              {/* Save Button */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  aria-label={t('saveButton')}
                >
                  {saveState === 'saving' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    t('saveButton')
                  )}
                </button>

                {/* Success Message */}
                {saveState === 'success' && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          {t('successTitle')}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {t('successMessage')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {saveState === 'error' && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-100">
                          {t('errorTitle')}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {t('errorMessage')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-gray-700 text-sm text-slate-600 dark:text-gray-400 space-y-2">
            <p>{t('footer.privacy')}</p>
            <p>
              {t('footer.contact')}{' '}
              <a
                href="mailto:info@fightthestroke.org"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                info@fightthestroke.org
              </a>
            </p>
            <p>{t('footer.resubscribe')}</p>
          </footer>
        </article>
      </main>
    </div>
  );
}

interface PreferenceToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function PreferenceToggle({ id, label, description, checked, onChange }: PreferenceToggleProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex-1">
        <label
          htmlFor={id}
          className="block font-medium text-slate-900 dark:text-white mb-1 cursor-pointer"
        >
          {label}
        </label>
        <p className="text-sm text-slate-600 dark:text-gray-400">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
