'use client';

/**
 * StripeSubscriptionActions — Cancel, refund, change plan dialogs
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/auth';
import type { StripeSubscription } from '@/lib/admin/stripe-admin-types';

interface StripeSubscriptionActionsProps {
  subscription: StripeSubscription;
  onUpdated: () => void;
}

export function StripeSubscriptionActions({
  subscription,
  onUpdated,
}: StripeSubscriptionActionsProps) {
  const t = useTranslations('admin');
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [chargeId, setChargeId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [newPriceId, setNewPriceId] = useState('');

  const callApi = async (method: string, body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await csrfFetch(`/api/admin/stripe/subscriptions/${subscription.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) onUpdated();
      return res.ok;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (await callApi('PUT', { action: 'cancel', cancelAtPeriodEnd })) setShowCancel(false);
  };

  const handleRefund = async () => {
    const body: Record<string, unknown> = { chargeId };
    if (refundAmount) body.amount = Math.round(parseFloat(refundAmount) * 100);
    if (refundReason) body.reason = refundReason;
    if (await callApi('POST', body)) {
      setShowRefund(false);
      setChargeId('');
      setRefundAmount('');
    }
  };

  const handleChangePlan = async () => {
    if (await callApi('PUT', { action: 'change_plan', newPriceId })) {
      setShowChange(false);
      setNewPriceId('');
    }
  };

  const isActive = subscription.status === 'active';

  return (
    <div className="flex gap-1">
      {isActive && (
        <Button size="sm" variant="outline" onClick={() => setShowCancel(true)}>
          {t('stripe.cancel') ?? 'Cancel'}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setShowRefund(true)}>
        {t('stripe.refund') ?? 'Refund'}
      </Button>
      {isActive && (
        <Button size="sm" variant="outline" onClick={() => setShowChange(true)}>
          {t('stripe.changePlan') ?? 'Change'}
        </Button>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stripe.cancelSubscription') ?? 'Cancel Subscription'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cancelAtPeriodEnd}
                onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
              />
              <span className="text-sm">
                {t('stripe.cancelAtPeriodEnd') ?? 'Cancel at period end'}
              </span>
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancel(false)}>
                {t('stripe.back') ?? 'Back'}
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={loading}>
                {loading
                  ? (t('stripe.canceling') ?? 'Canceling...')
                  : (t('stripe.confirmCancel') ?? 'Confirm Cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefund} onOpenChange={setShowRefund}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stripe.issueRefund') ?? 'Issue Refund'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="charge-id" className="text-sm font-medium">
                {t('stripe.chargeId') ?? 'Charge ID'}
              </label>
              <input
                id="charge-id"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={chargeId}
                onChange={(e) => setChargeId(e.target.value)}
                placeholder={t('stripe.chargeIdPlaceholder') ?? 'ch_...'}
              />
            </div>
            <div>
              <label htmlFor="refund-amount" className="text-sm font-medium">
                {t('stripe.amount') ?? 'Amount (EUR, optional)'}
              </label>
              <input
                id="refund-amount"
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="refund-reason" className="text-sm font-medium">
                {t('stripe.reason') ?? 'Reason'}
              </label>
              <select
                id="refund-reason"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              >
                <option value="">{t('stripe.none') ?? 'None'}</option>
                <option value="duplicate">{t('stripe.duplicate') ?? 'Duplicate'}</option>
                <option value="fraudulent">{t('stripe.fraudulent') ?? 'Fraudulent'}</option>
                <option value="requested_by_customer">
                  {t('stripe.customerRequest') ?? 'Customer Request'}
                </option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRefund(false)}>
                {t('stripe.back') ?? 'Back'}
              </Button>
              <Button onClick={handleRefund} disabled={loading || !chargeId}>
                {loading
                  ? (t('stripe.processing') ?? 'Processing...')
                  : (t('stripe.issueRefund') ?? 'Issue Refund')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChange} onOpenChange={setShowChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stripe.changePlan') ?? 'Change Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-price" className="text-sm font-medium">
                {t('stripe.newPriceId') ?? 'New Price ID'}
              </label>
              <input
                id="new-price"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={newPriceId}
                onChange={(e) => setNewPriceId(e.target.value)}
                placeholder={t('stripe.priceIdPlaceholder') ?? 'price_...'}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowChange(false)}>
                {t('stripe.back') ?? 'Back'}
              </Button>
              <Button onClick={handleChangePlan} disabled={loading || !newPriceId}>
                {loading
                  ? (t('stripe.changing') ?? 'Changing...')
                  : (t('stripe.changePlan') ?? 'Change Plan')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
