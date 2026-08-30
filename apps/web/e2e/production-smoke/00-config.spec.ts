import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures';

test('Production smoke never retains traces or video', async ({}, testInfo) => {
  expect(testInfo.project.use.trace).toBe('off');
  expect(testInfo.project.use.video).toBe('off');
});

test('Production smoke test sources never reference the login password', async () => {
  // Resolve from this file, not cwd: the runner's cwd differs between root and apps/web.
  const directory = __dirname;
  const passwordVariable = ['PROD', 'TEST', 'USER', 'PASSWORD'].join('_');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.ts'));

  for (const file of files) {
    const source = await readFile(join(directory, file), 'utf8');
    expect(source, `${file} must not access credential passwords`).not.toContain(passwordVariable);
  }
});
