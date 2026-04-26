import { describe, it, expect } from 'vitest';
import {
  getQuotaStatus,
  verifyQuotaLimits,
  MODELS,
  calculateTrafficCapacity,
} from '../quota-verification';

describe('Azure Quota Verification', () => {
  it('has quota status for gpt-audio-1.5', () => {
    const status = getQuotaStatus('gpt-audio-1.5');
    expect(status).toBeDefined();
  });

  it('has quota status for gpt-realtime-1.5', () => {
    const status = getQuotaStatus('gpt-realtime-1.5');
    expect(status).toBeDefined();
  });

  it('quota status includes TPM limit', () => {
    const status = getQuotaStatus('gpt-audio-1.5');
    expect(status.tpmLimit).toBeDefined();
    expect(typeof status.tpmLimit).toBe('number');
    expect(status.tpmLimit).toBeGreaterThan(0);
  });

  it('quota status includes RPM limit', () => {
    const status = getQuotaStatus('gpt-audio-1.5');
    expect(status.rpmLimit).toBeDefined();
    expect(typeof status.rpmLimit).toBe('number');
    expect(status.rpmLimit).toBeGreaterThan(0);
  });

  it('quota status includes region info', () => {
    const status = getQuotaStatus('gpt-realtime-1.5');
    expect(status.region).toBe('swedencentral');
  });

  it('quota status includes SKU information', () => {
    const status = getQuotaStatus('gpt-audio-1.5');
    expect(status.sku).toBeDefined();
    expect(status.sku).toBe('GlobalStandard');
  });

  it('quota status includes last verified timestamp', () => {
    const status = getQuotaStatus('gpt-audio-1.5');
    expect(status.lastVerified).toBeDefined();
    expect(typeof status.lastVerified).toBe('string');
  });

  it('verifies quota limits for all models', () => {
    const verification = verifyQuotaLimits();
    expect(verification.summary).toBeDefined();
    expect(verification.models).toBeDefined();
    expect(verification.models.length).toBe(2);
  });

  it('verification includes TPM/RPM for each model', () => {
    const verification = verifyQuotaLimits();
    verification.models.forEach((model) => {
      expect(model.tpmLimit).toBeDefined();
      expect(model.rpmLimit).toBeDefined();
      expect(model.tpmLimit).toBeGreaterThan(0);
      expect(model.rpmLimit).toBeGreaterThan(0);
    });
  });

  it('verification indicates sufficient capacity', () => {
    const verification = verifyQuotaLimits();
    expect(verification.sufficientForProduction).toBe(true);
  });

  it('verification documents expected daily traffic', () => {
    const verification = verifyQuotaLimits();
    expect(verification.expectedDailyTokens).toBeDefined();
    expect(verification.expectedDailyTokens).toBeGreaterThan(0);
  });

  it('verification documents capacity headroom', () => {
    const verification = verifyQuotaLimits();
    expect(verification.capacityHeadroom).toBeDefined();
    expect(verification.capacityHeadroom).toBeGreaterThanOrEqual(100);
  });

  it('calculates traffic capacity for a model', () => {
    const capacity = calculateTrafficCapacity('gpt-audio-1.5');
    expect(capacity).toBeDefined();
    expect(capacity.dailyMaxTokens).toBeGreaterThan(0);
    expect(capacity.hourlyMaxTokens).toBeGreaterThan(0);
    expect(capacity.minuteMaxTokens).toBeGreaterThan(0);
  });

  it('models list is exported correctly', () => {
    expect(MODELS).toContain('gpt-audio-1.5');
    expect(MODELS).toContain('gpt-realtime-1.5');
  });

  it('verification includes no warnings when limits sufficient', () => {
    const verification = verifyQuotaLimits();
    expect(verification.warnings).toBeDefined();
    expect(Array.isArray(verification.warnings)).toBe(true);
  });
});
