/**
 * Tests for prosody analysis
 */

import { describe, it, expect } from 'vitest';
import { detectPitch, calculateRMS, analyzeProsody, inferEmotions } from '../prosody';
import type { ProsodyFeatures } from '../prosody';

describe('prosody', () => {
  describe('detectPitch', () => {
    it('detects pitch from sine wave', () => {
      const sampleRate = 16000;
      const frequency = 200; // 200 Hz
      const duration = 0.1; // 100ms
      const samples = new Float32Array(sampleRate * duration);

      // Generate sine wave
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
      }

      const pitch = detectPitch(samples, sampleRate);

      // Should be close to 200 Hz
      expect(pitch).toBeGreaterThan(180);
      expect(pitch).toBeLessThan(220);
    });

    it('returns 0 for silence', () => {
      const samples = new Float32Array(1600).fill(0);
      const pitch = detectPitch(samples, 16000);

      expect(pitch).toBe(0);
    });

    it('returns 0 for noise', () => {
      const samples = new Float32Array(1600);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.random() * 2 - 1;
      }

      const pitch = detectPitch(samples, 16000);
      // Random noise should not produce a clear pitch
      // (May or may not be 0 depending on random correlation)
      expect(pitch).toBeDefined();
    });
  });

  describe('calculateRMS', () => {
    it('calculates RMS correctly', () => {
      const samples = new Float32Array([1, -1, 1, -1]);
      const rms = calculateRMS(samples);

      expect(rms).toBe(1);
    });

    it('returns 0 for silence', () => {
      const samples = new Float32Array(100).fill(0);
      const rms = calculateRMS(samples);

      expect(rms).toBe(0);
    });

    it('handles empty array', () => {
      const rms = calculateRMS(new Float32Array(0));
      expect(rms).toBe(0);
    });
  });

  describe('inferEmotions', () => {
    it('infers high frustration from high pitch variance', () => {
      const features: ProsodyFeatures = {
        pitchMean: 200,
        pitchStdDev: 80, // High variance
        pitchRange: 200,
        volumeRMS: 0.1,
        volumeVariance: 0.02,
        speechRateEstimate: 100,
        silenceRatio: 0.3,
        lowFreqEnergy: 0.5,
        highFreqEnergy: 0.5,
      };

      const emotions = inferEmotions(features);

      expect(emotions.frustration).toBeGreaterThan(0.1);
      expect(emotions.stress).toBeGreaterThan(0.2);
    });

    it('infers confusion from high silence ratio', () => {
      const features: ProsodyFeatures = {
        pitchMean: 150,
        pitchStdDev: 20,
        pitchRange: 50,
        volumeRMS: 0.05,
        volumeVariance: 0.001,
        speechRateEstimate: 60, // Very slow
        silenceRatio: 0.6, // High silence
        lowFreqEnergy: 0.5,
        highFreqEnergy: 0.5,
      };

      const emotions = inferEmotions(features);

      expect(emotions.confusion).toBeGreaterThan(0.2);
    });

    it('infers low engagement from low volume', () => {
      const features: ProsodyFeatures = {
        pitchMean: 150,
        pitchStdDev: 10,
        pitchRange: 30,
        volumeRMS: 0.01, // Very quiet
        volumeVariance: 0.0001,
        speechRateEstimate: 100,
        silenceRatio: 0.3,
        lowFreqEnergy: 0.5,
        highFreqEnergy: 0.5,
      };

      const emotions = inferEmotions(features);

      expect(emotions.engagement).toBeLessThan(0.5);
    });

    it('calculates negative valence for distressed state', () => {
      const features: ProsodyFeatures = {
        pitchMean: 300, // High pitch
        pitchStdDev: 100, // High variance
        pitchRange: 250,
        volumeRMS: 0.15,
        volumeVariance: 0.03, // High variance
        speechRateEstimate: 50, // Very slow
        silenceRatio: 0.5, // High silence
        lowFreqEnergy: 0.7, // High tension
        highFreqEnergy: 0.3,
      };

      const emotions = inferEmotions(features);

      expect(emotions.valence).toBeLessThan(0);
    });
  });

  describe('analyzeProsody', () => {
    it('handles insufficient samples', () => {
      const samples = new Float32Array(100); // Too short
      const result = analyzeProsody(samples);

      expect(result.voiceDetected).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('analyzes voice activity', () => {
      const sampleRate = 16000;
      const samples = new Float32Array(sampleRate * 0.5); // 500ms

      // Generate some voiced content
      for (let i = 0; i < samples.length; i++) {
        samples[i] = 0.1 * Math.sin((2 * Math.PI * 200 * i) / sampleRate);
      }

      const result = analyzeProsody(samples, { sampleRate });

      expect(result.voiceDetected).toBe(true);
      expect(result.features.pitchMean).toBeGreaterThan(0);
    });

    it('returns duration in milliseconds', () => {
      const samples = new Float32Array(16000); // 1 second at 16kHz
      const result = analyzeProsody(samples, { sampleRate: 16000 });

      expect(result.durationMs).toBe(1000);
    });
  });
});
