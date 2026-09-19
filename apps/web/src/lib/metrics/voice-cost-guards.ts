/**
 * Voice Cost Guards Service
 *
 * V1Plan FASE 6.2.3: Voice session duration limits
 * - Soft cap: warning after 30 min/session
 * - Hard cap: switch to text after 60 min
 * - Spike protection: disable voice temporarily on cost spike
 */

import { logger } from '@/lib/logger';
import { detectCostSpike, THRESHOLDS } from './cost-tracking-service';
import {
  stopVoiceForSpike,
  voicePolicyAllowance,
  resetVoiceSpikePolicy,
} from './voice-spike-policy';

// Duration thresholds (in minutes) from V1Plan FASE 6.2.3
const VOICE_DURATION_LIMITS = {
  SOFT_CAP_MINUTES: 30, // Warning threshold
  HARD_CAP_MINUTES: 60, // Force switch to text
  SPIKE_COOLDOWN_MS: 15 * 60 * 1000, // 15 min cooldown after spike
} as const;

export type VoiceCapStatus = 'ok' | 'soft_cap' | 'hard_cap';

export interface VoiceSessionState {
  sessionId: string;
  userId: string;
  startedAt: Date;
  durationMinutes: number;
  status: VoiceCapStatus;
  warningShown: boolean;
}

export interface VoiceCapCheck {
  allowed: boolean;
  status: VoiceCapStatus;
  message?: string;
  remainingMinutes: number;
}

// Active voice sessions tracking
const activeSessions = new Map<string, VoiceSessionState>();
let resetGeneration = 0;

/**
 * Start tracking a voice session
 */
export function startVoiceSession(sessionId: string, userId: string): void {
  activeSessions.set(sessionId, {
    sessionId,
    userId,
    startedAt: new Date(),
    durationMinutes: 0,
    status: 'ok',
    warningShown: false,
  });

  logger.info('Voice session started for cost tracking', { sessionId, userId });
}

/**
 * Update voice session duration and check caps
 */
export function updateVoiceDuration(sessionId: string, durationMinutes: number): VoiceCapCheck {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return {
      allowed: true,
      status: 'ok',
      remainingMinutes: VOICE_DURATION_LIMITS.HARD_CAP_MINUTES,
    };
  }

  session.durationMinutes = durationMinutes;
  const remaining = VOICE_DURATION_LIMITS.HARD_CAP_MINUTES - durationMinutes;

  // Hard cap exceeded - force switch to text
  if (durationMinutes >= VOICE_DURATION_LIMITS.HARD_CAP_MINUTES) {
    session.status = 'hard_cap';

    logger.warn('Voice hard cap exceeded - switching to text', {
      sessionId,
      userId: session.userId,
      durationMinutes,
    });

    return {
      allowed: false,
      status: 'hard_cap',
      message: `Limite voce raggiunto (${VOICE_DURATION_LIMITS.HARD_CAP_MINUTES} min). Continuiamo in chat testuale.`,
      remainingMinutes: 0,
    };
  }

  // Soft cap exceeded - show warning
  if (durationMinutes >= VOICE_DURATION_LIMITS.SOFT_CAP_MINUTES) {
    session.status = 'soft_cap';

    if (!session.warningShown) {
      session.warningShown = true;

      logger.info('Voice soft cap reached - warning user', {
        sessionId,
        userId: session.userId,
        durationMinutes,
        remainingMinutes: remaining,
      });

      return {
        allowed: true,
        status: 'soft_cap',
        message: `Hai usato ${durationMinutes} minuti di voce. Rimangono ${remaining} minuti prima del passaggio automatico a chat.`,
        remainingMinutes: remaining,
      };
    }
  }

  return {
    allowed: true,
    status: session.status,
    remainingMinutes: Math.max(0, remaining),
  };
}

/**
 * End voice session tracking
 */
export function endVoiceSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);

  if (session) {
    logger.info('Voice session ended', {
      sessionId,
      userId: session.userId,
      totalMinutes: session.durationMinutes,
      finalStatus: session.status,
    });
  }

  activeSessions.delete(sessionId);
}

/**
 * Check if voice is allowed (not disabled by spike protection)
 */
export function isVoiceAllowed(): { allowed: boolean; reason?: string } {
  return voicePolicyAllowance();
}

/**
 * Handle cost spike - temporarily disable voice
 */
export async function handleCostSpike(sessionCost: number): Promise<boolean> {
  const generation = resetGeneration;
  try {
    if (!Number.isFinite(sessionCost) || sessionCost < 0) {
      throw new TypeError('Voice session cost must be a non-negative finite number');
    }
    const isSpike = await detectCostSpike(sessionCost);
    if (!isSpike || generation !== resetGeneration) return false;
    stopVoiceForSpike(
      `Cost spike detected: €${sessionCost.toFixed(2)} exceeds P95 × ${THRESHOLDS.SPIKE_MULTIPLIER}`,
      VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS,
    );
    logger.warn('Voice locally disabled due to cost spike', { sessionCost });
    return true;
  } catch (error) {
    logger.error('Voice cost spike evaluation failed', undefined, error);
    throw error;
  }
}

/**
 * Get current voice session state
 */
export function getVoiceSessionState(sessionId: string): VoiceSessionState | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Get all active voice sessions (for admin dashboard)
 */
export function getActiveVoiceSessions(): VoiceSessionState[] {
  return Array.from(activeSessions.values());
}

/**
 * Get voice limits configuration (for UI)
 */
export function getVoiceLimits(): {
  softCapMinutes: number;
  hardCapMinutes: number;
  spikeCooldownMinutes: number;
} {
  return {
    softCapMinutes: VOICE_DURATION_LIMITS.SOFT_CAP_MINUTES,
    hardCapMinutes: VOICE_DURATION_LIMITS.HARD_CAP_MINUTES,
    spikeCooldownMinutes: VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS / 60000,
  };
}

/**
 * Reset state (for testing)
 */
export function _resetState(): void {
  resetGeneration++;
  activeSessions.clear();
  resetVoiceSpikePolicy();
}

// Export limits for external use
export { VOICE_DURATION_LIMITS };
