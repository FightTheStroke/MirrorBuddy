import { describe, expect, it } from 'vitest';
import { isFeatureEnabled } from '../client';

describe('feature-flags client defaults', () => {
  it('should enable voice_ga_protocol by default', () => {
    const result = isFeatureEnabled('voice_ga_protocol');
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe('enabled');
  });
});
