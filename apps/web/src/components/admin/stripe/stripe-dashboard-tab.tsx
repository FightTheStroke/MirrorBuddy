'use client';

/**
 * StripeDashboardTab — Connection status, metrics, kill switch
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { csrfFetch } from '@/lib/auth';
import type { StripeAdminResponse, PaymentSettings } from '@/lib/admin/stripe-admin-types';
import { formatCurrency } from '@/lib/admin/stripe-admin-service';

interface StripeDashboardTabProps {
  dashboard: StripeAdminResponse;
  initialSettings: PaymentSettings;
}

export function StripeDashboardTab({
  dashboard,
  initialSettings,
}: StripeDashboardTabProps) {
  const t = useTranslations('admin');
  const [settings, setSettings] = useState(initialSettings);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await csrfFetch('/api/admin/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentsEnabled: !settings.paymentsEnabled,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('stripe.connectionStatus') ?? 'Connection Status'}
            <Badge variant={dashboard.configured ? 'default' : 'secondary'}>
              {dashboard.configured ? 'Connected' : 'Not Configured'}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('stripe.mrr') ?? 'MRR'}
          value={dashboard.revenue
            ? formatCurrency(dashboard.revenue.mrr)
            : '—'}
        />
        <MetricCard
          title={t('stripe.arr') ?? 'ARR'}
          value={dashboard.revenue
            ? formatCurrency(dashboard.revenue.arr)
            : '—'}
        />
        <MetricCard
          title={t('stripe.activeSubs') ?? 'Active Subscriptions'}
          value={
            dashboard.revenue?.activeSubscriptions?.toString() ?? '0'
          }
        />
        <MetricCard
          title={t('stripe.newThisMonth') ?? 'New This Month'}
          value={
            dashboard.revenue?.newThisMonth?.toString() ?? '0'
          }
        />
      </div>

      {/* Kill Switch */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('stripe.paymentSettings') ?? 'Payment Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {t('stripe.paymentsEnabled') ?? 'Payments Enabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('stripe.killSwitchDesc') ??
                'Toggle to enable/disable payment processing'}
            </p>
          </div>
          <Button
            variant={settings.paymentsEnabled ? 'default' : 'outline'}
            onClick={handleToggle}
            disabled={toggling}
            aria-pressed={settings.paymentsEnabled}
          >
            {settings.paymentsEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
