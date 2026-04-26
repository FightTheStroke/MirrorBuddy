import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { WaitlistForm } from '@/components/coming-soon/waitlist-form';

interface ComingSoonPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ComingSoonPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'waitlist' });

  return {
    title: `${t('title')} - MirrorBuddy`,
    description: t('subtitle'),
    openGraph: {
      title: `${t('title')} - MirrorBuddy`,
      description: t('subtitle'),
      images: [
        {
          url: '/logo-mirrorbuddy-full.png',
          width: 1200,
          height: 630,
          alt: 'MirrorBuddy',
        },
      ],
    },
  };
}

export default async function ComingSoonPage({ params }: ComingSoonPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'waitlist' });

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-blue-950 flex flex-col items-center justify-center px-4 py-12"
      aria-label={t('title')}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo-brain.webp"
            alt="MirrorBuddy"
            width={80}
            height={80}
            priority
            className="rounded-2xl shadow-md"
          />
        </div>

        {/* Header */}
        <header className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('title')}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('subtitle')}
          </p>
        </header>

        {/* Waitlist Form */}
        <section aria-label={t('submitButton')}>
          <WaitlistForm />
        </section>

        {/* Login link */}
        <nav aria-label={t('accountNavigation')} className="text-center pt-2">
          <Link
            href="/login"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm transition-colors"
          >
            {t('loginLink')}
          </Link>
        </nav>
      </div>
    </main>
  );
}
