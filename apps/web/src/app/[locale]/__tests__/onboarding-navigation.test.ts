import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const homeSource = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');

describe('onboarding navigation', () => {
  it('uses a locale-preserving document redirect instead of streaming an RSC navigation', () => {
    expect(homeSource).toContain('window.location.replace(`/${locale}/welcome`)');
    expect(homeSource).not.toContain("router.push('/welcome')");
  });
});
