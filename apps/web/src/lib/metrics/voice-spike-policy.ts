import { waitUntil } from '@vercel/functions';
import { logger } from '@/lib/logger';
import { getFlag, isGlobalKillSwitchActive } from '@/lib/feature-flags/feature-flags-service';
import { beginFeaturePolicyWrite } from '@/lib/feature-flags/policy-writer';
import { requireConfirmedPolicy } from '@/lib/feature-flags/policy-write-outcome';
import type { PolicyActivationToken } from '@/lib/feature-flags/policy-write-types';

interface SpikeEpisode {
  until: number;
  token?: PolicyActivationToken;
  timer?: ReturnType<typeof setTimeout>;
}
let episode: SpikeEpisode | undefined;

export function stopVoiceForSpike(reason: string, cooldownMs: number): void {
  if (episode?.timer) clearTimeout(episode.timer);
  const current: SpikeEpisode = { until: Date.now() + cooldownMs };
  episode = current;
  const operation = beginFeaturePolicyWrite(
    'voice_realtime',
    {
      killSwitch: true,
      killSwitchReason: reason,
    },
    'voice-cost',
  );
  current.token = operation.activation;
  waitUntil(
    operation.completion.then(requireConfirmedPolicy).catch((error: unknown) => {
      logger.error('Voice cost stop unconfirmed; local protection retained', undefined, error);
    }),
  );
  current.timer = setTimeout(() => {
    current.timer = undefined;
    if (episode !== current) return;
    const recovery = (async () => {
      try {
        const result = await beginFeaturePolicyWrite(
          'voice_realtime',
          { killSwitch: false },
          'voice-cost',
          current.token,
        ).completion;
        requireConfirmedPolicy(result);
        if (episode !== current) return;
        episode = undefined;
        logger.info('Voice cost protection released after confirmed cooldown recovery');
      } catch (error) {
        logger.error(
          'Voice cost recovery unconfirmed; local protection retained',
          undefined,
          error,
        );
      }
    })();
    waitUntil(recovery);
  }, cooldownMs);
}

export function voicePolicyAllowance(): { allowed: boolean; reason?: string } {
  if (episode && Date.now() < episode.until) {
    const minutes = Math.ceil((episode.until - Date.now()) / 60000);
    return {
      allowed: false,
      reason: `Voce temporaneamente disabilitata per protezione costi. Riprova tra ${minutes} minuti.`,
    };
  }
  const flag = getFlag('voice_realtime');
  if (
    isGlobalKillSwitchActive() ||
    !flag ||
    flag.killSwitch ||
    flag.status === 'disabled' ||
    flag.enabledPercentage === 0
  ) {
    return { allowed: false, reason: 'Voice is blocked by the effective safety policy.' };
  }
  return { allowed: true };
}

export function resetVoiceSpikePolicy(): void {
  if (episode?.timer) clearTimeout(episode.timer);
  episode = undefined;
}
