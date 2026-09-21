import { waitUntil } from '@vercel/functions';
import { logger } from '@/lib/logger';
import { beginFeaturePolicyWrite } from '@/lib/feature-flags/policy-writer';
import { requireConfirmedPolicy } from '@/lib/feature-flags/policy-write-outcome';
import type { PolicyActivationToken } from '@/lib/feature-flags/policy-write-types';
import type { KnownFeatureFlag } from '@/lib/feature-flags/types';
import type { FallbackBehavior } from './types';

interface Episode {
  token?: PolicyActivationToken;
  pending?: Promise<void>;
  attempted: boolean;
}
const episodes = new Map<KnownFeatureFlag, Episode>();

export function stopDegradationPolicy(
  id: KnownFeatureFlag,
  behavior: FallbackBehavior,
  reason: string,
): void {
  const episode: Episode = { attempted: false };
  episodes.set(id, episode);
  try {
    const operation = beginFeaturePolicyWrite(
      id,
      behavior === 'disable'
        ? { killSwitch: true, killSwitchReason: reason }
        : { status: 'degraded' },
      'degradation',
    );
    episode.token = operation.activation;
    waitUntil(
      operation.completion.then(requireConfirmedPolicy).catch((error: unknown) => {
        logger.error(
          'Degradation policy stop unconfirmed; local fallback retained',
          { featureId: id },
          error,
        );
      }),
    );
  } catch (error) {
    logger.error(
      'Degradation policy stop refused; local fallback retained',
      { featureId: id },
      error,
    );
  }
}

export function recoverDegradationPolicy(
  id: KnownFeatureFlag,
  onConfirmed: () => void,
  explicit: boolean,
): Promise<void> {
  const episode = episodes.get(id);
  if (!episode) return Promise.resolve();
  if (episode.pending) return episode.pending;
  if (!explicit && episode.attempted) return Promise.resolve();
  episode.attempted = true;
  const pending = (async () => {
    try {
      const result = await beginFeaturePolicyWrite(
        id,
        { killSwitch: false, status: 'enabled' },
        'degradation',
        episode.token,
      ).completion;
      requireConfirmedPolicy(result);
      if (episodes.get(id) !== episode) return;
      episodes.delete(id);
      onConfirmed();
    } catch (error) {
      logger.error(
        'Degradation recovery unconfirmed; local fallback retained',
        { featureId: id },
        error,
      );
    }
  })().finally(() => {
    episode.pending = undefined;
  });
  episode.pending = pending;
  waitUntil(pending);
  return pending;
}

export function isDegradationRecoveryPending(id: KnownFeatureFlag): boolean {
  return !!episodes.get(id)?.pending;
}

export function resetDegradationPolicy(): void {
  episodes.clear();
}
