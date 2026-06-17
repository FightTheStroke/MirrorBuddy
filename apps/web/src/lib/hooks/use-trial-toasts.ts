'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from '@/components/ui/toast';
import { trackTrialChat, trackTrialLimitHit } from '@/lib/telemetry/trial-events';

interface TrialStatus {
  isTrialMode: boolean;
  isLoading: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
  visitorId?: string;
}

/**
 * ADR 0015 derogation (TD-05): the "welcome toast already shown" flag lives in
 * `sessionStorage`, not the DB or a Zustand store. This is intentional and the
 * lowest-risk option:
 * - ADR 0015 ("No localStorage") governs *durable user data* (settings,
 *   progress, conversations, materials) that must survive devices/sessions and
 *   has a server-side source of truth. This flag is the opposite: ephemeral,
 *   per-session, device-local UI state with zero durable value.
 * - We *want* it scoped to the session: the welcome toast should re-appear in a
 *   new tab/session. `sessionStorage` gives exactly that lifetime for free.
 * - A Zustand store would be worse here: in-memory state is wiped on a full
 *   page reload, so the toast would re-fire on every refresh within the same
 *   session. `sessionStorage` survives reloads but not new sessions — the
 *   precise semantics we need.
 * No persistence, no PII, no cross-device expectation → DB/REST round-trip
 * would add latency and complexity for no benefit.
 */
const SHOWN_KEY = 'mirrorbuddy-trial-toast-shown';

/**
 * Hook to show toast notifications for trial mode status.
 *
 * Shows:
 * - Welcome toast on first visit (with CTA to request access)
 * - Warning toast when 3 messages remaining
 * - Critical toast when 1 message remaining
 */
interface UseTrialToastsOptions {
  /**
   * When true (ADHD/autism distractionFreeMode, A11Y-05) the promotional trial
   * toasts are silenced — they are non-essential surfaces that interrupt the
   * learning flow. Usage counters still update elsewhere; only the pop-ups stop.
   */
  suppress?: boolean;
  /**
   * COMP-01: when true the toasts are child-safe — no commercial copy and no
   * solicitation directed at the (likely minor) student. The promo welcome
   * toast and the 3-left/1-left upsell toasts are dropped entirely; when the
   * trial runs out the child gets a plain "ask a grown-up" message with NO
   * action that navigates to the invite-request form (which collects PII).
   * GDPR/COPPA: commercial CTAs and data solicitation belong to the adult
   * surfaces only (parent area / "Per i grandi"). Telemetry is unchanged.
   */
  childSafe?: boolean;
}

export function useTrialToasts(trialStatus: TrialStatus, options: UseTrialToastsOptions = {}) {
  const router = useRouter();
  const t = useTranslations('auth');
  const previousRemaining = useRef<number | null>(null);
  const hasShownWelcome = useRef(false);
  const { suppress = false, childSafe = false } = options;

  useEffect(() => {
    if (trialStatus.isLoading || !trialStatus.isTrialMode || suppress) return;

    // Show welcome toast once per session (skipped in child-safe mode: it is a
    // promotional surface with a "request access" CTA — adult copy, COMP-01).
    if (!hasShownWelcome.current) {
      const shown = sessionStorage.getItem(SHOWN_KEY);
      if (!shown) {
        hasShownWelcome.current = true;
        sessionStorage.setItem(SHOWN_KEY, 'true');

        if (!childSafe) {
          toast.info(
            t('trialToastWelcomeTitle'),
            t('trialToastWelcomeBody', { max: trialStatus.maxChats }),
            {
              duration: 8000,
              action: {
                label: t('trialToastWelcomeAction'),
                onClick: () => router.push('/invite/request'),
              },
            },
          );
        }
      } else {
        hasShownWelcome.current = true;
      }
    }

    // Track remaining messages for threshold notifications
    const prev = previousRemaining.current;
    const curr = trialStatus.chatsRemaining;
    const visitorId = trialStatus.visitorId || 'unknown';

    if (prev !== null && prev !== curr) {
      // Track chat event (chat count increased)
      if (curr < prev) {
        trackTrialChat(visitorId, trialStatus.chatsUsed, curr);
      }

      // Just crossed 3 remaining threshold (child-safe: no upsell pressure)
      if (prev > 3 && curr === 3 && !childSafe) {
        toast.warning(t('trialToastWarnTitle'), t('trialToastWarnBody'), {
          duration: 6000,
          action: {
            label: t('trialToastWelcomeAction'),
            onClick: () => router.push('/invite/request'),
          },
        });
      }

      // Just crossed 1 remaining threshold (child-safe: no upsell pressure)
      if (prev > 1 && curr === 1 && !childSafe) {
        toast.warning(t('trialToastLastTitle'), t('trialToastLastBody'), {
          duration: 6000,
          action: {
            label: t('trialToastWelcomeAction'),
            onClick: () => router.push('/invite/request'),
          },
        });
      }

      // Messages exhausted
      if (prev > 0 && curr === 0) {
        // Track limit reached
        trackTrialLimitHit(visitorId, 'chat');

        if (childSafe) {
          // COMP-01: the child must understand WHY the chat stopped, but the
          // message is informative only — "ask a grown-up", no numbers, no
          // commercial action, no navigation to a form that collects PII.
          toast.info(t('trialToastChildDoneTitle'), t('trialToastChildDoneBody'), {
            duration: 10000,
          });
        } else {
          toast.error(t('trialToastDoneTitle'), t('trialToastDoneBody'), {
            duration: 10000,
            action: {
              label: t('trialToastWelcomeAction'),
              onClick: () => router.push('/invite/request'),
            },
          });
        }
      }
    }

    previousRemaining.current = curr;
  }, [trialStatus, router, t, suppress, childSafe]);
}
