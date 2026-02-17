import { describe, it, expect } from 'vitest';
import { FUNNEL_STAGES } from '../constants';

describe('FUNNEL_STAGES', () => {
  it('includes WAITLIST_SIGNUP stage', () => {
    expect(FUNNEL_STAGES).toContain('WAITLIST_SIGNUP');
  });

  it('includes WAITLIST_VERIFIED stage', () => {
    expect(FUNNEL_STAGES).toContain('WAITLIST_VERIFIED');
  });

  it('places WAITLIST_SIGNUP before VISITOR', () => {
    const signupIdx = FUNNEL_STAGES.indexOf('WAITLIST_SIGNUP' as never);
    const visitorIdx = FUNNEL_STAGES.indexOf('VISITOR' as never);
    expect(signupIdx).toBeGreaterThanOrEqual(0);
    expect(signupIdx).toBeLessThan(visitorIdx);
  });

  it('places WAITLIST_VERIFIED before VISITOR', () => {
    const verifiedIdx = FUNNEL_STAGES.indexOf('WAITLIST_VERIFIED' as never);
    const visitorIdx = FUNNEL_STAGES.indexOf('VISITOR' as never);
    expect(verifiedIdx).toBeGreaterThanOrEqual(0);
    expect(verifiedIdx).toBeLessThan(visitorIdx);
  });

  it('places WAITLIST_SIGNUP before WAITLIST_VERIFIED', () => {
    const signupIdx = FUNNEL_STAGES.indexOf('WAITLIST_SIGNUP' as never);
    const verifiedIdx = FUNNEL_STAGES.indexOf('WAITLIST_VERIFIED' as never);
    expect(signupIdx).toBeLessThan(verifiedIdx);
  });

  it('still contains VISITOR stage', () => {
    expect(FUNNEL_STAGES).toContain('VISITOR');
  });
});
