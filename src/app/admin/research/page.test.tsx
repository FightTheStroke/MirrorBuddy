import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('ResearchLabPage integration', () => {
  it('renders stats cards section in research page source', async () => {
    const source = await readFile(join(process.cwd(), 'src/app/admin/research/page.tsx'), 'utf8');
    expect(source).toMatch(/stats-cards|ResearchStatsCards/);
  });

  it('wires experiment form into collapsible panel toggled by create button', async () => {
    const source = await readFile(join(process.cwd(), 'src/app/admin/research/page.tsx'), 'utf8');
    expect(source).toMatch(/ExperimentCreateForm|experiment-form/);
    expect(source).toMatch(/setCreateFormOpen|createFormOpen/);
  });

  it('does not keep the API-only no experiments message in page source', async () => {
    const source = await readFile(join(process.cwd(), 'src/app/admin/research/page.tsx'), 'utf8');
    expect(source).not.toContain('via API');
  });
});
