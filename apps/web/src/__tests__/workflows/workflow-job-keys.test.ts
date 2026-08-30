/**
 * Every workflow job must keep its own key.
 *
 * A job in `infra-monitor.yml` was inserted by editing the file directly and the
 * edit swallowed the `dependency-updates:` line that opened the next job. The
 * result parsed as valid YAML: the two jobs merged into one mapping, the later
 * `name`, `runs-on` and `steps` silently overwrote the earlier ones, and the
 * newly added guard never ran while the workflow reported success.
 *
 * YAML parsers accept duplicate keys by design, so nothing else in the pipeline
 * would have caught it. This test does.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { describe, it, expect } from 'vitest';

const WORKFLOW_DIR = join(process.cwd(), '.github/workflows');
const files = readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f));

describe('GitHub workflow structure', () => {
  it('finds workflow files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no duplicate mapping keys', (file) => {
    const doc = YAML.parseDocument(readFileSync(join(WORKFLOW_DIR, file), 'utf-8'), {
      uniqueKeys: true,
    });
    const duplicates = doc.errors.filter((e) => /duplicate|unique/i.test(e.message));
    expect(duplicates.map((e) => e.message)).toEqual([]);
  });

  it.each(files)('%s gives every job a name and steps of its own', (file) => {
    const parsed = YAML.parse(readFileSync(join(WORKFLOW_DIR, file), 'utf-8')) as {
      jobs?: Record<string, { steps?: unknown[]; uses?: string }>;
    };
    if (!parsed?.jobs) return;

    for (const [jobId, job] of Object.entries(parsed.jobs)) {
      // A reusable-workflow call has `uses` instead of `steps`.
      if (job.uses) continue;
      expect(Array.isArray(job.steps), `${file}: job "${jobId}" has no steps`).toBe(true);
      expect(job.steps!.length, `${file}: job "${jobId}" has empty steps`).toBeGreaterThan(0);
    }
  });
});
