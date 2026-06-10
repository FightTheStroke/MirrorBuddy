/**
 * MIRRORBUDDY - MotionConfigBridge Tests
 *
 * A11Y-01: framer-motion animates via JS, so the CSS prefers-reduced-motion
 * rule cannot stop it. The bridge must force MotionConfig to "always" when a
 * DSA profile sets reducedMotion, and fall back to "user" (OS media query)
 * otherwise.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Capture the reducedMotion prop passed to framer-motion's MotionConfig.
const motionConfigSpy = vi.fn();
vi.mock('framer-motion', () => ({
  MotionConfig: ({
    reducedMotion,
    children,
  }: {
    reducedMotion: string;
    children: React.ReactNode;
  }) => {
    motionConfigSpy(reducedMotion);
    return <>{children}</>;
  },
}));

// Mock the accessibility store so the selector reads our controlled value.
let activeReducedMotion = false;
vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: (
    selector: (state: { getActiveSettings: () => { reducedMotion: boolean } }) => unknown,
  ) =>
    selector({
      getActiveSettings: () => ({ reducedMotion: activeReducedMotion }),
    }),
}));

import { MotionConfigBridge } from '../motion-config-bridge';

describe('MotionConfigBridge', () => {
  beforeEach(() => {
    motionConfigSpy.mockClear();
  });

  it('forces reducedMotion="always" when the active profile enables it', () => {
    activeReducedMotion = true;
    render(
      <MotionConfigBridge>
        <span>child</span>
      </MotionConfigBridge>,
    );
    expect(motionConfigSpy).toHaveBeenCalledWith('always');
  });

  it('falls back to reducedMotion="user" when the flag is off', () => {
    activeReducedMotion = false;
    render(
      <MotionConfigBridge>
        <span>child</span>
      </MotionConfigBridge>,
    );
    expect(motionConfigSpy).toHaveBeenCalledWith('user');
  });

  it('renders its children', () => {
    activeReducedMotion = false;
    const { getByText } = render(
      <MotionConfigBridge>
        <span>visible child</span>
      </MotionConfigBridge>,
    );
    expect(getByText('visible child')).toBeTruthy();
  });
});
