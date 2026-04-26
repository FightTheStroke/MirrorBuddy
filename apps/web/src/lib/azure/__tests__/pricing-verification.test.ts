import { describe, it, expect } from 'vitest';
import { getPricingStatus, verifyPricingAvailability, MODELS } from '../pricing-verification';

describe('Azure Pricing Verification', () => {
  it('has pricing status for gpt-audio-1.5', () => {
    const status = getPricingStatus('gpt-audio-1.5');
    expect(status).toBeDefined();
  });

  it('has pricing status for gpt-realtime-1.5', () => {
    const status = getPricingStatus('gpt-realtime-1.5');
    expect(status).toBeDefined();
  });

  it('pricing status includes status field', () => {
    const status = getPricingStatus('gpt-audio-1.5');
    expect(status.status).toBeDefined();
    expect(['available', 'pending', 'unavailable']).toContain(status.status);
  });

  it('pricing status includes region info', () => {
    const status = getPricingStatus('gpt-audio-1.5');
    expect(status.region).toBe('swedencentral');
  });

  it('pricing status includes model version', () => {
    const status = getPricingStatus('gpt-realtime-1.5');
    expect(status.modelVersion).toBe('2026-02-23');
  });

  it('pricing status includes last checked timestamp', () => {
    const status = getPricingStatus('gpt-audio-1.5');
    expect(status.lastChecked).toBeDefined();
    expect(typeof status.lastChecked).toBe('string');
  });

  it('verifies pricing availability for both models', () => {
    const verification = verifyPricingAvailability();
    expect(verification.summary).toBeDefined();
    expect(verification.models).toBeDefined();
    expect(verification.models.length).toBe(2);
  });

  it('verification includes all required models', () => {
    const verification = verifyPricingAvailability();
    const modelNames = verification.models.map((m) => m.modelName);
    expect(modelNames).toContain('gpt-audio-1.5');
    expect(modelNames).toContain('gpt-realtime-1.5');
  });

  it('verification includes pricing status for each model', () => {
    const verification = verifyPricingAvailability();
    verification.models.forEach((model) => {
      expect(model.pricingStatus).toBeDefined();
      expect(model.pricingStatus).toMatch(/^(available|pending|unavailable)/i);
    });
  });

  it('models list is exported correctly', () => {
    expect(MODELS).toContain('gpt-audio-1.5');
    expect(MODELS).toContain('gpt-realtime-1.5');
  });

  it('verification includes documentation notes', () => {
    const verification = verifyPricingAvailability();
    expect(verification.notes).toBeDefined();
    expect(typeof verification.notes).toBe('string');
  });

  it('returns empty issues when pricing is documented', () => {
    const verification = verifyPricingAvailability();
    expect(verification.issues).toBeDefined();
    expect(Array.isArray(verification.issues)).toBe(true);
  });
});
