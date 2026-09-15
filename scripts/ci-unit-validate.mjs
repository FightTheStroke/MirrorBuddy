import { readdirSync } from 'node:fs';

try {
  const [directory, ...extra] = process.argv.slice(2);
  if (!directory || extra.length) {
    throw new Error('Usage: node scripts/ci-unit-validate.mjs <report-directory>');
  }
  // This standalone CLI operates only inside the caller-selected report directory.
  // chdir rejects missing paths and non-directories before any reports are inspected.
  process.chdir(directory);
  const entries = readdirSync('.', { withFileTypes: true });
  const expected = ['shard-1.json', 'shard-2.json'];
  const names = entries.map((entry) => entry.name).sort();
  if (
    names.length !== expected.length ||
    names.some((name, index) => name !== expected[index]) ||
    entries.some((entry) => !entry.isFile())
  ) {
    throw new Error(`Expected exactly shard-1.json and shard-2.json; found: ${names.join(', ')}`);
  }
  console.log('Both unit shard blobs present; Vitest will validate and merge their contents.');
} catch (error) {
  console.error('Unit blob validation failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
