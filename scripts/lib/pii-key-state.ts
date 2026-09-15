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
  /** Encrypted rows sampled for a decryption trial. */
  sampled: number;
  /** Sampled rows the configured key decrypted successfully. */
  decrypted: number;
  /**
   * `keyMatchesData` means the configured key is the one the stored values were
   * encrypted with. Writing with a key that fails this check would replace
   * readable values with values nobody can read back.
   */
  keyMatchesData: boolean;
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
  sampled?: number;
  decrypted?: number;
}): PiiKeyState {
  const keyLength = input.key?.length ?? 0;
  const totalEmails = Math.max(0, Math.trunc(input.totalEmails));
  const encryptedEmails = Math.min(totalEmails, Math.max(0, Math.trunc(input.encryptedEmails)));
  const keyUsable = keyLength >= MINIMUM_KEY_LENGTH;
  const sampled = Math.min(encryptedEmails, Math.max(0, Math.trunc(input.sampled ?? 0)));
  const decrypted = Math.min(sampled, Math.max(0, Math.trunc(input.decrypted ?? 0)));
  // With nothing encrypted there is no stored value a write could make
  // unreadable, so a usable key is enough. Otherwise every sampled row must
  // decrypt before anything may be written with this key.
  const keyMatchesData =
    keyUsable && (encryptedEmails === 0 || (sampled > 0 && decrypted === sampled));
  return {
    keyLength,
    keyUsable,
    totalEmails,
    encryptedEmails,
    sampled,
    decrypted,
    keyMatchesData,
    rotatable: encryptedEmails === 0,
  };
}
