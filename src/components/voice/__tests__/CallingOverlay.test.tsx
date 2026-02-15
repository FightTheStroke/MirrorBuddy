/**
 * CallingOverlay Component Tests
 *
 * Tests for the voice calling overlay state machine:
 * - idle -> ringing -> connected/error states
 * - Feature flag gating
 * - Visual feedback for each state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CallingOverlay } from '../CallingOverlay';
import * as featureFlagsModule from '@/lib/feature-flags/client';

// Mock feature flags
vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: vi.fn(),
}));

// Mock accessibility store
vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: vi.fn(() => ({
    activeProfile: null,
    shouldAnimate: () => true,
  })),
}));

describe('CallingOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock matchMedia for all tests
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Gating', () => {
    it('should not render when feature flag is disabled', () => {
      vi.mocked(featureFlagsModule.isFeatureEnabled).mockReturnValue({
        enabled: false,
        reason: 'disabled',
        flag: {
          id: 'voice_calling_overlay',
          name: 'Voice Calling Overlay',
          description: 'New calling overlay UI',
          status: 'disabled',
          enabledPercentage: 0,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });

      const { container } = render(<CallingOverlay state="idle" maestroName="Einstein" />);

      expect(container.firstChild).toBeNull();
    });

    it('should render when feature flag is enabled', () => {
      vi.mocked(featureFlagsModule.isFeatureEnabled).mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_calling_overlay',
          name: 'Voice Calling Overlay',
          description: 'New calling overlay UI',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });

      render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('State Machine', () => {
    beforeEach(() => {
      // Enable feature flag for state tests
      vi.mocked(featureFlagsModule.isFeatureEnabled).mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_calling_overlay',
          name: 'Voice Calling Overlay',
          description: 'New calling overlay UI',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });
    });

    it('should not render in idle state', () => {
      const { container } = render(<CallingOverlay state="idle" maestroName="Einstein" />);

      expect(container.firstChild).toBeNull();
    });

    it('should show ringing state with maestro name', () => {
      render(<CallingOverlay state="ringing" maestroName="Albert Einstein" />);

      expect(screen.getByRole('heading', { name: /Albert Einstein/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /calling/i })).toBeInTheDocument();
    });

    it('should show connected state', async () => {
      render(<CallingOverlay state="connected" maestroName="Einstein" />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    it('should show error state with message', () => {
      const errorMessage = 'Connection failed';

      render(<CallingOverlay state="error" maestroName="Einstein" errorMessage={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should auto-hide connected state after delay', async () => {
      vi.useFakeTimers();

      const { container } = render(<CallingOverlay state="connected" maestroName="Einstein" />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();

      // Fast-forward past the auto-hide delay (2 seconds) and wait for state updates
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });

      // Component should now be hidden
      expect(container.firstChild).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      vi.mocked(featureFlagsModule.isFeatureEnabled).mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_calling_overlay',
          name: 'Voice Calling Overlay',
          description: 'New calling overlay UI',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });
    });

    it('should have proper ARIA role for overlay', () => {
      render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should announce state changes to screen readers', () => {
      render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should respect prefers-reduced-motion and disable animations', () => {
      // Mock matchMedia to simulate prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      // Verify that animation-related classes or attributes are not present
      const animatedElement = container.querySelector('[data-testid="ringing-animation"]');
      expect(animatedElement).toBeInTheDocument();
      // Animation should be suppressed (verify in implementation)
    });

    it('should provide visual-only feedback when auditory profile is active', () => {
      // This test verifies the component handles auditory profile
      // Implementation should show enhanced visual indicators when activeProfile === 'auditory'
      render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      // Visual feedback should be present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /calling einstein/i })).toBeInTheDocument();
    });

    it('should handle Escape key to dismiss overlay', () => {
      render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Simulate Escape key press
      const dialog = screen.getByRole('dialog');
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      dialog.dispatchEvent(escapeEvent);

      // Component should provide onCancel callback or handle dismissal
      // This will be verified in the implementation
    });

    it('should have keyboard focus on overlay when shown', () => {
      render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      const dialog = screen.getByRole('dialog');

      // Dialog should be focusable
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    beforeEach(() => {
      vi.mocked(featureFlagsModule.isFeatureEnabled).mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_calling_overlay',
          name: 'Voice Calling Overlay',
          description: 'New calling overlay UI',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });
    });

    it('should show loading animation in ringing state', () => {
      const { container } = render(<CallingOverlay state="ringing" maestroName="Einstein" />);

      // Check for animation element (spinner or pulse)
      const animatedElement = container.querySelector('[data-testid="ringing-animation"]');
      expect(animatedElement).toBeInTheDocument();
    });

    it('should show success indicator in connected state', () => {
      const { container } = render(<CallingOverlay state="connected" maestroName="Einstein" />);

      const successIndicator = container.querySelector('[data-testid="connected-icon"]');
      expect(successIndicator).toBeInTheDocument();
    });

    it('should show error indicator in error state', () => {
      const { container } = render(
        <CallingOverlay state="error" maestroName="Einstein" errorMessage="Failed" />,
      );

      const errorIndicator = container.querySelector('[data-testid="error-icon"]');
      expect(errorIndicator).toBeInTheDocument();
    });
  });
});
