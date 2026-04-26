/**
 * Unit tests for KnownFeatureFlag type union completeness
 * T0-02: Verify 'coming_soon_overlay' is in KnownFeatureFlag
 */

import { describe, it, expect } from 'vitest';
import type { KnownFeatureFlag } from '../types';

// Type-level checks: these will produce a TS error if the literals are not in KnownFeatureFlag
type AssertComingSoonOverlayInUnion = 'coming_soon_overlay' extends KnownFeatureFlag ? true : never;
const _comingSoonOverlayCheck: AssertComingSoonOverlayInUnion = true;

type AssertVoiceRealtime15InUnion = 'voice_realtime_15' extends KnownFeatureFlag ? true : never;
const _voiceRealtime15Check: AssertVoiceRealtime15InUnion = true;

type AssertTtsAudio15InUnion = 'tts_audio_15' extends KnownFeatureFlag ? true : never;
const _ttsAudio15Check: AssertTtsAudio15InUnion = true;

describe('KnownFeatureFlag type', () => {
  it('accepts coming_soon_overlay as a valid KnownFeatureFlag at compile time', () => {
    // Runtime verification: assign the literal to KnownFeatureFlag variable
    const flag: KnownFeatureFlag = 'coming_soon_overlay';
    expect(flag).toBe('coming_soon_overlay');
  });

  it('includes coming_soon_overlay in the known flag string values', () => {
    // Ensure the string is what we expect
    const knownFlags: KnownFeatureFlag[] = [
      'voice_realtime',
      'voice_realtime_15',
      'rag_enabled',
      'flashcards',
      'mindmap',
      'quiz',
      'pomodoro',
      'gamification',
      'parent_dashboard',
      'pdf_export',
      'ambient_audio',
      'voice_ga_protocol',
      'voice_full_prompt',
      'voice_transcript_safety',
      'voice_calling_overlay',
      'tts_audio_15',
      'chat_unified_view',
      'consent_unified_model',
      'coming_soon_overlay',
    ];
    expect(knownFlags).toContain('coming_soon_overlay');
    expect(knownFlags).toContain('voice_realtime_15');
    expect(knownFlags).toContain('tts_audio_15');
    expect(knownFlags.length).toBe(19);
  });
});
