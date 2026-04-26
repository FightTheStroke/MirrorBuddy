/**
 * CallingOverlay Component
 *
 * Voice connection state machine overlay with visual feedback:
 * - idle: No overlay shown
 * - ringing: Connecting animation with maestro name
 * - connected: Success indicator (auto-hides after 2s)
 * - error: Error message display
 *
 * Feature flag: voice_calling_overlay
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, CheckCircle2 } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/feature-flags/client';
import { useAccessibilityStore } from '@/lib/accessibility';

export type CallingState = 'idle' | 'ringing' | 'connected' | 'error';

export interface CallingOverlayProps {
  state: CallingState;
  maestroName: string;
  errorMessage?: string;
  onCancel?: () => void;
}

const AUTO_HIDE_DELAY_MS = 2000;

export function CallingOverlay({
  state,
  maestroName,
  errorMessage,
  onCancel,
}: CallingOverlayProps) {
  const [hiddenAfterConnect, setHiddenAfterConnect] = useState(false);

  // Check feature flag BEFORE any hooks to maintain consistent hook order
  const featureCheck = isFeatureEnabled('voice_calling_overlay');

  // Accessibility settings
  const { activeProfile, shouldAnimate } = useAccessibilityStore();
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const disableAnimations = prefersReducedMotion || !shouldAnimate();
  const isAuditoryProfile = activeProfile === 'auditory';

  // Derive visibility from state + auto-hide flag
  const shouldShow = state !== 'idle' && !hiddenAfterConnect;

  // Auto-hide connected state after delay
  useEffect(() => {
    if (state === 'connected') {
      const timer = setTimeout(() => {
        setHiddenAfterConnect(true);
      }, AUTO_HIDE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    // Reset hidden flag when state changes away from connected
    const frame = requestAnimationFrame(() => {
      setHiddenAfterConnect(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);

  // Keyboard navigation: Escape to cancel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state === 'ringing' && onCancel) {
        event.preventDefault();
        onCancel();
      }
    };

    if (shouldShow) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [shouldShow, state, onCancel]);

  // Don't render if feature is disabled, idle, or hidden
  if (!featureCheck.enabled || !shouldShow) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={disableAnimations ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={disableAnimations ? undefined : { opacity: 0 }}
        transition={disableAnimations ? { duration: 0 } : undefined}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        // eslint-disable-next-line local-rules/no-literal-strings-in-jsx -- behind voice_calling_overlay flag
        aria-label="Voice connection status"
      >
        <motion.div
          initial={disableAnimations ? undefined : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={disableAnimations ? undefined : { scale: 0.9, opacity: 0 }}
          transition={disableAnimations ? { duration: 0 } : undefined}
          className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 max-w-sm mx-4 border border-slate-700"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon based on state */}
            {state === 'ringing' && (
              <div data-testid="ringing-animation" className="relative">
                {!disableAnimations && (
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"
                  />
                )}
                <Phone
                  className={`w-16 h-16 relative z-10 ${
                    isAuditoryProfile ? 'text-blue-600' : 'text-blue-400'
                  }`}
                />
                {/* Enhanced visual indicator for auditory profile */}
                {isAuditoryProfile && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-blue-500 rounded-full" />
                )}
              </div>
            )}

            {state === 'connected' && (
              <div data-testid="connected-icon">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
              </div>
            )}

            {state === 'error' && (
              <div data-testid="error-icon">
                <PhoneOff className="w-16 h-16 text-red-400" />
              </div>
            )}

            {/* State text */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                {state === 'ringing' && `Calling ${maestroName}...`}
                {state === 'connected' && 'Connected'}
                {state === 'error' && 'Connection Failed'}
              </h2>

              {state === 'error' && errorMessage && (
                <p className="text-sm text-red-300">{errorMessage}</p>
              )}

              {state === 'ringing' && (
                <>
                  {/* eslint-disable-next-line local-rules/no-literal-strings-in-jsx */}
                  <p className="text-sm text-slate-400">Establishing voice connection</p>
                  {onCancel && (
                    // eslint-disable-next-line local-rules/no-literal-strings-in-jsx
                    <p className="text-xs text-slate-500 mt-2">Press Escape to cancel</p>
                  )}
                </>
              )}
            </div>

            {/* ARIA live region for screen reader announcements */}
            <div role="status" aria-live="polite" className="sr-only">
              {state === 'ringing' && `Calling ${maestroName}`}
              {state === 'connected' && 'Voice connection established'}
              {state === 'error' && `Connection failed: ${errorMessage || 'Unknown error'}`}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
