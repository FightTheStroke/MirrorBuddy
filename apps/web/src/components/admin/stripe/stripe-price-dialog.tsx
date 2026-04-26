'use client';

/**
 * StripePriceDialog — Create new price for a product
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/auth';

interface StripePriceDialogProps {
  productId: string;
  onCreated: () => void;
}

export function StripePriceDialog({ productId, onCreated }: StripePriceDialogProps) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await csrfFetch('/api/admin/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Price for ${productId}`,
          price: {
            unitAmount: Math.round(parseFloat(amount) * 100),
            currency: 'eur',
            interval,
          },
        }),
      });
      if (res.ok) {
        setOpen(false);
        setAmount('');
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('stripe.addPrice') ?? 'Add Price'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stripe.newPrice') ?? 'New Price'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="price-amount" className="text-sm font-medium">
              {t('stripe.amount') ?? 'Amount (EUR)'}
            </label>
            <input
              id="price-amount"
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="price-interval" className="text-sm font-medium">
              {t('stripe.interval') ?? 'Interval'}
            </label>
            <select
              id="price-interval"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={interval}
              onChange={(e) => setInterval(e.target.value as 'month' | 'year')}
            >
              <option value="month">{t('stripe.monthly') ?? 'Monthly'}</option>
              <option value="year">{t('stripe.yearly') ?? 'Yearly'}</option>
            </select>
          </div>
          <Button onClick={handleCreate} disabled={creating || !amount}>
            {creating ? 'Creating...' : 'Create Price'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
