import { test, expect } from './fixtures';

test('Production smoke never retains traces or video', async ({}, testInfo) => {
  expect(testInfo.project.use.trace).toBe('off');
  expect(testInfo.project.use.video).toBe('off');
});
