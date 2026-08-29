// ============================================================================
// Zod / CSP compatibility
// Zod v4 probes `Function("")` to decide whether it can JIT-compile validators.
// Our Content-Security-Policy has no `unsafe-eval`, so that probe is blocked and
// reported as a CSP violation on every page load. Zod already falls back to the
// interpreted path, so the only real effect is console noise — disabling the JIT
// in the browser removes the probe entirely, and leaves server-side JIT intact.
// ============================================================================

import { config } from 'zod';

export function disableZodJitInBrowser(): void {
  if (typeof window === 'undefined') {
    return;
  }

  config({ jitless: true });
}

disableZodJitInBrowser();
