import { describe, it, expect } from 'vitest';
import {
  isSupportedVoice,
  getValidVoice,
  getAvailableVoices,
  getVoiceOptions,
  SUPPORTED_TTS_VOICES,
  DEFAULT_TTS_VOICE,
} from '../voice-mapping';

describe('TTS Voice Mapping Module', () => {
  describe('isSupportedVoice', () => {
    it('should validate supported voices', () => {
      expect(isSupportedVoice('alloy')).toBe(true);
      expect(isSupportedVoice('echo')).toBe(true);
      expect(isSupportedVoice('fable')).toBe(true);
      expect(isSupportedVoice('onyx')).toBe(true);
      expect(isSupportedVoice('nova')).toBe(true);
      expect(isSupportedVoice('shimmer')).toBe(true);
    });

    it('should reject unsupported voices', () => {
      expect(isSupportedVoice('invalid')).toBe(false);
      expect(isSupportedVoice('ALLOY')).toBe(false);
      expect(isSupportedVoice('')).toBe(false);
      expect(isSupportedVoice(null)).toBe(false);
      expect(isSupportedVoice(undefined)).toBe(false);
      expect(isSupportedVoice(123)).toBe(false);
    });
  });

  describe('getValidVoice', () => {
    it('should return the voice if valid', () => {
      expect(getValidVoice('alloy')).toBe('alloy');
      expect(getValidVoice('shimmer')).toBe('shimmer');
    });

    it('should return default voice for invalid input', () => {
      expect(getValidVoice('invalid')).toBe(DEFAULT_TTS_VOICE);
      expect(getValidVoice(null)).toBe(DEFAULT_TTS_VOICE);
      expect(getValidVoice(undefined)).toBe(DEFAULT_TTS_VOICE);
      expect(getValidVoice('')).toBe(DEFAULT_TTS_VOICE);
    });

    it('should use shimmer as default', () => {
      expect(DEFAULT_TTS_VOICE).toBe('shimmer');
    });
  });

  describe('getAvailableVoices', () => {
    it('should return all supported voices', () => {
      const voices = getAvailableVoices();
      expect(voices).toHaveLength(6);
      expect(voices).toEqual(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);
    });

    it('should return a new array each time', () => {
      const voices1 = getAvailableVoices();
      const voices2 = getAvailableVoices();
      expect(voices1).not.toBe(voices2);
      expect(voices1).toEqual(voices2);
    });
  });

  describe('getVoiceOptions', () => {
    it('should return voice options with labels and descriptions', () => {
      const options = getVoiceOptions();
      expect(options).toHaveLength(6);

      const alloyOption = options.find((o) => o.value === 'alloy');
      expect(alloyOption).toEqual({
        value: 'alloy',
        label: 'Alloy',
        description: 'Clear and professional',
      });

      const shimmerOption = options.find((o) => o.value === 'shimmer');
      expect(shimmerOption).toEqual({
        value: 'shimmer',
        label: 'Shimmer',
        description: 'Gentle and melodic',
      });
    });

    it('should have proper capitalization', () => {
      const options = getVoiceOptions();
      options.forEach((option) => {
        const firstLetter = option.label.charAt(0);
        expect(firstLetter).toBe(firstLetter.toUpperCase());
      });
    });

    it('should have descriptions for all voices', () => {
      const options = getVoiceOptions();
      options.forEach((option) => {
        expect(option.description).toBeTruthy();
        expect(option.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SUPPORTED_TTS_VOICES constant', () => {
    it('should contain all 6 OpenAI voices', () => {
      expect(SUPPORTED_TTS_VOICES).toContain('alloy');
      expect(SUPPORTED_TTS_VOICES).toContain('echo');
      expect(SUPPORTED_TTS_VOICES).toContain('fable');
      expect(SUPPORTED_TTS_VOICES).toContain('onyx');
      expect(SUPPORTED_TTS_VOICES).toContain('nova');
      expect(SUPPORTED_TTS_VOICES).toContain('shimmer');
      expect(SUPPORTED_TTS_VOICES).toHaveLength(6);
    });
  });

  describe('Voice name compatibility', () => {
    it('should maintain compatibility across providers', () => {
      const openaiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      const audioVoices = getAvailableVoices();

      expect(audioVoices).toEqual(openaiVoices);
    });

    it('should support all voices in gpt-audio-1.5 context', () => {
      SUPPORTED_TTS_VOICES.forEach((voice) => {
        const validated = isSupportedVoice(voice);
        expect(validated).toBe(true);
      });
    });
  });
});
