import { describe, expect, it, beforeEach } from 'vitest';
import { migrateLegacyConsentKeys } from '../consent-migration';

describe('consent-migration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('migrates legacy consent keys to unified key', () => {
    sessionStorage.setItem('tos_accepted', 'true');
    const migrated = migrateLegacyConsentKeys();
    expect(migrated).toBe(true);
    expect(localStorage.getItem('mirrorbuddy-unified-consent')).toBeTruthy();
  });
});
