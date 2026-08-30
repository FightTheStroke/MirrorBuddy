/**
 * @vitest-environment node
 *
 * Guard for scripts/check-vercel-env.sh.
 *
 * `mktemp` creates the temp file, so `vercel env pull` stopped to ask whether
 * to overwrite it. With stderr silenced the prompt was invisible and the pull
 * wrote nothing — the check then read an empty file, declared all four required
 * Sentry variables missing (they were present all along) and never inspected a
 * single real value for the trailing-newline corruption it exists to catch.
 *
 * A check that cannot see its input is worse than no check, so these two rails
 * are asserted at source level.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'scripts', 'check-vercel-env.sh'), 'utf8');

describe('scripts/check-vercel-env.sh', () => {
  it('answers the overwrite prompt so the pull actually writes', () => {
    expect(source).toMatch(/vercel env pull[^\n]*--yes/);
  });

  it('fails loudly when the pulled environment is empty', () => {
    expect(source).toMatch(/if \[ ! -s "\$TEMP_FILE" \]/);
    expect(source).toContain('empty pull');
  });
});
