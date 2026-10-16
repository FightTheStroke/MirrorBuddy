// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const script = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

describe('release audit checks the build that can actually ship', () => {
  it('checks pre-release runtime absence after building and preparing standalone', () => {
    const source = script('pre-release-check.sh');
    expect(source.indexOf('node scripts/release-audit.mjs')).toBeGreaterThan(
      source.indexOf('prepare-standalone.mjs'),
    );
  });
  it('checks brutal release runtime absence after the build and browser preparation', () => {
    const source = script('release-brutal.sh');
    expect(source.indexOf('node scripts/release-audit.mjs')).toBeGreaterThan(
      source.indexOf('npm run test >'),
    );
  });
  it.each(['pre-release-check.sh', 'release-brutal.sh'])(
    'does not hide approved-exception output or call an unscoped audit in %s',
    (name) => {
      const source = script(name);
      expect(source).toContain('cat "$');
      expect(source).not.toContain('pnpm audit');
      expect(source).not.toMatch(/Security audit passed/);
    },
  );
});
