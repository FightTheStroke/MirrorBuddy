import { describe, it, expect } from 'vitest';

import { models } from '../../../../prisma/model-catalog-data';

/**
 * The admin tier editor offers exactly these models. A retired or
 * preview-backed name here would let an admin point a tier at a deployment
 * that no longer answers (ADR 0182).
 */
describe('model catalog data', () => {
  const names = models.map((model) => model.name);

  it('offers the current default model for chat', () => {
    const sol = models.find((model) => model.name === 'gpt-6.1-sol');

    expect(sol?.category).toBe('chat');
    expect(sol?.deploymentName).toBe('mb-gpt-61-sol');
  });

  it('offers no retired or preview-backed chat model', () => {
    for (const retired of ['gpt-4o', 'gpt-4o-mini', 'gpt-5-chat', 'gpt-5.2-chat', 'gpt-5.2-edu']) {
      expect(names).not.toContain(retired);
    }
  });

  it('has unique model names', () => {
    expect(new Set(names).size).toBe(names.length);
  });
});
