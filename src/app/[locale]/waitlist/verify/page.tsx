import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface VerifyPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; promoCode?: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'waitlist' });
  return {
    title: `${t('verifyTitle')} - MirrorBuddy`,
    robots: { index: false },
  };
}

type StatusConfig = {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  heading: string;
  body: string;
  isSuccess: boolean;
};

export default async function VerifyPage(props: VerifyPageProps) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const status = searchParams?.status ?? 'not_found';
  const promoCode = searchParams?.promoCode;

  const t = await getTranslations({ locale, namespace: 'waitlist' });

  const statusMap: Record<string, StatusConfig> = {
    success: {
      icon: '✓',
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      heading: t('verifySuccess'),
      body: '',
      isSuccess: true,
    },
    expired: {
      icon: '⏰',
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      heading: t('verifyExpired'),
      body: '',
      isSuccess: false,
    },
    already: {
      icon: 'ℹ',
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      heading: t('verifyAlready'),
      body: '',
      isSuccess: false,
    },
    not_found: {
      icon: '✕',
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      heading: t('verifyNotFound'),
      body: '',
      isSuccess: false,
    },
  };

  const config = statusMap[status] ?? statusMap['not_found'];

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-blue-950 flex flex-col items-center justify-center px-4 py-12"
      aria-labelledby="verify-heading"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Status card */}
        <section
          className={`rounded-2xl border p-8 shadow-sm text-center space-y-4 ${config.bgColor} ${config.borderColor}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Icon */}
          <div className={`text-5xl font-bold ${config.color}`} role="img" aria-hidden="true">
            {config.icon}
          </div>

          {/* Page title */}
          <h1 id="verify-heading" className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('verifyTitle')}
          </h1>

          {/* Status message */}
          <p className={`text-base font-medium ${config.color}`}>{config.heading}</p>

          {/* Promo code (success only) */}
          {config.isSuccess && promoCode && (
            <div
              className="mt-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 p-4 space-y-2"
              aria-label={t('promoCodeTitle')}
            >
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('promoCodeTitle')}
              </p>
              <p
                className="text-2xl font-bold tracking-widest text-emerald-700 dark:text-emerald-400 select-all"
                aria-label={`${t('promoCodeTitle')}: ${promoCode}`}
              >
                {promoCode}
              </p>
            </div>
          )}
        </section>

        {/* Back link */}
        <nav aria-label={t('mainNavigation')} className="text-center">
          <Link
            href="/coming-soon"
            className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm transition-colors"
          >
            {t('backToComingSoon')}
          </Link>
        </nav>
      </div>
    </main>
  );
}
