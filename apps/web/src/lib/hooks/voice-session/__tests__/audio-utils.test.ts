/**
 * Tests for Audio Conversion Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  base64ToInt16Array,
  int16ArrayToBase64,
  float32ToInt16,
  int16ToFloat32,
  resample,
} from '../audio-utils';

describe('audio-utils', () => {
  describe('base64ToInt16Array and int16ArrayToBase64', () => {
    it('round-trips correctly', () => {
      const original = new Int16Array([100, -200, 32767, -32768, 0]);
      const base64 = int16ArrayToBase64(original);
      const result = base64ToInt16Array(base64);

      expect(result.length).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(result[i]).toBe(original[i]);
      }
    });

    it('handles empty array', () => {
      const original = new Int16Array([]);
      const base64 = int16ArrayToBase64(original);
      const result = base64ToInt16Array(base64);

      expect(result.length).toBe(0);
    });

    it('produces valid base64 string', () => {
      const data = new Int16Array([1000, 2000, 3000]);
      const base64 = int16ArrayToBase64(data);

      // Base64 should only contain valid characters
      expect(base64).toMatch(/^[A-Za-z0-9+/=]*$/);
    });
  });

  describe('float32ToInt16', () => {
    it('converts 0.0 to 0', () => {
      const float32 = new Float32Array([0.0]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBe(0);
    });

    it('converts 1.0 to max positive (32767)', () => {
      const float32 = new Float32Array([1.0]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBe(32767);
    });

    it('converts -1.0 to max negative (-32768)', () => {
      const float32 = new Float32Array([-1.0]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBe(-32768);
    });

    it('converts 0.5 to approximately 16383', () => {
      const float32 = new Float32Array([0.5]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBeCloseTo(16383, -1);
    });

    it('converts -0.5 to approximately -16384', () => {
      const float32 = new Float32Array([-0.5]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBeCloseTo(-16384, -1);
    });

    it('clamps values above 1.0', () => {
      const float32 = new Float32Array([1.5, 2.0, 100.0]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBe(32767);
      expect(result[1]).toBe(32767);
      expect(result[2]).toBe(32767);
    });

    it('clamps values below -1.0', () => {
      const float32 = new Float32Array([-1.5, -2.0, -100.0]);
      const result = float32ToInt16(float32);
      expect(result[0]).toBe(-32768);
      expect(result[1]).toBe(-32768);
      expect(result[2]).toBe(-32768);
    });

    it('handles array of mixed values', () => {
      const float32 = new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]);
      const result = float32ToInt16(float32);

      expect(result.length).toBe(5);
      expect(result[0]).toBe(0);
      expect(result[3]).toBe(32767);
      expect(result[4]).toBe(-32768);
    });
  });

  describe('int16ToFloat32', () => {
    it('converts 0 to 0.0', () => {
      const int16 = new Int16Array([0]);
      const result = int16ToFloat32(int16);
      expect(result[0]).toBe(0);
    });

    it('converts 32767 to approximately 1.0', () => {
      const int16 = new Int16Array([32767]);
      const result = int16ToFloat32(int16);
      expect(result[0]).toBeCloseTo(1.0, 3);
    });

    it('converts -32768 to -1.0', () => {
      const int16 = new Int16Array([-32768]);
      const result = int16ToFloat32(int16);
      expect(result[0]).toBe(-1.0);
    });

    it('converts 16383 to approximately 0.5', () => {
      const int16 = new Int16Array([16383]);
      const result = int16ToFloat32(int16);
      expect(result[0]).toBeCloseTo(0.5, 1);
    });

    it('handles array of values', () => {
      const int16 = new Int16Array([0, 32767, -32768]);
      const result = int16ToFloat32(int16);

      expect(result.length).toBe(3);
      expect(result[0]).toBe(0);
      expect(result[1]).toBeCloseTo(1.0, 3);
      expect(result[2]).toBe(-1.0);
    });
  });

  describe('float32 and int16 round-trip', () => {
    it('approximately preserves values through conversion', () => {
      const original = new Float32Array([0.0, 0.5, -0.5, 0.75, -0.25]);
      const int16 = float32ToInt16(original);
      const result = int16ToFloat32(int16);

      for (let i = 0; i < original.length; i++) {
        // Allow for quantization error (16-bit precision)
        expect(result[i]).toBeCloseTo(original[i], 2);
      }
    });
  });

  describe('resample', () => {
    it('returns same data when rates are equal', () => {
      const input = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const result = resample(input, 48000, 48000);

      expect(result).toBe(input); // Same reference
    });

    it('downsamples 48kHz to 24kHz (halves samples)', () => {
      const input = new Float32Array([0.0, 0.5, 1.0, 0.5, 0.0, -0.5]);
      const result = resample(input, 48000, 24000);

      // Output should be roughly half the length
      expect(result.length).toBe(3);
    });

    it('upsamples 24kHz to 48kHz (doubles samples)', () => {
      const input = new Float32Array([0.0, 1.0, 0.0]);
      const result = resample(input, 24000, 48000);

      // Output should be roughly double the length
      expect(result.length).toBe(6);
    });

    it('interpolates values during resampling', () => {
      const input = new Float32Array([0.0, 1.0]);
      const result = resample(input, 24000, 48000);

      // First value should be 0
      expect(result[0]).toBe(0);
      // Last should approach 1.0
      expect(result[result.length - 1]).toBeCloseTo(1.0, 1);
      // Middle values should be interpolated
      expect(result[1]).toBeGreaterThan(0);
      expect(result[1]).toBeLessThan(1);
    });

    it('handles single sample', () => {
      const input = new Float32Array([0.5]);
      const result = resample(input, 48000, 24000);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('handles empty array', () => {
      const input = new Float32Array([]);
      const result = resample(input, 48000, 24000);

      expect(result.length).toBe(0);
    });

    it('resamples from 44100 to 16000', () => {
      const input = new Float32Array(44100); // 1 second at 44.1kHz
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin((2 * Math.PI * 440 * i) / 44100); // 440Hz sine wave
      }

      const result = resample(input, 44100, 16000);

      // Should be approximately 16000 samples
      expect(result.length).toBeCloseTo(16000, -1);
    });
  });
});
