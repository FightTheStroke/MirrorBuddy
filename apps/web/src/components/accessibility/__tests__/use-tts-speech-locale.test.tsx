/**
 * useTTS — active content language regression (A11Y-1).
 * @vitest-environment jsdom
 *
 * The shared TTS hook used by home, the Maestro session and the chat adapters
 * hardcoded `it-IT` and preferred an Italian voice, so non-Italian students had
 * their text read with Italian pronunciation. These tests exercise the REAL
 * hook (no `@/components/accessibility` mock) against a stubbed
 * SpeechSynthesis and assert the requested utterance language, the voice
 * selection and the honest no-voice fallback.
 *
 * Scope note: SpeechSynthesis is stubbed, so these tests prove what we REQUEST
 * from the speech engine, never the audio a real engine produces.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAccessibilityStore, defaultAccessibilitySettings } from '@/lib/accessibility';
import { useTTS } from '../accessibility-provider';

let currentLocale = 'it';

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string) => key,
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
const cancel = vi.fn();
const speakSpy = vi.fn((utterance: StubUtterance) => {
  spoken.push(utterance);
});
let availableVoices: StubVoice[] = [];

class StubSpeechSynthesisUtterance implements StubUtterance {
  lang = '';
  rate = 1;
  voice: StubVoice | null = null;
  constructor(public text: string) {}
}

function enableTTS(speed = 1.0) {
  useAccessibilityStore.setState({
    currentContext: 'student',
    settings: { ...defaultAccessibilitySettings, ttsEnabled: true, ttsSpeed: speed },
  });
}

describe('useTTS speech language', () => {
  beforeEach(() => {
    spoken.length = 0;
    cancel.mockClear();
    speakSpy.mockClear();
    availableVoices = [];
    currentLocale = 'it';
    vi.stubGlobal('SpeechSynthesisUtterance', StubSpeechSynthesisUtterance);
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => availableVoices,
      cancel,
      speak: speakSpy,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => availableVoices, cancel, speak: speakSpy },
    });
    enableTTS();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useAccessibilityStore.setState({
      currentContext: 'student',
      settings: { ...defaultAccessibilitySettings },
    });
  });

  it('requests the active locale language and a matching voice (French)', () => {
    currentLocale = 'fr';
    availableVoices = [
      { lang: 'it-IT', name: 'Alice', default: true },
      { lang: 'fr-FR', name: 'Thomas' },
    ];

    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('Bonjour la classe'));

    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe('fr-FR');
    expect(spoken[0].voice?.name).toBe('Thomas');
  });

  it('never falls back to an Italian voice for non-Italian content', () => {
    currentLocale = 'de';
    availableVoices = [
      { lang: 'it-IT', name: 'Alice', default: true },
      { lang: 'en-US', name: 'Samantha' },
    ];

    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('Guten Morgen'));

    expect(spoken[0].lang).toBe('de-DE');
    expect(spoken[0].voice).toBeNull();
  });

  it('keeps Italian behaviour for the default locale', () => {
    currentLocale = 'it';
    availableVoices = [
      { lang: 'en-US', name: 'Samantha' },
      { lang: 'it-IT', name: 'Alice' },
    ];

    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('Ciao classe'));

    expect(spoken[0].lang).toBe('it-IT');
    expect(spoken[0].voice?.name).toBe('Alice');
  });

  it('still speaks when voices load asynchronously, and uses them once available', () => {
    currentLocale = 'es';
    availableVoices = [];

    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('Hola'));

    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe('es-ES');
    expect(spoken[0].voice).toBeNull();

    availableVoices = [{ lang: 'es-ES', name: 'Monica' }];
    act(() => result.current.speak('Hola otra vez'));

    expect(spoken).toHaveLength(2);
    expect(spoken[1].voice?.name).toBe('Monica');
  });

  it('preserves speed, cancels ongoing speech and honours the disabled setting', () => {
    currentLocale = 'en';
    enableTTS(1.4);

    const { result, rerender } = renderHook(() => useTTS());
    act(() => result.current.speak('Hello'));

    expect(spoken[0].rate).toBe(1.4);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(
      speakSpy.mock.invocationCallOrder[0] as number,
    );

    act(() => {
      useAccessibilityStore.setState({
        settings: { ...defaultAccessibilitySettings, ttsEnabled: false },
      });
    });
    rerender();
    act(() => result.current.speak('Ignored'));

    expect(spoken).toHaveLength(1);
    expect(result.current.enabled).toBe(false);
  });

  it('ignores empty or non-string input instead of speaking silence', () => {
    const { result } = renderHook(() => useTTS());
    act(() => {
      result.current.speak('');
      result.current.speak('   ');
      result.current.speak(null as unknown as string);
      result.current.speak(undefined as unknown as string);
    });

    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('does not throw when the speech engine is unavailable', () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });

    const { result } = renderHook(() => useTTS());
    expect(() => {
      act(() => {
        result.current.speak('Ciao');
        result.current.stop();
      });
    }).not.toThrow();
  });
});
