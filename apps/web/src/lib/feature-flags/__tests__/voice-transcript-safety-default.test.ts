import { describe, expect, it } from 'vitest';
import { isFeatureEnabled } from '@/lib/feature-flags/client';

describe('voice_transcript_safety default', () => {
  it('is enabled by default for rollout', () => {
    const flag = isFeatureEnabled('voice_transcript_safety');
    expect(flag.enabled).toBe(true);
    expect(flag.flag.status).toBe('enabled');
  });
});
