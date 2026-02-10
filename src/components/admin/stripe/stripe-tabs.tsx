'use client';

/**
 * StripeTabs — Client component with 4 tabs
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import type { StripeAdminResponse, PaymentSettings } from '@/lib/admin/stripe-admin-types';
import { StripeDashboardTab } from './stripe-dashboard-tab';
import { StripeProductsTab } from './stripe-products-tab';
import { StripeSubscriptionsTab } from './stripe-subscriptions-tab';
import { StripeWebhooksTab } from './stripe-webhooks-tab';

interface StripeTabsProps {
  dashboard: StripeAdminResponse;
  settings: PaymentSettings;
}

export function StripeTabs({ dashboard, settings }: StripeTabsProps) {
  const t = useTranslations('admin');
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="dashboard">
          {t('stripe.tabs.dashboard') ?? 'Dashboard'}
        </TabsTrigger>
        <TabsTrigger value="products">
          {t('stripe.tabs.products') ?? 'Products'}
        </TabsTrigger>
        <TabsTrigger value="subscriptions">
          {t('stripe.tabs.subscriptions') ?? 'Subscriptions'}
        </TabsTrigger>
        <TabsTrigger value="webhooks">
          {t('stripe.tabs.webhooks') ?? 'Webhooks'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-6">
        <StripeDashboardTab
          dashboard={dashboard}
          initialSettings={settings}
        />
      </TabsContent>

      <TabsContent value="products" className="mt-6">
        <StripeProductsTab initialProducts={dashboard.products} />
      </TabsContent>

      <TabsContent value="subscriptions" className="mt-6">
        <StripeSubscriptionsTab />
      </TabsContent>

      <TabsContent value="webhooks" className="mt-6">
        <StripeWebhooksTab />
      </TabsContent>
    </Tabs>
  );
}
