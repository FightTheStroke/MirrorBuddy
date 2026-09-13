'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@/components/ui/toast';
import { projectUserLimitDetails } from '@/lib/admin/user-list-projection';
import type { UserLimitDetails } from '@/lib/admin/user-list-types';

export function useUserLimitDetails(subscriptionId: string | undefined) {
  const t = useTranslations('admin');
  const [details, setDetails] = useState<UserLimitDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      if (!subscriptionId) throw new Error('Subscription is required');
      const response = await fetch(
        `/api/admin/subscriptions/${encodeURIComponent(subscriptionId)}`,
      );
      if (!response.ok) throw new Error('Subscription could not be loaded');
      const loaded = projectUserLimitDetails(await response.json());
      if (loaded.id !== subscriptionId)
        throw new Error('Subscription response did not match the requested row');
      setDetails(loaded);
    } catch {
      toast.error(t('noDataAvailable'));
    } finally {
      setLoading(false);
    }
  };
  return { details, loading, load, close: () => setDetails(null) };
}
