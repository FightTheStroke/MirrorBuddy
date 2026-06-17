import { describe, expect, it } from 'vitest';
import { createNavSections } from '../admin-sidebar-sections';

describe('createNavSections', () => {
  it('includes A/B Testing item in Research section', () => {
    const sections = createNavSections((key) => key);
    const researchSection = sections.find((section) => section.id === 'research');

    expect(researchSection).toBeDefined();
    expect(researchSection?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ab-testing',
          label: 'A/B Testing',
          href: '/admin/research/ab-testing',
        }),
      ]),
    );
  });
});
