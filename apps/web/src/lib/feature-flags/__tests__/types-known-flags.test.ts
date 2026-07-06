/**
 * Unit tests for KnownFeatureFlag type union completeness
 */

import { describe, it, expect } from 'vitest';
import type { KnownFeatureFlag } from '../types';

// Type-level checks: these will produce a TS error if the literals are not in KnownFeatureFlag
type AssertVoiceRealtime15InUnion = 'voice_realtime_15' extends KnownFeatureFlag ? true : never;
const _voiceRealtime15Check: AssertVoiceRealtime15InUnion = true;

type AssertTtsAudio15InUnion = 'tts_audio_15' extends KnownFeatureFlag ? true : never;
const _ttsAudio15Check: AssertTtsAudio15InUnion = true;

// ADR 0165: Azure voice 2026-05 wave
type AssertVoiceRealtime2InUnion = 'voice_realtime_2' extends KnownFeatureFlag ? true : never;
const _voiceRealtime2Check: AssertVoiceRealtime2InUnion = true;
type AssertWhisperRtInUnion = 'voice_realtime_whisper_transcription' extends KnownFeatureFlag
  ? true
  : never;
const _whisperRtCheck: AssertWhisperRtInUnion = true;
type AssertTranslateInUnion = 'voice_realtime_translate' extends KnownFeatureFlag ? true : never;
const _translateCheck: AssertTranslateInUnion = true;

describe('KnownFeatureFlag type', () => {
  it('includes all expected flags in the known flag string values', () => {
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
      'voice_realtime_2',
      'voice_realtime_whisper_transcription',
      'voice_realtime_translate',
    ];
    expect(knownFlags).toContain('voice_realtime_15');
    expect(knownFlags).toContain('tts_audio_15');
    expect(knownFlags).toContain('voice_realtime_2');
    expect(knownFlags).toContain('voice_realtime_whisper_transcription');
    expect(knownFlags).toContain('voice_realtime_translate');
    expect(knownFlags.length).toBe(21);
  });
});
