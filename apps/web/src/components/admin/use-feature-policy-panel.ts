'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { csrfFetch } from '@/lib/auth';
import type { FeatureFlag } from '@/lib/feature-flags/types';

const outcomeSchema = z.object({
  success: z.boolean(),
  persistence: z.enum(['confirmed', 'skipped', 'unconfirmed']),
  superseded: z.boolean().optional(),
  scope: z.literal('instance'),
  effective: z.object({
    killSwitch: z.boolean(),
    status: z.enum(['enabled', 'disabled', 'degraded']),
    enabledPercentage: z.number(),
    killSwitchReason: z.string().nullable().optional(),
  }),
});
type Effective = z.infer<typeof outcomeSchema>['effective'];
type PanelError = 'loadFailed' | 'failed' | 'unconfirmed' | 'superseded';
export type DegradationLevel = 'none' | 'partial' | 'severe' | 'critical';

export function useFeaturePolicyPanel(onFlagUpdate?: (id: string, enabled: boolean) => void) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [level, setLevel] = useState<DegradationLevel>('none');
  const [isLoading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<PanelError | null>(null);
  const [instancePolicy, setInstancePolicy] = useState(false);
  const overrides = useRef(new Map<string, Effective>());
  const globalOverride = useRef<boolean | undefined>(undefined);

  const fetchFlags = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/feature-flags?health=true');
      if (!response.ok) throw new Error('Policy read failed');
      const data: {
        flags: FeatureFlag[];
        globalKillSwitch: boolean;
        degradation?: { level: DegradationLevel };
      } = await response.json();
      setFlags(data.flags.map((flag) => ({ ...flag, ...overrides.current.get(flag.id) })));
      setGlobalKillSwitch(globalOverride.current ?? data.globalKillSwitch);
      if (data.degradation) setLevel(data.degradation.level);
    } catch {
      setError((previous) => previous ?? 'loadFailed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFlags();
    const timer = setInterval(() => {
      void fetchFlags();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchFlags]);

  const mutate = useCallback(
    async (id: string, enabled: boolean) => {
      setUpdating(id);
      setError(null);
      try {
        const response = await csrfFetch('/api/admin/feature-flags', {
          method: 'POST',
          body: JSON.stringify({
            ...(id === 'global' ? { global: true } : { featureId: id }),
            enabled,
            reason: enabled ? 'Manual emergency stop' : 'Manual reactivation',
          }),
        });
        const parsed = outcomeSchema.safeParse(await response.json());
        if (!parsed.success) {
          setError('failed');
          return;
        }
        const outcome = parsed.data;
        setInstancePolicy(true);
        if (id === 'global') {
          globalOverride.current = outcome.effective.killSwitch;
          setGlobalKillSwitch(outcome.effective.killSwitch);
        } else {
          overrides.current.set(id, outcome.effective);
          setFlags((previous) =>
            previous.map((flag) => (flag.id === id ? { ...flag, ...outcome.effective } : flag)),
          );
        }
        if (
          !response.ok ||
          !outcome.success ||
          outcome.persistence !== 'confirmed' ||
          outcome.superseded
        ) {
          setError(
            outcome.persistence === 'unconfirmed'
              ? 'unconfirmed'
              : outcome.superseded || outcome.persistence === 'skipped'
                ? 'superseded'
                : 'failed',
          );
          return;
        }
        if (id !== 'global') {
          onFlagUpdate?.(
            id,
            !outcome.effective.killSwitch && outcome.effective.status !== 'disabled',
          );
        }
      } catch {
        setError('unconfirmed');
      } finally {
        setUpdating(null);
      }
    },
    [onFlagUpdate],
  );

  return { flags, globalKillSwitch, level, isLoading, updating, error, instancePolicy, mutate };
}
