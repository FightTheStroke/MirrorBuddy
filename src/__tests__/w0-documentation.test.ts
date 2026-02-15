/**
 * W0-Foundation Documentation Test
 * Verifies CHANGELOG.md and plan-147-notes.md have been updated with W0 wave summary
 */

import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';
import { join } from 'path';

describe('W0-Foundation Documentation', () => {
  const projectRoot = join(__dirname, '../..');
  const changelogPath = join(projectRoot, 'CHANGELOG.md');
  const adrNotesPath = join(projectRoot, 'docs/adr/plan-147-notes.md');

  it('CHANGELOG.md should include W0-Foundation wave entry', () => {
    const changelog = readFileSync(changelogPath, 'utf-8');

    // Verify W0 wave is documented
    expect(changelog).toContain('W0-Foundation');

    // Verify key deliverables mentioned
    expect(changelog).toContain('feature flags');
    expect(changelog).toContain('baseline metrics');
    expect(changelog).toContain('compliance logging');
    expect(changelog).toContain('parity matrix');
  });

  it('plan-147-notes.md should include W0 Learnings section', () => {
    const notes = readFileSync(adrNotesPath, 'utf-8');

    // Verify W0 Learnings section exists
    expect(notes).toMatch(/##\s+W0\s+Learnings/i);

    // Verify key learnings mentioned
    expect(notes).toContain('foundation tasks completed');
    expect(notes).toContain('.env');
    expect(notes).toContain('CLI tools');
    expect(notes).toContain('feature flags');
  });
});
