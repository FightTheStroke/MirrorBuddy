// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const config = readFileSync(resolve(import.meta.dirname, '../../../playwright.config.ts'), 'utf8');
const template = config.match(/snapshotPathTemplate:\s*['"]([^'"]+)['"]/)?.[1];

describe('Playwright screenshot baseline identity', () => {
  it('keeps independently named screenshots in different baseline files', () => {
    expect(template).toContain('{arg}');
  });

  it('keeps browser and device project baselines separate', () => {
    expect(template).toContain('{projectName}');
  });

  it('preserves the platform and file extension in baseline paths', () => {
    expect(template).toContain('{platform}{ext}');
  });
});
