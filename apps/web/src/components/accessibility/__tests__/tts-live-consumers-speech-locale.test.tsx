/**
 * Live TTS consumers speak the active content language (A11Y-1).
 * @vitest-environment jsdom
 *
 * The audit fix lives in the shared `useTTS` hook, so it only matters if the
 * surfaces students actually use go through it. These tests render the REAL
 * home intent chooser and the REAL Maestro handoff banner with the REAL hook
 * (only SpeechSynthesis and next-intl are stubbed) and assert that a French
 * session requests French speech and refuses an Italian voice substitute.
 *
 * Scope note: SpeechSynthesis is stubbed; this proves the requested language
 * and voice, not the audio a real speech engine produces.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useAccessibilityStore, defaultAccessibilitySettings } from '@/lib/accessibility';
import { MaestroSessionHandoff } from '@/components/maestros/maestro-session-handoff';
import { HomeIntentChooser } from '@/app/[locale]/home-intent-chooser';

let currentLocale = 'fr';

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
}));

vi.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <section {...props}>{children}</section>
    ),
  },
}));

vi.mock('@/hooks/useTierFeatures', () => ({
  useTierFeatures: () => ({
    hasFeature: () => true,
    isLoading: false,
    tier: 'pro',
    features: {},
    isSimulated: false,
  }),
}));

interface StubVoice {
  lang: string;
  name: string;
  default?: boolean;
}

interface StubUtterance {
  text: string;
  lang: string;
  rate: number;
  voice: StubVoice | null;
}

const spoken: StubUtterance[] = [];
let availableVoices: StubVoice[] = [];

class StubSpeechSynthesisUtterance implements StubUtterance {
  lang = '';
  rate = 1;
  voice: StubVoice | null = null;
  constructor(public text: string) {}
}

beforeEach(() => {
  spoken.length = 0;
  currentLocale = 'fr';
  availableVoices = [
    { lang: 'it-IT', name: 'Alice', default: true },
    { lang: 'fr-FR', name: 'Thomas' },
  ];
  vi.stubGlobal('SpeechSynthesisUtterance', StubSpeechSynthesisUtterance);
  const synth = {
    getVoices: () => availableVoices,
    cancel: vi.fn(),
    speak: (utterance: StubUtterance) => spoken.push(utterance),
  };
  vi.stubGlobal('speechSynthesis', synth);
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  useAccessibilityStore.setState({
    currentContext: 'student',
    settings: { ...defaultAccessibilitySettings, ttsEnabled: true },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useAccessibilityStore.setState({
    currentContext: 'student',
    settings: { ...defaultAccessibilitySettings },
  });
});

describe('Maestro handoff banner (live consumer)', () => {
  it('reads the banner in the active locale, not in Italian', () => {
    render(
      <MaestroSessionHandoff maestroName="Galileo" intent="homework" hasContextMessage={false} />,
    );

    fireEvent.click(screen.getByTestId('maestro-session-handoff-tts'));

    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe('fr-FR');
    expect(spoken[0].voice?.name).toBe('Thomas');
  });

  it('leaves the voice unset rather than reading French text with an Italian voice', () => {
    availableVoices = [{ lang: 'it-IT', name: 'Alice', default: true }];

    render(
      <MaestroSessionHandoff maestroName="Galileo" intent="study" hasContextMessage={false} />,
    );
    fireEvent.click(screen.getByTestId('maestro-session-handoff-tts'));

    expect(spoken[0].lang).toBe('fr-FR');
    expect(spoken[0].voice).toBeNull();
  });
});

describe('Home intent chooser (live consumer)', () => {
  it('reads an intent card in the active locale', () => {
    currentLocale = 'de';
    availableVoices = [
      { lang: 'it-IT', name: 'Alice', default: true },
      { lang: 'de-DE', name: 'Anna' },
    ];

    render(<HomeIntentChooser onStart={vi.fn()} />);

    const listenButtons = screen.getAllByTestId(/^tts-intent-/);
    expect(listenButtons.length).toBeGreaterThan(0);
    fireEvent.click(listenButtons[0]);

    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe('de-DE');
    expect(spoken[0].voice?.name).toBe('Anna');
  });
});
