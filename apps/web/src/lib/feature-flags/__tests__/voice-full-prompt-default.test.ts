import { describe, expect, it } from 'vitest';
import { isFeatureEnabled } from '@/lib/feature-flags/client';

describe('voice_full_prompt default', () => {
  it('is enabled by default for rollout', () => {
    const flag = isFeatureEnabled('voice_full_prompt');
    expect(flag.enabled).toBe(true);
    expect(flag.flag.status).toBe('enabled');
  });
});
