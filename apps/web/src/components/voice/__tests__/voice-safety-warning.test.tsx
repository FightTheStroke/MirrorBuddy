// ============================================================================
// VOICE SAFETY WARNING - TESTS
// UI component for displaying safety intervention warnings during voice calls
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceSafetyWarning } from '../voice-safety-warning';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { NextIntlClientProvider } from 'next-intl';

const messages = {
  chat: {
    safety: {
      warningTitle: 'Attenzione',
      interventionDetected: 'Intervento di sicurezza attivato',
    },
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="it" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('VoiceSafetyWarning', () => {
  beforeEach(() => {
    useVoiceSessionStore.getState().reset();
  });

  it('should not render when no warning is present', () => {
    const { container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('should render warning banner when warning is set', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test safety warning');

    render(<VoiceSafetyWarning />, { wrapper: Wrapper });

    // Verify the warning message text is rendered
    expect(screen.getByText('Test safety warning')).toBeInTheDocument();
    // Verify the banner container is rendered
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should have aria-live="assertive" for screen readers', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test warning');

    const { container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });
    const liveRegion = container.querySelector('[aria-live="assertive"]');

    expect(liveRegion).toBeInTheDocument();
  });

  it('should have role="alert" for accessibility', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test warning');

    const { container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });
    const alert = container.querySelector('[role="alert"]');

    expect(alert).toBeInTheDocument();
  });

  it('should have proper contrast for visibility', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test warning');

    const { container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });
    const banner = container.querySelector('[data-testid="safety-warning-banner"]');

    expect(banner).toHaveClass('bg-amber-900/90');
    expect(banner).toHaveClass('text-amber-100');
  });

  it('should display warning icon', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test warning');

    const { container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });
    const icon = container.querySelector('svg');

    expect(icon).toBeInTheDocument();
  });

  it('should update when warning changes', () => {
    useVoiceSessionStore.getState().setSafetyWarning('First warning');
    const { rerender } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });

    expect(screen.getByText('First warning')).toBeInTheDocument();

    useVoiceSessionStore.getState().setSafetyWarning('Second warning');
    rerender(<VoiceSafetyWarning />);

    expect(screen.queryByText('First warning')).not.toBeInTheDocument();
    expect(screen.getByText('Second warning')).toBeInTheDocument();
  });

  it('should disappear when warning is cleared', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test warning');
    const { rerender, container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });

    expect(screen.getByText('Test warning')).toBeInTheDocument();

    useVoiceSessionStore.getState().clearSafetyWarning();
    rerender(<VoiceSafetyWarning />);

    expect(container.firstChild).toBeNull();
  });

  it('should be positioned to not obstruct controls', () => {
    useVoiceSessionStore.getState().setSafetyWarning('Test warning');

    const { container } = render(<VoiceSafetyWarning />, { wrapper: Wrapper });
    const banner = container.querySelector('[data-testid="safety-warning-banner"]');

    // Should be positioned at top, above controls
    expect(banner).toHaveClass('absolute');
    expect(banner).toHaveClass('top-4');
  });
});
