/**
 * Tests for MaestroSessionHandoff (UX-01 + UX-07).
 *
 * The child-first handoff banner shown when a session is opened through an
 * intent. Verifies: identity is NOT masked (the Maestro name is shown), the
 * pre-filled-input hint appears only when a context message exists, the banner
 * is dismissible, and the TTS button only renders when the profile enables TTS.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaestroSessionHandoff } from '../maestro-session-handoff';

const speak = vi.fn();
let ttsEnabled = true;

vi.mock('@/components/accessibility', () => ({
  useTTS: () => ({ speak, stop: vi.fn(), enabled: ttsEnabled }),
}));

// Translation mock mirroring messages/it/chat.json `intentHandoff`.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const dict: Record<string, string> = {
      'intentHandoff.headline': `Ti ho portato dal Prof. ${values?.name} per ${values?.intent}.`,
      'intentHandoff.headlineSubject': `Ti ho portato dal Prof. ${values?.name} per ${values?.subject}.`,
      'intentHandoff.contextHint': 'CONTEXT_HINT_SENTINEL',
      'intentHandoff.intent.homework': 'i compiti',
      'intentHandoff.intent.study': 'studiare',
      'intentHandoff.intent.quizMe': 'metterti alla prova',
      'intentHandoff.listen': 'Ascolta il messaggio',
      'intentHandoff.dismiss': 'Ho capito, chiudi',
    };
    return dict[key] ?? key;
  },
}));

describe('MaestroSessionHandoff', () => {
  beforeEach(() => {
    speak.mockClear();
    ttsEnabled = true;
  });

  it('names the Maestro and the intent without masking identity', () => {
    render(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={false} />,
    );
    expect(screen.getByText(/Prof\. Galileo per i compiti/)).toBeInTheDocument();
  });

  it('uses the subject in the headline when one was chosen', () => {
    render(
      <MaestroSessionHandoff
        maestroName="Galileo"
        intent="study"
        subjectLabel="Matematica"
        hasContextMessage={false}
      />,
    );
    expect(screen.getByText(/Prof\. Galileo per Matematica/)).toBeInTheDocument();
  });

  it('shows the pre-filled-input hint only when a context message exists (UX-07)', () => {
    const { rerender } = render(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={false} />,
    );
    expect(screen.queryByText(/CONTEXT_HINT_SENTINEL/)).not.toBeInTheDocument();

    rerender(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={true} />,
    );
    expect(screen.getByText(/CONTEXT_HINT_SENTINEL/)).toBeInTheDocument();
  });

  it('is dismissible', async () => {
    const user = userEvent.setup();
    render(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={false} />,
    );
    expect(screen.getByTestId('maestro-session-handoff')).toBeInTheDocument();
    await user.click(screen.getByTestId('maestro-session-handoff-dismiss'));
    expect(screen.queryByTestId('maestro-session-handoff')).not.toBeInTheDocument();
  });

  it('reads the banner aloud when TTS is enabled', async () => {
    const user = userEvent.setup();
    render(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={true} />,
    );
    await user.click(screen.getByTestId('maestro-session-handoff-tts'));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toContain('Galileo');
  });

  it('hides the TTS button when the profile has TTS off', () => {
    ttsEnabled = false;
    render(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={false} />,
    );
    expect(screen.queryByTestId('maestro-session-handoff-tts')).not.toBeInTheDocument();
  });
});
