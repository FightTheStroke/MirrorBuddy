'use client';

import { MotionConfig } from 'framer-motion';
import { useAccessibilityStore } from '@/lib/accessibility';

/**
 * Bridges the accessibility store's `reducedMotion` flag and the OS
 * `prefers-reduced-motion` media query into framer-motion (A11Y-01).
 *
 * The CSS rule in globals.css zeroes out CSS animation/transition durations
 * for `prefers-reduced-motion`, but framer-motion animates via JS (rAF +
 * inline styles), which CSS cannot stop. Wrapping the tree in
 * <MotionConfig reducedMotion> makes every `motion.*` component honor the
 * preference:
 *   - "always": force-disable transform/layout animations (used when a DSA
 *     profile that sets reducedMotion is active, regardless of OS setting);
 *   - "user":  follow the OS `prefers-reduced-motion` media query.
 *
 * The active context (student vs parent) is respected via getActiveSettings,
 * so enabling a reduced-motion profile in either space stops home/banner/header
 * animations for that space.
 */
export function MotionConfigBridge({ children }: { children: React.ReactNode }) {
  const reducedMotion = useAccessibilityStore((state) => state.getActiveSettings().reducedMotion);

  return <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>{children}</MotionConfig>;
}
