/**
 * @fileoverview The GA Realtime protocol rejects `transcription.prompt`.
 *
 * Production returned, on every voice session:
 *   invalid_request_error / invalid_value
 *   "The 'prompt' parameter is not supported for this model."
 *   param: session.audio.input.transcription.prompt
 *
 * The student saw "Qualcosa non ha funzionato con la voce" and no audio was
 * ever produced. The restriction belongs to the GA protocol itself, not to a
 * particular transcription model, so the prompt has to be dropped whenever the
 * GA session shape is used. The preview protocol still accepts it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSendSessionConfig } from '../session-config';
import { useSettingsStore } from '@/lib/stores';
import type { Maestro } from '@/types';

const flagState: Record<string, boolean> = {
  voice_ga_protocol: true,
  voice_realtime_whisper_transcription: false,
};

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: {
    getState: () => ({ activeProfile: null, settings: { adaptiveVadEnabled: false } }),
  },
}));

vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: (flag: string) => ({ enabled: flagState[flag] ?? false }),
}));

vi.mock('../memory-utils', () => ({
  fetchConversationMemory: vi.fn(() => Promise.resolve([])),
  buildMemoryContext: vi.fn(() => ''),
}));

vi.mock('../voice-prompt-builder', () => ({ buildVoicePrompt: vi.fn(() => 'test prompt') }));
vi.mock('@/lib/safety', () => ({ injectSafetyGuardrails: vi.fn((prompt) => prompt) }));
vi.mock('@/lib/voice', () => ({ VOICE_TOOLS: [], TOOL_USAGE_INSTRUCTIONS: 'test instructions' }));

interface TranscriptionConfig {
  model: string;
  language?: string;
  prompt?: string;
}

interface SessionUpdate {
  type: string;
  session: {
    audio?: { input: { transcription: TranscriptionConfig } };
    input_audio_transcription?: TranscriptionConfig;
  };
}

const maestro = {
  id: 'test-maestro',
  name: 'Test Maestro',
  displayName: 'Test Maestro',
  subject: 'mathematics',
  avatar: '/test-avatar.png',
  color: '#000000',
  voice: 'alloy',
  systemPrompt: 'test prompt',
  voiceInstructions: 'test voice instructions',
} as Maestro;

describe('GA Realtime rejects transcription.prompt', () => {
  let messages: SessionUpdate[];
  let dataChannel: RTCDataChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    messages = [];
    flagState.voice_ga_protocol = true;
    flagState.voice_realtime_whisper_transcription = false;
    useSettingsStore.setState({
      appearance: { language: 'it', theme: 'system', accentColor: 'blue' },
    });
    dataChannel = {
      readyState: 'open',
      send: vi.fn((data: string) => {
        messages.push(JSON.parse(data) as SessionUpdate);
      }),
    } as unknown as RTCDataChannel;
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ instruction: '' }) } as Response),
    ) as typeof fetch;
  });

  async function sendConfig(): Promise<SessionUpdate> {
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
    const update = messages.find((message) => message.type === 'session.update');
    expect(update).toBeDefined();
    return update as SessionUpdate;
  }

  it('omits the prompt on GA with the whisper-1 transcription model', async () => {
    const transcription = (await sendConfig()).session.audio!.input.transcription;

    expect(transcription.model).toBe('whisper-1');
    expect('prompt' in transcription).toBe(false);
  });

  it('omits the prompt on GA with the realtime whisper deployment', async () => {
    flagState.voice_realtime_whisper_transcription = true;

    const transcription = (await sendConfig()).session.audio!.input.transcription;

    expect(transcription.model).toBe('gpt-realtime-whisper');
    expect('prompt' in transcription).toBe(false);
  });

  it('keeps the spoken language on GA so captions stay in the student locale', async () => {
    useSettingsStore.setState({
      appearance: { language: 'en', theme: 'system', accentColor: 'blue' },
    });

    const transcription = (await sendConfig()).session.audio!.input.transcription;

    expect(transcription.language).toBe('en');
    expect('prompt' in transcription).toBe(false);
  });

  it('still sends the prompt on the preview protocol, which accepts it', async () => {
    flagState.voice_ga_protocol = false;

    const transcription = (await sendConfig()).session.input_audio_transcription!;

    expect(transcription.prompt).toBeDefined();
    expect(transcription.prompt!.length).toBeGreaterThan(0);
  });
});
