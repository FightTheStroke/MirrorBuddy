/**
 * @fileoverview GA Realtime forbids transcription.prompt with gpt-realtime-whisper.
 * Source: https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/accept
 * "Prompt is not supported with gpt-realtime-whisper in GA Realtime sessions."
 * Azure follows the OpenAI spec except that the transcription model accepts a
 * deployment alias (MS Learn realtime-audio-reference). Sending it returns
 * invalid_value on session.audio.input.transcription.prompt and no audio is produced.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSendSessionConfig } from '../session-config';
import { useSettingsStore } from '@/lib/stores';
import type { Maestro } from '@/types';

const flagState = { voice_ga_protocol: true, voice_realtime_whisper_transcription: true };

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: {
    getState: () => ({ activeProfile: null, settings: { adaptiveVadEnabled: false } }),
  },
}));
vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: (id: string) => ({
    enabled: flagState[id as keyof typeof flagState] ?? false,
  }),
}));
vi.mock('../memory-utils', () => ({
  fetchConversationMemory: vi.fn(() => Promise.resolve([])),
  buildMemoryContext: vi.fn(() => ''),
}));
vi.mock('../voice-prompt-builder', () => ({ buildVoicePrompt: vi.fn(() => 'persona prompt') }));
vi.mock('@/lib/safety', () => ({ injectSafetyGuardrails: vi.fn((prompt: string) => prompt) }));
vi.mock('@/lib/voice', () => ({
  VOICE_TOOLS: [{ name: 'tool_one' }],
  TOOL_USAGE_INSTRUCTIONS: 'tool instructions',
}));

const baseMaestro = {
  id: 'euclide',
  name: 'Euclide',
  displayName: 'Euclide',
  subject: 'mathematics',
  avatar: '/a.png',
  color: '#000000',
  voice: 'echo',
  systemPrompt: 'system prompt',
  voiceInstructions: 'voice instructions',
} as Maestro;

const languageTeacher = { ...baseMaestro, id: 'shakespeare', subject: 'english' } as Maestro;

describe('GA transcription prompt restriction', () => {
  let messages: Record<string, never>[];
  let dataChannel: RTCDataChannel;
  const originalAlias = process.env.NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT;

  beforeEach(() => {
    vi.clearAllMocks();
    messages = [];
    flagState.voice_ga_protocol = true;
    flagState.voice_realtime_whisper_transcription = true;
    dataChannel = {
      readyState: 'open',
      send: vi.fn((data: string) => messages.push(JSON.parse(data))),
    } as unknown as RTCDataChannel;
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ instruction: '' }) } as Response),
    ) as typeof fetch;
  });

  afterEach(() => {
    if (originalAlias === undefined)
      delete process.env.NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT;
    else process.env.NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT = originalAlias;
  });

  async function sendConfig(maestro: Maestro, locale: 'it' | 'en' | 'es' | 'fr' | 'de' = 'it') {
    useSettingsStore.setState({
      appearance: { language: locale, theme: 'system', accentColor: 'blue' },
    });
    const { result } = renderHook(() =>
      useSendSessionConfig(
        { current: maestro },
        vi.fn(),
        vi.fn(),
        vi.fn(),
        { onStateChange: vi.fn() },
        { current: dataChannel },
        { current: null },
        { current: false },
      ),
    );
    await result.current();
    const update = messages.find((m) => (m as { type?: string }).type === 'session.update');
    expect(update).toBeDefined();
    return update as unknown as {
      session: {
        instructions: string;
        tools: unknown[];
        audio?: {
          output: { voice: string };
          input: {
            noise_reduction: { type: string };
            transcription: { model: string; language?: string; prompt?: string };
            turn_detection: { type: string; interrupt_response: boolean };
          };
        };
        input_audio_transcription?: { model: string; language?: string; prompt?: string };
        voice?: string;
      };
    };
  }

  it('omits transcription.prompt on GA with the realtime whisper flag', async () => {
    const config = await sendConfig(baseMaestro);
    const transcription = config.session.audio!.input.transcription;
    expect(transcription.prompt).toBeUndefined();
    expect('prompt' in transcription).toBe(false);
    expect(transcription.model).toBe('gpt-realtime-whisper');
  });

  it('omits the prompt for a custom deployment alias selected by the flag', async () => {
    process.env.NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT = 'my-whisper-alias';
    const config = await sendConfig(baseMaestro);
    const transcription = config.session.audio!.input.transcription;
    expect(transcription.model).toBe('my-whisper-alias');
    expect(transcription.prompt).toBeUndefined();
  });

  it.each(['it', 'en', 'es', 'fr', 'de'] as const)(
    'keeps the %s transcription language while dropping the prompt',
    async (locale) => {
      const config = await sendConfig(baseMaestro, locale);
      const transcription = config.session.audio!.input.transcription;
      expect(transcription.language).toBe(locale);
      expect(transcription.prompt).toBeUndefined();
    },
  );

  it('keeps bilingual autodetection: no forced language and no prompt', async () => {
    const config = await sendConfig(languageTeacher, 'it');
    const transcription = config.session.audio!.input.transcription;
    expect(transcription.language).toBeUndefined();
    expect(transcription.prompt).toBeUndefined();
  });

  it('keeps the language for a same-language teacher', async () => {
    const config = await sendConfig(languageTeacher, 'en');
    const transcription = config.session.audio!.input.transcription;
    expect(transcription.language).toBe('en');
    expect(transcription.prompt).toBeUndefined();
  });

  it('keeps the legacy whisper-1 prompt when the flag is off', async () => {
    flagState.voice_realtime_whisper_transcription = false;
    const config = await sendConfig(baseMaestro);
    const transcription = config.session.audio!.input.transcription;
    expect(transcription.model).toBe('whisper-1');
    expect(transcription.prompt).toBeDefined();
    expect(transcription.prompt!.length).toBeGreaterThan(0);
  });

  it('keeps the legacy bilingual prompt when the flag is off', async () => {
    flagState.voice_realtime_whisper_transcription = false;
    const config = await sendConfig(languageTeacher, 'it');
    const transcription = config.session.audio!.input.transcription;
    expect(transcription.prompt).toBeDefined();
    expect(transcription.language).toBeUndefined();
  });

  it('leaves preview protocol behaviour unchanged', async () => {
    flagState.voice_ga_protocol = false;
    const config = await sendConfig(baseMaestro);
    const transcription = config.session.input_audio_transcription!;
    expect(config.session.audio).toBeUndefined();
    expect(config.session.voice).toBe('echo');
    expect(transcription.model).toBe('gpt-realtime-whisper');
    expect(transcription.prompt).toBeDefined();
    expect(transcription.language).toBe('it');
  });

  it('leaves every unrelated session field untouched', async () => {
    const config = await sendConfig(baseMaestro);
    const input = config.session.audio!.input;
    expect(config.session.instructions).toContain('persona prompt');
    expect(config.session.instructions).toContain('voice instructions');
    expect(config.session.instructions).toContain('tool instructions');
    expect(config.session.tools).toEqual([{ name: 'tool_one' }]);
    expect(config.session.audio!.output.voice).toBe('echo');
    expect(input.noise_reduction.type).toBeDefined();
    expect(input.turn_detection.type).toBe('server_vad');
    expect(input.turn_detection.interrupt_response).toBe(true);
  });
});
