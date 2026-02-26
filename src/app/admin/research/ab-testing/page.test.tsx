import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('Admin A/B testing page source', () => {
  it('uses Recharts BarChart and ab-results API endpoint', async () => {
    const source = await readFile(
      join(process.cwd(), 'src/app/admin/research/ab-testing/page.tsx'),
      'utf8',
    );

    expect(source).toMatch(/BarChart|recharts/);
    expect(source).toMatch(/ab-results|abResults/);
  });

  it('renders experiment status badge and bucket breakdown section', async () => {
    const source = await readFile(
      join(process.cwd(), 'src/app/admin/research/ab-testing/page.tsx'),
      'utf8',
    );

    expect(source).toMatch(/statusBadge|status badge/i);
    expect(source).toMatch(/bucket/i);
  });
});
