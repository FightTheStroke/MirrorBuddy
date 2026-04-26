/**
 * Stripe Admin Page
 *
 * Server component: fetches dashboard data, delegates to StripeTabs client.
 * Located under /admin (non-i18n route) per proxy architecture (ADR 0066).
 */

export const dynamic = 'force-dynamic';

import { validateAdminAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { getDashboardData } from '@/lib/admin/stripe-admin-service';
import { getPaymentSettings } from '@/lib/admin/stripe-settings-service';
import { StripeTabs } from '@/components/admin/stripe/stripe-tabs';

export const metadata = {
  title: 'Stripe | Admin',
};

export default async function StripeAdminPage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/login');
  }

  const [dashboard, settings] = await Promise.all([getDashboardData(), getPaymentSettings()]);

  return (
    <div className="space-y-6">
      <StripeTabs dashboard={dashboard} settings={settings} />
    </div>
  );
}
