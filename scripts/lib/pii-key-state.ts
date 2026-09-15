/**
 * Classifies the production PII encryption state without touching any value.
 *
 * The production PII key is stored write-only, so it can never be read back
 * from the hosting provider. Deciding what to do when the admin seed rejects
 * it therefore needs two facts and no secrets: whether the configured key is
 * long enough to be usable, and whether any row is already encrypted with the
 * key that nobody can read.
 */

export const PII_PREFIX = 'pii:';
export const MINIMUM_KEY_LENGTH = 32;

export interface PiiKeyState {
  keyLength: number;
  keyUsable: boolean;
  totalEmails: number;
  encryptedEmails: number;
  /**
   * `rotatable` means a new key can be issued without losing data, because no
   * stored value depends on the unreadable one.
   */
  rotatable: boolean;
}

export function classifyPiiKeyState(input: {
  key: string | undefined;
  totalEmails: number;
  encryptedEmails: number;
}): PiiKeyState {
  const keyLength = input.key?.length ?? 0;
  const totalEmails = Math.max(0, Math.trunc(input.totalEmails));
  const encryptedEmails = Math.min(totalEmails, Math.max(0, Math.trunc(input.encryptedEmails)));
  return {
    keyLength,
    keyUsable: keyLength >= MINIMUM_KEY_LENGTH,
    totalEmails,
    encryptedEmails,
    rotatable: encryptedEmails === 0,
  };
}
