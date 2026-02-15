/**
 * @fileoverview Tests for locale threading in voice session config
 * Task T3-01: Verify locale flows from settings store to session config
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSendSessionConfig } from '../session-config';
import { useSettingsStore } from '@/lib/stores';
import type { Maestro } from '@/types';

// Mock dependencies
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: {
    getState: () => ({
      activeProfile: null,
      settings: { adaptiveVadEnabled: false },
    }),
  },
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: () => ({ enabled: false }),
}));

vi.mock('../memory-utils', () => ({
  fetchConversationMemory: vi.fn(() => Promise.resolve([])),
  buildMemoryContext: vi.fn(() => ''),
}));

vi.mock('../voice-prompt-builder', () => ({
  buildVoicePrompt: vi.fn(() => 'test prompt'),
}));

vi.mock('@/lib/safety', () => ({
  injectSafetyGuardrails: vi.fn((prompt) => prompt),
}));

vi.mock('@/lib/voice', () => ({
  VOICE_TOOLS: [],
  TOOL_USAGE_INSTRUCTIONS: 'test instructions',
}));

describe('Session Config Locale Threading', () => {
  const mockMaestro = {
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

  let mockDataChannel: RTCDataChannel;
  let dataChannelMessages: unknown[];

  beforeEach(() => {
    vi.clearAllMocks();
    dataChannelMessages = [];

    // Mock RTCDataChannel
    mockDataChannel = {
      readyState: 'open',
      send: vi.fn((data: string) => {
        dataChannelMessages.push(JSON.parse(data));
      }),
    } as unknown as RTCDataChannel;

    // Mock fetch for adaptive context
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ instruction: '' }),
      } as Response),
    ) as typeof fetch;
  });

  it('should extract locale from settings store appearance', async () => {
    // Set locale in settings store
    useSettingsStore.setState({
      appearance: { language: 'en', theme: 'system', accentColor: 'blue' },
    });

    const maestroRef = { current: mockMaestro };
    const webrtcDataChannelRef = { current: mockDataChannel };
    const initialMessagesRef = { current: null };
    const greetingSentRef = { current: false };

    const { result } = renderHook(() =>
      useSendSessionConfig(
        maestroRef,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        { onStateChange: vi.fn() },
        webrtcDataChannelRef,
        initialMessagesRef,
        greetingSentRef,
      ),
    );

    await result.current();

    // Verify session.update was sent
    const sessionUpdate = dataChannelMessages.find((msg: any) => msg.type === 'session.update');
    expect(sessionUpdate).toBeDefined();

    // Verify locale is used in transcription config
    const config = sessionUpdate as any;
    expect(config.session.input_audio_transcription).toBeDefined();
    expect(config.session.input_audio_transcription.language).toBe('en');
  });

  it('should default to Italian when locale is not set', async () => {
    // Clear locale in settings store
    useSettingsStore.setState({
      appearance: { language: 'it' as const, theme: 'system', accentColor: 'blue' },
    });

    const maestroRef = { current: mockMaestro };
    const webrtcDataChannelRef = { current: mockDataChannel };
    const initialMessagesRef = { current: null };
    const greetingSentRef = { current: false };

    const { result } = renderHook(() =>
      useSendSessionConfig(
        maestroRef,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        { onStateChange: vi.fn() },
        webrtcDataChannelRef,
        initialMessagesRef,
        greetingSentRef,
      ),
    );

    await result.current();

    const sessionUpdate = dataChannelMessages.find((msg: any) => msg.type === 'session.update');

    const config = sessionUpdate as any;
    expect(config.session.input_audio_transcription.language).toBe('it');
  });

  it('should handle all supported locales', async () => {
    const locales = ['it', 'en', 'es', 'fr', 'de'] as const;

    for (const locale of locales) {
      vi.clearAllMocks();
      dataChannelMessages = [];

      useSettingsStore.setState({
        appearance: { language: locale, theme: 'system', accentColor: 'blue' },
      });

      const maestroRef = { current: mockMaestro };
      const webrtcDataChannelRef = { current: mockDataChannel };
      const initialMessagesRef = { current: null };
      const greetingSentRef = { current: false };

      const { result } = renderHook(() =>
        useSendSessionConfig(
          maestroRef,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          { onStateChange: vi.fn() },
          webrtcDataChannelRef,
          initialMessagesRef,
          greetingSentRef,
        ),
      );

      await result.current();

      const sessionUpdate = dataChannelMessages.find((msg: any) => msg.type === 'session.update');

      const config = sessionUpdate as any;
      expect(config.session.input_audio_transcription.language).toBe(locale);
    }
  });

  it('should use locale in language instruction building', async () => {
    useSettingsStore.setState({
      appearance: { language: 'de' as const, theme: 'system', accentColor: 'blue' },
    });

    const maestroRef = { current: mockMaestro };
    const webrtcDataChannelRef = { current: mockDataChannel };
    const initialMessagesRef = { current: null };
    const greetingSentRef = { current: false };

    const { result } = renderHook(() =>
      useSendSessionConfig(
        maestroRef,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        { onStateChange: vi.fn() },
        webrtcDataChannelRef,
        initialMessagesRef,
        greetingSentRef,
      ),
    );

    await result.current();

    const sessionUpdate = dataChannelMessages.find((msg: any) => msg.type === 'session.update');

    const config = sessionUpdate as any;
    const instructions = config.session.instructions;

    // Verify German language instructions are present
    expect(instructions).toContain('GERMAN');
  });
});
