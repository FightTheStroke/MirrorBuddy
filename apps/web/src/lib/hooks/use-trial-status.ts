'use client';

import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { trackTrialStart } from '@/lib/telemetry/trial-events';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { refreshClientIdentity } from '@/lib/auth/client-auth';

interface TrialStatus {
  isTrialMode: boolean;
  isLoading: boolean;
  error: string | null;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
  voiceSecondsUsed: number;
  voiceSecondsRemaining: number;
  maxVoiceSeconds: number;
  toolsUsed: number;
  toolsRemaining: number;
  maxTools: number;
  visitorId?: string;
  email?: string | null;
  emailCollectedAt?: string | null;
  emailVerifiedAt?: string | null;
  verificationPending?: boolean;
}
const count = z.number().finite().nonnegative();
const sessionSchema = z.object({
  sessionId: z.string().min(1),
  chatsUsed: count,
  chatsRemaining: count,
  maxChats: count,
  voiceSecondsUsed: count,
  voiceSecondsRemaining: count,
  maxVoiceSeconds: count,
  toolsUsed: count,
  toolsRemaining: count,
  maxTools: count,
  email: z.string().nullable().optional(),
  emailCollectedAt: z.string().nullable().optional(),
  emailVerifiedAt: z.string().nullable().optional(),
  verificationPending: z.boolean().optional(),
});
const initial = (): TrialStatus => ({
  isTrialMode: false,
  isLoading: true,
  error: null,
  chatsUsed: 0,
  chatsRemaining: 0,
  maxChats: 0,
  voiceSecondsUsed: 0,
  voiceSecondsRemaining: 0,
  maxVoiceSeconds: 0,
  toolsUsed: 0,
  toolsRemaining: 0,
  maxTools: 0,
});

/** Credentialless authenticated accounts can be trial-tier, but are never anonymous identities. */
export function useTrialStatus() {
  const identity = useClientIdentity();
  const [status, setStatus] = useState<TrialStatus>(initial);
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (identity.status === 'pending' || identity.status === 'unavailable') return;
    async function checkStatus() {
      setStatus(initial());
      try {
        if (identity.status === 'authenticated') {
          const response = await fetch('/api/user/trial-status');
          if (!response.ok) throw new Error('TRIAL_STATUS_UNAVAILABLE');
          const data = z.object({ isTrialUser: z.boolean() }).parse(await response.json());
          if (!data.isTrialUser) {
            if (active) setStatus({ ...initial(), isLoading: false });
            return;
          }
        }
        if (!active) return;
        const response = await fetch('/api/trial/session');
        if (!response.ok) throw new Error('TRIAL_SESSION_UNAVAILABLE');
        const data = sessionSchema
          .or(z.object({ hasSession: z.literal(false) }))
          .parse(await response.json());
        if (!active) return;
        if ('hasSession' in data) {
          setStatus({ ...initial(), isLoading: false });
          return;
        }
        if (tracked.current !== data.sessionId) {
          trackTrialStart(data.sessionId);
          tracked.current = data.sessionId;
        }
        setStatus({
          ...data,
          visitorId: data.sessionId,
          isTrialMode: true,
          isLoading: false,
          error: null,
        });
      } catch {
        if (active)
          setStatus({ ...initial(), isLoading: false, error: 'TRIAL_STATUS_UNAVAILABLE' });
      }
    }
    void checkStatus();
    return () => {
      active = false;
    };
  }, [identity]);
  if (identity.status === 'pending' || identity.status === 'unavailable') {
    return {
      ...initial(),
      isLoading: identity.status === 'pending',
      error: identity.status === 'unavailable' ? identity.reason : null,
      refresh: refreshClientIdentity,
    };
  }
  return { ...status, refresh: refreshClientIdentity };
}
