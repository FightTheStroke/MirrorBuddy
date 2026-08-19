/**
 * The retriever filters rows by the maestro ID the chat runtime uses, so a
 * knowledge file seeded under its own slug is invisible whenever the two
 * differ. That is silent by construction — an unretrievable corpus looks
 * exactly like a maestro with nothing to say — so it is pinned here.
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { maestri } from '@/data/maestri/index';
import { resolveMaestroId } from '../../../../../../scripts/lib/maestri-kb/corpus';

describe('resolveMaestroId', () => {
  it('maps the amici-miei knowledge file to the mascetti runtime ID', () => {
    expect(resolveMaestroId('amici-miei')).toBe('mascetti');
  });

  it('leaves a slug that is already a maestro ID untouched', () => {
    expect(resolveMaestroId('feynman')).toBe('feynman');
  });

  it('refuses a slug that resolves to no registered maestro', () => {
    expect(() => resolveMaestroId('not-a-maestro')).toThrow(/not a registered maestro/);
  });

  it('resolves every maestro ID to itself', () => {
    for (const maestro of maestri) {
      expect(resolveMaestroId(maestro.id)).toBe(maestro.id);
    }
  });

  // The drift guard that matters: adding a knowledge file whose slug does not
  // match a maestro ID, without recording the alias, fails here rather than
  // shipping a maestro whose knowledge can never be retrieved.
  it('resolves every committed knowledge file to a registered maestro', () => {
    const dir = path.join(__dirname, '../../../data/maestri');
    const slugs = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('-knowledge.ts'))
      .map((f) => f.replace('-knowledge.ts', ''));

    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(() => resolveMaestroId(slug), `slug "${slug}"`).not.toThrow();
    }
  });
});
