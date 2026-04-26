import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ContributionForm } from '@/components/community/contribution-form';
import { validateAuth } from '@/lib/auth/server';

import { ApprovedContributionsList } from './approved-contributions-list';

export const dynamic = 'force-dynamic';

interface CommunityPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'community' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'community' });

  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageDescription')}</p>
        <Link
          href={`/${locale}/community/my-contributions`}
          className="inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {t('myContributions.title')}
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('contributionForm.title')}</h2>
        <ContributionForm />
      </section>

      <ApprovedContributionsList
        endpoint="/api/community/list"
        title={t('list.title')}
        loadingLabel={t('reviewQueue.loadingPending')}
        emptyLabel={t('list.empty')}
      />
    </main>
  );
}
