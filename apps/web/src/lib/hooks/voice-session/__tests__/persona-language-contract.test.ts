import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { maestri } from '@/data/maestri';
import { useSettingsStore } from '@/lib/stores';
import { useAccessibilityStore } from '@/lib/accessibility';
import { injectSafetyGuardrails } from '@/lib/safety';
import { useSendSessionConfig } from '../session-config';
import { buildVoicePrompt } from '../voice-prompt-builder';

const locales = ['it', 'en', 'fr', 'de', 'es'] as const;
const names = {
  it: 'Italian (Italiano)',
  en: 'English',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  es: 'Spanish (Español)',
};
const targetBySubject: Record<string, string> = {
  english: 'en',
  french: 'fr',
  german: 'de',
  spanish: 'es',
};
const originalAppearance = useSettingsStore.getState().appearance;
interface SessionUpdate {
  type: string;
  session: {
    type: string;
    instructions: string;
    tools: unknown[];
    audio: {
      output: { voice: string };
      input: { transcription: { language?: string; prompt: string } };
    };
  };
}
function channel(send: (data: string) => void): RTCDataChannel {
  return Object.assign(new EventTarget(), {
    binaryType: 'arraybuffer' as BinaryType,
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    id: 1,
    label: 'test-only',
    maxPacketLifeTime: null,
    maxRetransmits: null,
    negotiated: false,
    ordered: true,
    protocol: '',
    readyState: 'open' as RTCDataChannelState,
    onbufferedamountlow: null,
    onclose: null,
    onclosing: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    close: vi.fn(),
    send: (data: string | Blob | ArrayBuffer | ArrayBufferView) => {
      if (typeof data !== 'string') throw new Error('Session configuration must be JSON text');
      send(data);
    },
  });
}
beforeEach(() => {
  // Only the optional HTTP context boundary is substituted; all builders/stores are real.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('unavailable', { status: 503 })),
  );
});
afterEach(() => {
  useSettingsStore.setState({ appearance: originalAppearance });
  vi.unstubAllGlobals();
});
describe('actual persona/session builders, not live conversations', () => {
  it('covers the actual 32 unique production personas in all five locales', () => {
    expect(maestri).toHaveLength(32);
    expect(new Set(maestri.map((m) => m.id)).size).toBe(32);
  });
  it.each(
    maestri.flatMap((maestro) => locales.map((locale) => ({ id: maestro.id, maestro, locale }))),
  )(
    '$id / $locale builds the actual identity, safety, language and transcription config',
    async ({ maestro, locale }) => {
      useSettingsStore.setState({ appearance: { ...originalAppearance, language: locale } });
      const sent: SessionUpdate[] = [];
      const { result } = renderHook(() =>
        useSendSessionConfig(
          { current: maestro },
          vi.fn(),
          vi.fn(),
          vi.fn(),
          {},
          { current: channel((data) => sent.push(JSON.parse(data))) },
          { current: null },
          { current: false },
        ),
      );
      await act(async () => {
        await result.current();
      });
      expect(sent).toHaveLength(1);
      const config = sent[0];
      expect(config.type).toBe('session.update');
      expect(config.session.type).toBe('realtime');
      expect(config.session.instructions).toContain(`You ARE ${maestro.name}`);
      const sourceIdentity = maestro.systemPrompt
        .split('\n')
        .find((line) => /^(You are|Sei |Tu sei )/i.test(line.trim()));
      expect(sourceIdentity).toBeDefined();
      expect(buildVoicePrompt(maestro, true)).toContain(sourceIdentity);
      expect(config.session.instructions).toContain(sourceIdentity);
      expect(config.session.instructions).toContain(
        injectSafetyGuardrails(buildVoicePrompt(maestro, true), {
          role: 'maestro',
          characterId: maestro.id,
        }),
      );
      expect(config.session.instructions).toContain(maestro.voiceInstructions);
      expect(config.session.tools.length).toBeGreaterThan(0);
      expect(config.session.audio.output.voice).toBe(
        useAccessibilityStore.getState().settings.voicePreference || maestro.voice || 'alloy',
      );
      const target = targetBySubject[maestro.subject];
      const bilingual = target && target !== locale;
      const language = config.session.instructions.split('# CHARACTER IMMERSION')[0];
      const transcription = config.session.audio.input.transcription;
      if (bilingual) {
        expect(language).toContain(`ALWAYS in ${names[locale].toUpperCase()}`);
        if (locale !== 'it') {
          expect(language).toContain(`${names[locale]}-speaking student`);
          expect(language).not.toContain('to an Italian student');
        }
        expect(transcription.language).toBeUndefined();
      } else {
        expect(language).toContain(`YOU MUST SPEAK ONLY IN ${names[locale].toUpperCase()}`);
        expect((language.match(/^- NO [A-Z].*$/gm) ?? []).join('\n')).not.toContain(
          names[locale].split(' ')[0],
        );
        expect(transcription.language).toBe(locale);
      }
      const hints = {
        it: 'matematica',
        en: 'math',
        fr: 'mathématiques',
        de: 'Mathematik',
        es: 'matemáticas',
      };
      expect(transcription.prompt).toContain(hints[locale]);
      expect(config.session.instructions).not.toContain('undefined');
    },
  );
});
