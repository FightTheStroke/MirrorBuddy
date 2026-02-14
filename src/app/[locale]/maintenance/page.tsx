import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MaintenancePageClient } from './maintenance-page-client';

export const dynamic = 'force-dynamic';

interface MaintenancePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: MaintenancePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'maintenance' });

  return {
    title: t('page.title'),
    description: t('page.description'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function MaintenancePage({ params }: MaintenancePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'maintenance' });

  return (
    <MaintenancePageClient
      title={t('page.title')}
      heading={t('page.heading')}
      description={t('page.description')}
      apology={t('page.apology')}
      refreshPageLabel={t('page.refreshPage')}
      estimatedReturn={t('page.estimatedReturn', { time: '30 min' })}
    />
  );
}
