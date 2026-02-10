/**
 * Stripe Admin Page
 *
 * Server component: fetches dashboard data, renders StripeTabs client component.
 */

import { validateAdminAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getDashboardData } from '@/lib/admin/stripe-admin-service';
import { getPaymentSettings } from '@/lib/admin/stripe-settings-service';
import { StripeTabs } from '@/components/admin/stripe/stripe-tabs';

export const metadata = {
  title: 'Stripe | Admin',
};

export default async function StripeAdminPage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');

  const [dashboard, settings] = await Promise.all([
    getDashboardData(),
    getPaymentSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('stripe.title') ?? 'Stripe'}</h1>
        <p className="text-muted-foreground">
          {t('stripe.description') ?? 'Manage payments, products, and subscriptions'}
        </p>
      </div>
      <StripeTabs
        dashboard={dashboard}
        settings={settings}
      />
    </div>
  );
}
