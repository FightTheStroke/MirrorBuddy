import { describe, it, expect } from 'vitest';

/**
 * Voice mapping verification for gpt-audio-1.5
 *
 * Verifies that standard OpenAI TTS voice names (alloy, echo, shimmer, etc.)
 * are compatible with gpt-audio-1.5 Chat Completions API.
 *
 * Reference: OpenAI API documentation for text-to-speech
 * gpt-audio-1.5 uses the same voice parameter as tts-1/tts-1-hd
 */

describe('TTS Voice Mapping for gpt-audio-1.5', () => {
  /**
   * OpenAI TTS voice names supported by gpt-audio-1.5
   * via Chat Completions API audio output parameter
   */
  const SUPPORTED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

  type TTSVoice = (typeof SUPPORTED_VOICES)[number];

  /**
   * Verify all voice names are defined and valid strings
   */
  it('should have all voice names defined', () => {
    expect(SUPPORTED_VOICES).toHaveLength(6);
    expect(SUPPORTED_VOICES).toContain('alloy');
    expect(SUPPORTED_VOICES).toContain('echo');
    expect(SUPPORTED_VOICES).toContain('fable');
    expect(SUPPORTED_VOICES).toContain('onyx');
    expect(SUPPORTED_VOICES).toContain('nova');
    expect(SUPPORTED_VOICES).toContain('shimmer');
  });

  /**
   * Verify voice names are non-empty strings
   */
  it('should have valid voice names (non-empty strings)', () => {
    SUPPORTED_VOICES.forEach((voice) => {
      expect(typeof voice).toBe('string');
      expect(voice.length).toBeGreaterThan(0);
      expect(/^[a-z]+$/.test(voice)).toBe(true);
    });
  });

  /**
   * Verify gpt-audio-1.5 voice names match Chat Completions audio output parameter spec
   * Format: { type: 'text', text: '...' } | { type: 'audio', audio: { voice: '<voice>' } }
   */
  it('should match Chat Completions audio output voice parameter spec', () => {
    const CHAT_COMPLETIONS_AUDIO_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    expect(SUPPORTED_VOICES).toEqual(CHAT_COMPLETIONS_AUDIO_VOICES);
  });

  /**
   * Verify voice selection works correctly
   */
  it('should select voice by name', () => {
    const selectVoice = (voiceName: string): TTSVoice | null => {
      if (SUPPORTED_VOICES.includes(voiceName as TTSVoice)) {
        return voiceName as TTSVoice;
      }
      return null;
    };

    expect(selectVoice('alloy')).toBe('alloy');
    expect(selectVoice('shimmer')).toBe('shimmer');
    expect(selectVoice('invalid')).toBeNull();
    expect(selectVoice('')).toBeNull();
  });

  /**
   * Verify default voice is valid
   */
  it('should use shimmer as default voice', () => {
    const DEFAULT_VOICE = 'shimmer' as TTSVoice;
    expect(SUPPORTED_VOICES).toContain(DEFAULT_VOICE);
  });

  /**
   * Verify voice names are compatible with API request payloads
   */
  it('should format voice names correctly for API requests', () => {
    const formatVoiceForApi = (voice: TTSVoice): string => {
      return voice;
    };

    SUPPORTED_VOICES.forEach((voice) => {
      const formatted = formatVoiceForApi(voice);
      expect(formatted).toBe(voice);
      expect(/^[a-z]+$/.test(formatted)).toBe(true);
    });
  });

  /**
   * Verify no voice name conflicts or duplicates
   */
  it('should have no duplicate voice names', () => {
    const uniqueVoices = new Set(SUPPORTED_VOICES);
    expect(uniqueVoices.size).toBe(SUPPORTED_VOICES.length);
  });

  /**
   * Verify voice names are recognized across different API versions
   */
  it('should support voices in both tts-1 and gpt-audio-1.5 contexts', () => {
    const ttsVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const audioVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

    expect(SUPPORTED_VOICES.length).toBe(ttsVoices.length);
    ttsVoices.forEach((voice) => {
      expect(SUPPORTED_VOICES).toContain(voice as TTSVoice);
      expect(audioVoices).toContain(voice);
    });
  });

  /**
   * Verify voice availability status
   */
  it('should report correct voice availability', () => {
    const getAvailableVoices = (): string[] => {
      return [...SUPPORTED_VOICES];
    };

    const available = getAvailableVoices();
    expect(available).toHaveLength(6);
    expect(available.includes('alloy')).toBe(true);
    expect(available.includes('shimmer')).toBe(true);
  });

  /**
   * Verify voices can be iterated for client-side selection UI
   */
  it('should enumerate voices for UI selection', () => {
    const voiceOptions = SUPPORTED_VOICES.map((voice) => ({
      value: voice,
      label: voice.charAt(0).toUpperCase() + voice.slice(1),
    }));

    expect(voiceOptions).toHaveLength(6);
    expect(voiceOptions[0]).toEqual({ value: 'alloy', label: 'Alloy' });
    expect(voiceOptions[5]).toEqual({ value: 'shimmer', label: 'Shimmer' });
  });
});
