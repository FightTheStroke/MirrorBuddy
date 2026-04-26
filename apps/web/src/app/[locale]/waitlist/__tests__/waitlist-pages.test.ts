/**
 * Waitlist Verification and Unsubscribe Pages Tests
 * Tests i18n keys and file existence for waitlist confirmation pages.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Import waitlist messages
import itWaitlist from '../../../../../messages/it/waitlist.json';

const PAGES_ROOT = resolve(__dirname, '../..');

describe('Waitlist pages - file existence', () => {
  it('verify page exists', () => {
    const filePath = resolve(PAGES_ROOT, 'waitlist/verify/page.tsx');
    expect(existsSync(filePath)).toBe(true);
  });

  it('unsubscribe page exists', () => {
    const filePath = resolve(PAGES_ROOT, 'waitlist/unsubscribe/page.tsx');
    expect(existsSync(filePath)).toBe(true);
  });
});

describe('Waitlist i18n - required keys in it/waitlist.json', () => {
  const keys = itWaitlist.waitlist;

  it('has wrapper key "waitlist"', () => {
    expect(itWaitlist).toHaveProperty('waitlist');
  });

  // Verify page keys
  it('has verifyTitle key', () => {
    expect(keys).toHaveProperty('verifyTitle');
  });

  it('has verifySuccess key', () => {
    expect(keys).toHaveProperty('verifySuccess');
  });

  it('has verifyExpired key', () => {
    expect(keys).toHaveProperty('verifyExpired');
  });

  it('has verifyAlready key', () => {
    expect(keys).toHaveProperty('verifyAlready');
  });

  it('has verifyNotFound key', () => {
    expect(keys).toHaveProperty('verifyNotFound');
  });

  it('has promoCodeTitle key', () => {
    expect(keys).toHaveProperty('promoCodeTitle');
  });

  it('has backToComingSoon key', () => {
    expect(keys).toHaveProperty('backToComingSoon');
  });

  // Unsubscribe page keys
  it('has unsubscribeTitle key', () => {
    expect(keys).toHaveProperty('unsubscribeTitle');
  });

  it('has unsubscribeSuccess key', () => {
    expect(keys).toHaveProperty('unsubscribeSuccess');
  });

  it('has unsubscribeAlready key', () => {
    expect(keys).toHaveProperty('unsubscribeAlready');
  });

  it('has unsubscribeNotFound key', () => {
    expect(keys).toHaveProperty('unsubscribeNotFound');
  });
});
