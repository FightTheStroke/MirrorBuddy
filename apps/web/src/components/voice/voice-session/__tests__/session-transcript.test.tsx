// ============================================================================
// SESSION TRANSCRIPT - TESTS
// T2.11: voice-session transcript panel must announce new entries via
// aria-live so Deaf/hard-of-hearing and screen-reader users relying on the
// transcript as their PRIMARY channel are notified when content arrives.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionTranscript } from '../session-transcript';
import type { Maestro } from '@/types';

// next-intl is globally mocked in src/test/setup.ts to resolve real Italian
// (reference locale) strings regardless of provider props (ADR 0080), so
// assertions below use the actual it/voice.json value for `transcriptLog`.
const TRANSCRIPT_LOG_LABEL = 'Trascrizione della conversazione';

const mockMaestro = {
  id: 'dante',
  displayName: 'Dante Alighieri',
  avatar: '/avatars/dante.webp',
  color: '#8B4513',
  greeting: 'Ready when you are.',
} as unknown as Maestro;

describe('SessionTranscript', () => {
  it('renders a live region so screen readers announce new entries', () => {
    const { container } = render(<SessionTranscript maestro={mockMaestro} transcript={[]} />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('role', 'log');
  });

  it('gives the live region an accessible label via i18n', () => {
    render(<SessionTranscript maestro={mockMaestro} transcript={[]} />);

    expect(screen.getByRole('log', { name: TRANSCRIPT_LOG_LABEL })).toBeInTheDocument();
  });

  it('keeps the live region mounted even when empty (greeting-only state)', () => {
    // A live region must exist BEFORE content is inserted, otherwise the
    // first announcement is missed. Verify it isn't conditionally rendered
    // away when transcript is empty.
    const { container } = render(<SessionTranscript maestro={mockMaestro} transcript={[]} />);

    expect(screen.getByText('Ready when you are.')).toBeInTheDocument();
    expect(container.querySelector('[role="log"]')).toBeInTheDocument();
  });

  it('renders both user and assistant transcript entries inside the live region', () => {
    render(
      <SessionTranscript
        maestro={mockMaestro}
        transcript={[
          { role: 'user', content: 'What is Inferno about?' },
          { role: 'assistant', content: 'Inferno is the first part of the Divine Comedy.' },
        ]}
      />,
    );

    const log = screen.getByRole('log');
    expect(log).toHaveTextContent('What is Inferno about?');
    expect(log).toHaveTextContent('Inferno is the first part of the Divine Comedy.');
  });
});
