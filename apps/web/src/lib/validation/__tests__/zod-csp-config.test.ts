import { describe, expect, it, beforeEach } from 'vitest';
import { core } from 'zod';

import { disableZodJitInBrowser } from '../zod-csp-config';

describe('disableZodJitInBrowser', () => {
  beforeEach(() => {
    core.globalConfig.jitless = undefined;
  });

  it('disables the JIT when running in a browser', () => {
    disableZodJitInBrowser();

    expect(core.globalConfig.jitless).toBe(true);
  });

  it('leaves the JIT enabled when there is no window (server)', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating a server environment
    delete globalThis.window;

    try {
      disableZodJitInBrowser();

      expect(core.globalConfig.jitless).toBeUndefined();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
