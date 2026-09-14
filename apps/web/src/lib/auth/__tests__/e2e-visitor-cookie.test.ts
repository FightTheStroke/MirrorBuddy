import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isValidVisitorId } from '@/lib/auth/cookie-constants';
import { createE2EVisitorId } from '../../../../e2e/fixtures/visitor-id';

const baseFixtures = readFileSync(
  path.resolve(__dirname, '../../../..', 'e2e/fixtures/base-fixtures.ts'),
  'utf8',
);

describe('E2E visitor cookie', () => {
  it('mints an identifier the production proxy guard accepts', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(isValidVisitorId(createE2EVisitorId())).toBe(true);
    }
  });

  it('is the only generator the base fixture uses for the visitor cookie', () => {
    expect(baseFixtures).toContain('createE2EVisitorId()');
    expect(baseFixtures).not.toContain('`e2e-visitor-');
  });
});
