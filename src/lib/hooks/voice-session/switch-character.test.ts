import { describe, it, expect, vi } from 'vitest';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

describe('voice-session-store switchCharacter', () => {
  it('should update currentMaestro and clear transcript/tools', () => {
    const store = useVoiceSessionStore.getState();

    // Set up initial state
    store.setConnected(true);
    store.setCurrentMaestro({
      id: 'old-maestro',
      name: 'Old',
      displayName: 'Old',
      subject: 'math' as never,
      specialty: 'Math',
      voice: 'alloy' as never,
      voiceInstructions: '',
      teachingStyle: '',
      avatar: '',
      color: '',
      systemPrompt: '',
      greeting: '',
    });
    store.addTranscript('user', 'Hello');
    store.addTranscript('assistant', 'Hi there');
    store.addToolCall({
      id: 'tc1',
      type: 'function',
      function: { name: 'test', arguments: '{}' },
    } as never);

    // Switch character
    const newMaestro = {
      id: 'new-maestro',
      name: 'New',
      displayName: 'New',
      subject: 'science' as never,
      specialty: 'Science',
      voice: 'echo' as never,
      voiceInstructions: '',
      teachingStyle: '',
      avatar: '',
      color: '',
      systemPrompt: '',
      greeting: '',
    };
    store.switchCharacter(newMaestro);

    const state = useVoiceSessionStore.getState();
    expect(state.currentMaestro?.id).toBe('new-maestro');
    expect(state.transcript).toEqual([]);
    expect(state.toolCalls).toEqual([]);
    // Connection should be preserved
    expect(state.isConnected).toBe(true);
    expect(state.isMuted).toBe(false);
  });
});

describe('useSwitchCharacter hook', () => {
  it('should return false when no data channel is available', async () => {
    const { useSwitchCharacter } = await import('@/lib/hooks/voice-session/switch-character');

    // Mock React.useCallback to just return the function
    vi.mock('react', async () => {
      const actual = await vi.importActual('react');
      return {
        ...actual,
        useCallback: (fn: unknown) => fn,
      };
    });

    const deps = {
      webrtcDataChannelRef: { current: null },
      maestroRef: { current: null },
      greetingSentRef: { current: false },
      sessionReadyRef: { current: false },
      sendSessionConfigRef: { current: null },
      switchCharacterStore: vi.fn(),
    };

    const switchFn = useSwitchCharacter(deps);
    const result = switchFn({
      id: 'test',
      name: 'Test',
    } as never);
    expect(result).toBe(false);
    expect(deps.switchCharacterStore).not.toHaveBeenCalled();
  });
});
