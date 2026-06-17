// ============================================================================
// PARENTAL GATE STORE (Issue #432)
// Ephemeral, in-memory only (NO persistence) — the unlock lasts for the
// current session/tab and resets on reload, as expected for a child-resistant
// gate. The PIN itself lives server-side (hashed); see pin-service.ts.
// ============================================================================

import { create } from 'zustand';
import { csrfFetch } from '@/lib/auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'stores/parental-gate' });

interface ParentalGateState {
  /** True once the adult area has been unlocked for this session. */
  isUnlocked: boolean;
  /** Whether a server-side PIN exists; null until the status is fetched. */
  isPinSet: boolean | null;
  /** True while a network request is in flight. */
  isLoading: boolean;

  fetchStatus: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
}

export const useParentalGateStore = create<ParentalGateState>((set) => ({
  isUnlocked: false,
  isPinSet: null,
  isLoading: false,

  fetchStatus: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/user/parental-pin');
      if (!res.ok) {
        // Unauthenticated / trial users: no PIN — math fallback applies.
        set({ isPinSet: false, isLoading: false });
        return;
      }
      const data = (await res.json()) as { isSet?: boolean };
      set({ isPinSet: Boolean(data?.isSet), isLoading: false });
    } catch (error) {
      log.error('Failed to fetch parental PIN status', { error: String(error) });
      set({ isPinSet: false, isLoading: false });
    }
  },

  verifyPin: async (pin: string) => {
    set({ isLoading: true });
    try {
      const res = await csrfFetch('/api/user/parental-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { valid?: boolean };
      const valid = res.ok && Boolean(data?.valid);
      set({ isUnlocked: valid, isLoading: false });
      return valid;
    } catch (error) {
      log.error('Failed to verify parental PIN', { error: String(error) });
      set({ isLoading: false });
      return false;
    }
  },

  setPin: async (pin: string) => {
    set({ isLoading: true });
    try {
      const res = await csrfFetch('/api/user/parental-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const ok = res.ok;
      set((state) => ({ isPinSet: ok ? true : state.isPinSet, isLoading: false }));
      return ok;
    } catch (error) {
      log.error('Failed to set parental PIN', { error: String(error) });
      set({ isLoading: false });
      return false;
    }
  },

  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));
