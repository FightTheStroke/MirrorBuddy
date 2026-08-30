import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ProWaitlistForm } from './pro-waitlist-form';

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pro' });
  return { title: `${t('title')} | MirrorBuddy`, description: t('subtitle') };
}

export default async function ProPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pro' });

  const benefits = [t('benefitAnalytics'), t('benefitMaterials'), t('benefitSupport')];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 px-4 py-12 dark:from-slate-900 dark:to-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p className="inline-block rounded-full bg-indigo-700 px-3 py-1 text-sm font-medium text-white">
            {t('badge')}
          </p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-700 dark:text-slate-300">
            {t('subtitle')}
          </p>
        </header>

        <section className="mt-10 rounded-lg bg-white/80 p-6 shadow-sm dark:bg-slate-900/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('benefitsTitle')}
          </h2>
          <ul className="mt-4 space-y-3 text-slate-800 dark:text-slate-200">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3">
                <span aria-hidden="true">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
          <ProWaitlistForm locale={locale} />
        </section>

        <p className="mt-8 text-center">
          <Link
            href={`/${locale}`}
            className="text-indigo-800 underline hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            {t('backToApp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
