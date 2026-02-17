/**
 * Unit tests for KnownFeatureFlag type union completeness
 * T0-02: Verify 'coming_soon_overlay' is in KnownFeatureFlag
 */

import { describe, it, expect } from 'vitest';
import type { KnownFeatureFlag } from '../types';

// Type-level check: this will produce a TS error if 'coming_soon_overlay' is not in KnownFeatureFlag
type AssertComingSoonOverlayInUnion = 'coming_soon_overlay' extends KnownFeatureFlag ? true : never;
const _typeCheck: AssertComingSoonOverlayInUnion = true;

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
      'chat_unified_view',
      'consent_unified_model',
      'coming_soon_overlay',
    ];
    expect(knownFlags).toContain('coming_soon_overlay');
    expect(knownFlags.length).toBe(17);
  });
});
