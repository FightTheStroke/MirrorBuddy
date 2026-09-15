// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classifyPiiKeyState, MINIMUM_KEY_LENGTH } from '../lib/pii-key-state';

describe('pii key state classification', () => {
  it('reports a short key as unusable and never exposes it', () => {
    const state = classifyPiiKeyState({ key: 'too-short', totalEmails: 10, encryptedEmails: 0 });
    expect(state.keyUsable).toBe(false);
    expect(state.keyLength).toBe('too-short'.length);
    expect(JSON.stringify(state)).not.toContain('too-short');
  });

  it('accepts a key at the minimum length', () => {
    const state = classifyPiiKeyState({
      key: 'k'.repeat(MINIMUM_KEY_LENGTH),
      totalEmails: 1,
      encryptedEmails: 0,
    });
    expect(state.keyUsable).toBe(true);
  });

  it('treats a missing key as zero length', () => {
    expect(
      classifyPiiKeyState({ key: undefined, totalEmails: 0, encryptedEmails: 0 }),
    ).toMatchObject({ keyLength: 0, keyUsable: false });
  });

  it('allows rotation only when no stored value depends on the unreadable key', () => {
    expect(
      classifyPiiKeyState({ key: undefined, totalEmails: 40, encryptedEmails: 0 }).rotatable,
    ).toBe(true);
    expect(
      classifyPiiKeyState({ key: undefined, totalEmails: 40, encryptedEmails: 1 }).rotatable,
    ).toBe(false);
  });

  it('never reports more encrypted rows than rows, or negative counts', () => {
    const state = classifyPiiKeyState({ key: undefined, totalEmails: 5, encryptedEmails: 99 });
    expect(state.encryptedEmails).toBe(5);
    expect(
      classifyPiiKeyState({ key: undefined, totalEmails: -3, encryptedEmails: -1 }),
    ).toMatchObject({ totalEmails: 0, encryptedEmails: 0 });
  });
});

describe('decryption trial', () => {
  const base = { key: 'k'.repeat(32), totalEmails: 33, encryptedEmails: 13 };

  it('refuses a usable key that cannot read the stored ciphertexts', () => {
    expect(classifyPiiKeyState({ ...base, sampled: 3, decrypted: 0 }).keyMatchesData).toBe(false);
    expect(classifyPiiKeyState({ ...base, sampled: 3, decrypted: 2 }).keyMatchesData).toBe(false);
  });

  it('accepts a usable key that reads every sampled ciphertext', () => {
    expect(classifyPiiKeyState({ ...base, sampled: 3, decrypted: 3 }).keyMatchesData).toBe(true);
  });

  it('requires an actual sample when encrypted rows exist', () => {
    expect(classifyPiiKeyState({ ...base, sampled: 0, decrypted: 0 }).keyMatchesData).toBe(false);
  });

  it('accepts a usable key when nothing is encrypted yet', () => {
    const state = classifyPiiKeyState({ key: 'k'.repeat(32), totalEmails: 5, encryptedEmails: 0 });
    expect(state.keyMatchesData).toBe(true);
    expect(state.rotatable).toBe(true);
  });

  it('never matches when the key is too short', () => {
    expect(
      classifyPiiKeyState({ ...base, key: 'short', sampled: 3, decrypted: 3 }).keyMatchesData,
    ).toBe(false);
  });
});
